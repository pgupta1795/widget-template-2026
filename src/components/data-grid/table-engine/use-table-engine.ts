import { useInfiniteData } from "@/components/data-grid/hooks/use-infinite-data"
import type { GridRow } from "@/components/data-grid/types/grid-types"
import { keepPreviousData, useQuery } from "@tanstack/react-query"
import React from "react"
import { fetchSource, type FetchResult } from "./api-executor"
import { buildColumns } from "./column-builder"
import { validateConfig } from "./config-validator"
import { buildWaves, executeWaves } from "./dag-resolver"
import { evaluateRowExpr } from "./jsonata-evaluator"
import type {
  DataSourceConfig,
  SourceMap,
  TableConfig,
  TableEngineResult,
} from "./types"

// Re-export FetchResult for convenience
export type { FetchResult }

// ─── Source Executor ──────────────────────────────────────────────────────────

/**
 * Creates the executeFn for executeWaves — handles building the final URL/body
 * from prior $sources context and calling fetchSource.
 */
function createSourceExecutor(
  sources: DataSourceConfig[],
  signal?: AbortSignal
) {
  const sourceMap = new Map(sources.map((s) => [s.id, s]))

  return async (id: string, resolvedSources: SourceMap): Promise<unknown> => {
    const source = sourceMap.get(id)
    if (!source) throw new Error(`Unknown source id: ${id}`)

    const result = await fetchSource(source, resolvedSources, signal)
    if (result.error) throw result.error
    return result.data
  }
}

// ─── Derived Value Computation ────────────────────────────────────────────────

/**
 * For all columns with valueExpr, evaluate the JSONata expression against each
 * row and write the result directly onto the row object at row[field].
 * Done in parallel across all rows for a given column.
 */
async function computeDerivedValues<TData extends GridRow>(
  rows: TData[],
  columns: TableConfig["columns"],
  subRowsField?: string
): Promise<TData[]> {
  const derivedCols = columns.filter((c) => c.valueExpr)
  // Even if no derived columns at this level, we might have children that need processing
  if (derivedCols.length === 0 && !subRowsField) return rows

  const enrichedRows = await Promise.all(
    rows.map(async (row) => {
      const enriched = { ...row }

      // 1. Compute derived values for current row
      if (derivedCols.length > 0) {
        await Promise.all(
          derivedCols.map(async (col) => {
            try {
              const value = await evaluateRowExpr(col.valueExpr!, {
                row: row as Record<string, unknown>,
              })
              ;(enriched as Record<string, unknown>)[col.field] = value
            } catch {
              ;(enriched as Record<string, unknown>)[col.field] = null
            }
          })
        )
      }

      // 2. Recursively process children if they exist
      if (
        subRowsField &&
        (row as Record<string, unknown>)[subRowsField] &&
        Array.isArray((row as Record<string, unknown>)[subRowsField])
      ) {
        ;(enriched as Record<string, unknown>)[subRowsField] =
          await computeDerivedValues(
            (row as Record<string, unknown>)[subRowsField] as TData[],
            columns,
            subRowsField
          )
      }

      return enriched
    })
  )

  return enrichedRows
}

// ─── Primary Data Resolution ──────────────────────────────────────────────────

/**
 * Resolves all non-rowLevel sources via the DAG executor.
 * Returns the full SourceMap and the primary rows array.
 * The "primary source" is the first non-rowLevel DataSourceConfig.
 */
async function resolvePrimaryData<TData extends GridRow>(
  config: TableConfig,
  signal?: AbortSignal
): Promise<{ sourceMap: SourceMap; rows: TData[] }> {
  const nonRowLevelSources = config.dataSources.filter((s) => !s.rowLevel)
  const waves = buildWaves(nonRowLevelSources)
  const executor = createSourceExecutor(nonRowLevelSources, signal)
  const sourceMap = await executeWaves(waves, executor, signal)

  // Primary source = first non-rowLevel source (by config order)
  const primarySourceId = nonRowLevelSources[0]?.id
  const rawRows = primarySourceId ? sourceMap[primarySourceId] : []
  const rows = Array.isArray(rawRows) ? (rawRows as TData[]) : []

  return { sourceMap, rows }
}

// ─── Row-Level Source Enrichment ──────────────────────────────────────────────

/**
 * For all rowLevel DataSourceConfigs, fetch enrichment data for each row
 * using cacheKey-based deduplication, then merge results into rows.
 * Errors from individual row fetches are collected, not re-thrown.
 */
async function enrichRowsWithRowLevelSources<TData extends GridRow>(
  rows: TData[],
  config: TableConfig,
  resolvedSources: SourceMap,
  signal?: AbortSignal
): Promise<{
  rows: TData[]
  rowSourceErrors: TableEngineResult<TData>["rowSourceErrors"]
}> {
  const rowLevelSources = config.dataSources.filter((s) => s.rowLevel)
  const subRowsField = config.options?.subRowsField
  const rowSourceErrors: TableEngineResult<TData>["rowSourceErrors"] = []

  // If no row-level sources AND no children to recurse into, just return
  if (rowLevelSources.length === 0 && !subRowsField) {
    return { rows, rowSourceErrors: [] }
  }

  const { fetchRowLevelSource } = await import("./api-executor")
  let processedRows = [...rows]

  // A. Process each row-level source for the current level
  for (const source of rowLevelSources) {
    const dedupeMap = new Map<
      string,
      Promise<{ data: unknown; error: Error | null }>
    >()
    const joinCols = config.columns.filter(
      (c) => c.dataSource === source.id && c.joinOn
    )
    if (joinCols.length === 0) continue

    const rowResults = await Promise.all(
      processedRows.map((row) =>
        fetchRowLevelSource(
          source,
          row as Record<string, unknown>,
          resolvedSources,
          dedupeMap,
          signal
        )
      )
    )

    processedRows = processedRows.map((row, idx) => {
      const { data, error } = rowResults[idx]
      if (error) {
        const cacheKey = source.cacheKey
          ? String((row as Record<string, unknown>)[source.cacheKey] ?? "")
          : String(idx)
        rowSourceErrors.push({ sourceId: source.id, cacheKey, error })
        return row
      }

      const enriched = { ...row }
      if (data && Array.isArray(data)) {
        for (const col of joinCols) {
          if (!col.joinOn) continue
          const match = (data as Record<string, unknown>[]).find(
            (r) =>
              r[col.joinOn!.sourceKey] ===
              (row as Record<string, unknown>)[col.joinOn!.rowField]
          )
          ;(enriched as Record<string, unknown>)[col.field] = match
            ? match[col.joinOn.sourceField]
            : null
        }
      }
      return enriched
    })
  }

  // B. Recursively enrich children if they exist
  if (subRowsField) {
    processedRows = await Promise.all(
      processedRows.map(async (row) => {
        const children = (row as Record<string, unknown>)[subRowsField]
        if (Array.isArray(children) && children.length > 0) {
          const { rows: enrichedChildren, rowSourceErrors: childErrors } =
            await enrichRowsWithRowLevelSources(
              children as TData[],
              config,
              resolvedSources,
              signal
            )
          rowSourceErrors.push(...childErrors)
          return { ...row, [subRowsField]: enrichedChildren }
        }
        return row
      })
    )
  }

  return { rows: processedRows, rowSourceErrors }
}

// ─── Full Resolution Pipeline ─────────────────────────────────────────────────

interface ResolvedData<TData extends GridRow> {
  rows: TData[]
  sourceMap: SourceMap
  rowSourceErrors: TableEngineResult<TData>["rowSourceErrors"]
}

async function resolveAll<TData extends GridRow>(
  config: TableConfig,
  signal?: AbortSignal
): Promise<ResolvedData<TData>> {
  const { sourceMap, rows: primaryRows } = await resolvePrimaryData<TData>(
    config,
    signal
  )

  const withDerived = await computeDerivedValues(
    primaryRows,
    config.columns,
    config.options?.subRowsField
  )
  const { rows, rowSourceErrors } = await enrichRowsWithRowLevelSources(
    withDerived,
    config,
    sourceMap,
    signal
  )

  return { rows, sourceMap, rowSourceErrors }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Orchestrates config validation, DAG-based API fetching, derived value computation,
 * row-level enrichment, and column building for a given TableConfig.
 *
 * Returns everything DataGrid needs — pass the result to <ConfiguredTable /> or
 * spread it manually onto <DataGrid />.
 */
export function useTableEngine<TData extends GridRow>(
  config: TableConfig
): TableEngineResult<TData> {
  // Validate config once at mount — throws ConfigError before any render/query
  const validationError = React.useMemo(() => {
    try {
      validateConfig(config)
      return null
    } catch (err) {
      return err instanceof Error ? err : new Error(String(err))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.id]) // Only re-validate when id changes (config identity)

  const isFlat = config.mode === "flat"
  const isPaginated = config.mode === "paginated"
  const isInfinite = config.mode === "infinite"
  const isTree = config.mode === "tree"

  // ── Flat + Paginated + Tree: useQuery ───────────────────────────────────
  const flatQuery = useQuery({
    queryKey: [config.id, "engine", config.mode],
    queryFn: ({ signal }): Promise<ResolvedData<TData>> =>
      resolveAll<TData>(config, signal),
    enabled: !validationError && (isFlat || isPaginated || isTree),
    placeholderData: keepPreviousData,
  })

  // ── Infinite: useInfiniteData ───────────────────────────────────────────
  const infiniteQuery = useInfiniteData<TData>({
    queryKey: [config.id, "engine"],
    queryFn: async ({ pageParam, sort, filters }) => {
      // Inject page context into the primary source's params via a special $pageParam binding
      const paginatedConfig: TableConfig = {
        ...config,
        dataSources: config.dataSources.map((s, idx) =>
          idx === 0
            ? {
                ...s,
                params: {
                  ...s.params,
                  page: String(pageParam),
                  _sort: JSON.stringify(sort),
                  _filters: JSON.stringify(filters),
                },
              }
            : s
        ),
      }

      const { rows } = await resolveAll<TData>(paginatedConfig)
      return {
        rows,
        nextPage:
          rows.length >= (config.options?.pageSize ?? 50)
            ? pageParam + 1
            : null,
        total: undefined,
      }
    },
    sortState: [],
    filterState: [],
    enabled: !validationError && isInfinite,
  })

  // ── Row-source errors — derived from query data (populated by resolveAll) ──
  const rowSourceErrors: TableEngineResult<TData>["rowSourceErrors"] =
    flatQuery.data?.rowSourceErrors ?? []

  // ── Column build (memoized) ─────────────────────────────────────────────
  const sourceMap: SourceMap = React.useMemo(() => {
    if (isInfinite) return {}
    return flatQuery.data?.sourceMap ?? {}
  }, [flatQuery.data, isInfinite])

  const { columns, initialColumnVisibility } = React.useMemo(
    () => buildColumns<TData>(config.columns, config.features, sourceMap),
    [config.columns, config.features, sourceMap]
  )

  // ── Derive final rows ────────────────────────────────────────────────────
  const data: TData[] = React.useMemo(() => {
    if (isInfinite) return infiniteQuery.rows as TData[]
    return flatQuery.data?.rows ?? []
  }, [isInfinite, infiniteQuery.rows, flatQuery.data])

  // ── Loading / error state ────────────────────────────────────────────────
  const isLoading = isInfinite ? infiniteQuery.isLoading : flatQuery.isLoading
  const isError = isInfinite
    ? infiniteQuery.isError
    : validationError !== null || flatQuery.isError
  const error: Error | null = isInfinite
    ? (infiniteQuery.error as Error | null)
    : (validationError ?? (flatQuery.error as Error | null))

  return {
    data,
    columns,
    initialColumnVisibility,
    isLoading,
    isError,
    error,
    refetch: isInfinite ? infiniteQuery.refetch : flatQuery.refetch,
    rowSourceErrors,
    // Infinite mode props
    ...(isInfinite
      ? {
          fetchNextPage: infiniteQuery.fetchNextPage,
          hasNextPage: infiniteQuery.hasNextPage,
          isFetchingNextPage: infiniteQuery.isFetchingNextPage,
          total: infiniteQuery.total,
        }
      : {}),
  }
}
