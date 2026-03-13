import jsonata from "jsonata"
import type { DepthRule, SourceMap } from "./types"

// ─── Context types ────────────────────────────────────────────────────────────

export interface SourceEvalContext {
  /** All resolved source data, accessible as $sources.<id> in expressions. */
  sources: SourceMap
}

export interface RowEvalContext {
  /** The current row object, accessible as $row in expressions. */
  row: Record<string, unknown>
}

// ─── Source mode ─────────────────────────────────────────────────────────────

/**
 * Evaluate a JSONata expression in "source" mode.
 *
 * The input document is set to the first source's data (enabling `$.field`
 * path expressions on the primary source). The full source map is also
 * available as the `$sources` binding for cross-source references.
 *
 * Available bindings: $sources (the resolved source map).
 * Used for: transform, url, params, body expressions.
 *
 * @returns The evaluated result, or undefined if expression is empty.
 * @throws With expression string + context appended on evaluation error.
 */
export async function evaluateSourceExpr(
  expression: string,
  context: SourceEvalContext,
  inputDoc?: unknown
): Promise<unknown> {
  if (!expression.trim()) return undefined

  try {
    const expr = jsonata(expression)
    // Use provided inputDoc, or fall back to the first source's data
    const effectiveInput =
      inputDoc !== undefined
        ? inputDoc
        : (Object.values(context.sources)[0] ?? {})

    // JSONata bindings use keys WITHOUT the leading "$": key "sources" → $sources in expressions.
    const result = await expr.evaluate(effectiveInput, {
      sources: context.sources,
    })
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `JSONata source expression failed: ${msg}\nExpression: ${expression}`
    )
  }
}

// ─── Row mode ─────────────────────────────────────────────────────────────────

/**
 * Evaluate a JSONata expression in "row" mode.
 * Available bindings: $row (the current row object).
 * Used for: valueExpr derived column computation.
 *
 * @returns The evaluated result, or undefined if expression is empty.
 */
export async function evaluateRowExpr(
  expression: string,
  context: RowEvalContext
): Promise<unknown> {
  if (!expression.trim()) return undefined

  try {
    const expr = jsonata(expression)
    const result = await expr.evaluate({}, { row: context.row })
    return result
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(
      `JSONata row expression failed: ${msg}\nExpression: ${expression}\nRow: ${JSON.stringify(context.row)}`
    )
  }
}

// ─── Depth rule (synchronous — no JSONata needed) ─────────────────────────────

/**
 * Evaluate a DepthRule synchronously against a tree node's depth.
 * This is pure boolean logic — no JSONata involved.
 * Used by column-builder to produce the editableFn stored on TableColumnMeta.
 */
export function evaluateDepthRule(rule: DepthRule, depth: number): boolean {
  if ("depths" in rule) return rule.depths.includes(depth)
  if ("minDepth" in rule) return depth >= rule.minDepth
  if ("maxDepth" in rule) return depth <= rule.maxDepth
  return false
}
