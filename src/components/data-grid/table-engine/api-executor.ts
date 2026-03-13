import { evaluateRowExpr, evaluateSourceExpr } from "./jsonata-evaluator"
import type { DataSourceConfig, SourceMap } from "./types"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FetchResult {
  data: unknown
  error: Error | null
}

// ─── URL Builder ─────────────────────────────────────────────────────────────

/**
 * Build the final request URL from a source's url field.
 * If the url contains JSONata (detected by presence of $ or operator chars),
 * it is evaluated with $sources context. Plain URLs are returned as-is.
 * Query params (already plain strings) are appended after URL construction.
 */
export async function buildRequestUrl(
  urlExpr: string,
  sources: SourceMap,
  params?: Record<string, string>
): Promise<string> {
  let url: string

  // Heuristic: if url contains JSONata chars, evaluate it; otherwise use as-is.
  // JSONata expressions typically contain $, &, (, ), or spaces.
  const looksLikeExpression = /[$&()"']/.test(urlExpr)

  if (looksLikeExpression) {
    const evaluated = await evaluateSourceExpr(urlExpr, { sources })
    url = String(evaluated ?? urlExpr)
  } else {
    url = urlExpr
  }

  if (params && Object.keys(params).length > 0) {
    const qs = new URLSearchParams(params).toString()
    url = url.includes("?") ? `${url}&${qs}` : `${url}?${qs}`
  }

  return url
}

// ─── Single Source Fetch ──────────────────────────────────────────────────────

/**
 * Execute one DataSourceConfig fetch with retry on network error and optional
 * transform applied to the raw response.
 *
 * - Network errors (TypeError from fetch) trigger 1 retry if retryOnNetworkError !== false.
 * - HTTP errors (non-ok status) are NOT retried — returned as { data: null, error }.
 * - Transform JSONata is applied to the raw parsed response if configured.
 * - Never throws — errors are returned as values.
 */
export async function fetchSource(
  source: DataSourceConfig,
  resolvedSources: SourceMap,
  signal?: AbortSignal
): Promise<FetchResult> {
  const url = await buildRequestUrl(
    source.url,
    resolvedSources,
    source.params
  )

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...source.headers,
  }

  const init: RequestInit = {
    method: source.method ?? "GET",
    headers,
    signal,
    ...(source.body ? { body: JSON.stringify(source.body) } : {}),
  }

  const shouldRetry = source.retryOnNetworkError !== false
  const maxAttempts = shouldRetry ? 2 : 1

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(url, init)

      if (!response.ok) {
        return {
          data: null,
          error: new Error(
            `HTTP ${response.status} ${response.statusText} — ${source.id}: ${url}`
          ),
        }
      }

      const raw = await response.json()

      // Apply JSONata transform if configured
      const data = source.transform
        ? await evaluateSourceExpr(
            source.transform,
            {
              sources: { ...resolvedSources, [source.id]: raw },
            },
            raw
          )
        : raw

      return { data, error: null }
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts - 1
      const isAbort = err instanceof DOMException && err.name === "AbortError"

      if (isAbort || isLastAttempt) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
        }
      }
      // Continue to next attempt
    }
  }

  // Unreachable but satisfies TypeScript
  return { data: null, error: new Error(`fetchSource: unexpected exit for ${source.id}`) }
}

// ─── Row-Level Source Fetch ───────────────────────────────────────────────────

/**
 * Execute a row-level DataSourceConfig for one row with cacheKey-based deduplication.
 *
 * All rows with the same cacheKey value share one in-flight Promise stored in dedupeMap.
 * The dedupeMap is owned by the caller (useTableEngine) and cleared on refetch.
 *
 * @returns FetchResult — never throws. On error: { data: null, error }.
 */
export async function fetchRowLevelSource(
  source: DataSourceConfig,
  row: Record<string, unknown>,
  resolvedSources: SourceMap,
  dedupeMap: Map<string, Promise<FetchResult>>,
  signal?: AbortSignal
): Promise<FetchResult> {
  // Compute the cache key for this row
  let cacheKey: string

  if (source.cacheKey) {
    try {
      const keyValue = await evaluateRowExpr(source.cacheKey, { row })
      cacheKey = `${source.id}::${String(keyValue ?? "")}`
    } catch {
      // If cacheKey evaluation fails, use a unique key (no dedup for this row)
      cacheKey = `${source.id}::${Math.random()}`
    }
  } else {
    // No cacheKey — always fetch independently (no dedup)
    return fetchSource(source, resolvedSources, signal)
  }

  // Return existing in-flight promise if one exists for this cacheKey
  if (dedupeMap.has(cacheKey)) {
    return dedupeMap.get(cacheKey)!
  }

  // Start new fetch and register in dedup map
  const promise = fetchSource(source, resolvedSources, signal)
  dedupeMap.set(cacheKey, promise)
  return promise
}
