/**
 * SOLE CAST BOUNDARY: jsonata.evaluate() returns Promise<unknown>.
 * All 'as T' casts in this file are intentional and documented.
 * No other file in the engine is permitted to use 'as' casts on API response data.
 */
import jsonata from "jsonata";
import type { NodeContext } from "./core/node-context";
import type { DepthRule } from "./types/table.types";

/**
 * Evaluate a JSONata expression.
 *
 * Bindings available in expressions:
 *   $row    — from context.getRow() (empty object if no row)
 *   $params — from context.getParams()
 *   + any keys from extraBindings (caller-supplied, spread last so they win)
 *
 * @param expression    - JSONata string. Empty/whitespace returns undefined.
 * @param context       - NodeContext carrying $row / $params bindings.
 * @param inputDoc      - Primary input document (e.g. raw API response data).
 *                        Accessible as $, $.field, etc. in expressions.
 * @param extraBindings - Optional additional bindings merged into the JSONata
 *                        binding object. Keys here override the defaults
 *                        (row, params) when there is a name collision.
 * @returns Result cast to T (documented cast boundary — caller asserts type).
 */
export async function evaluateExpr<T>(
	expression: string,
	context: NodeContext,
	inputDoc: unknown = {},
	extraBindings?: Record<string, unknown>,
): Promise<T | undefined> {
	if (!expression.trim()) return undefined;

	try {
		const expr = jsonata(expression);
		// Cast boundary: expr.evaluate returns Promise<unknown>
		const result = await expr.evaluate(inputDoc, {
			row: context.getRow() ?? {},
			params: context.getParams(),
			...extraBindings,
		});
		return result as T;
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(
			`JSONata expression failed: ${msg}\nExpression: ${expression}`,
		);
	}
}

/**
 * Synchronous depth-rule evaluation — no JSONata required.
 * Used by ColumnNodeExecutor when editable is a DepthRule.
 */
export function evaluateDepthRule(rule: DepthRule, depth: number): boolean {
	if ("depths" in rule) return rule.depths.includes(depth);
	if ("minDepth" in rule) return depth >= rule.minDepth;
	if ("maxDepth" in rule) return depth <= rule.maxDepth;
	return false;
}
