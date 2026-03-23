// src/components/data-grid/table-engine/nodes/api-node.ts

import type { AuthAdapterRegistry } from "../core/auth-registry";
import { DAGExecutionError } from "../core/dag-validator";
import type { NodeContext } from "../core/node-context";
import type { INodeExecutor } from "../core/node-registry";
import { evaluateExpr } from "../jsonata-evaluator";
import type { DAGNode, JsonValue } from "../types/dag.types";
import { extractExpr, isJsonataExpr } from "../types/dag.types";
import type {
	ApiNodeConfig,
	ApiNodeOutput,
	GridRow,
} from "../types/table.types";

export class ApiNodeExecutor implements INodeExecutor<"api"> {
	constructor(private readonly auth: AuthAdapterRegistry) {}

	async execute(
		config: ApiNodeConfig,
		context: NodeContext,
		_allNodes: DAGNode[],
	): Promise<ApiNodeOutput> {
		try {
			// 1. Resolve URL (plain string or JsonataExpr)
			let url: string;
			if (isJsonataExpr(config.url)) {
				url =
					(await evaluateExpr<string>(extractExpr(config.url), context, {})) ??
					"";
			} else {
				url = config.url;
			}

			// 2. Resolve queryParams (each value may be JsonataExpr)
			const queryParams: Record<string, string> = {};
			if (config.queryParams) {
				for (const [key, val] of Object.entries(config.queryParams)) {
					if (isJsonataExpr(val)) {
						const resolved = await evaluateExpr<JsonValue>(
							extractExpr(val),
							context,
							{},
						);
						queryParams[key] = resolved != null ? String(resolved) : "";
					} else {
						queryParams[key] = val;
					}
				}
			}

			// 3. Resolve body (static JsonValue or JsonataExpr)
			let body: JsonValue | undefined;
			if (config.body != null) {
				if (typeof config.body === "string" && isJsonataExpr(config.body)) {
					body =
						(await evaluateExpr<JsonValue>(
							extractExpr(config.body),
							context,
							{},
						)) ?? null;
				} else {
					body = config.body as JsonValue;
				}
			}

			// 4. Dispatch via auth adapter
			const adapter = this.auth.resolve(config.authAdapterId);
			const response = await adapter.request<JsonValue>({
				url,
				method: config.method,
				headers: config.headers,
				queryParams:
					Object.keys(queryParams).length > 0 ? queryParams : undefined,
				body,
				responseType: "json",
			});

			// 5. Apply responseTransform JSONata if present (cast boundary in evaluateExpr)
			let rows: GridRow[];
			if (config.responseTransform) {
				const transformed = await evaluateExpr<GridRow | GridRow[]>(
					config.responseTransform,
					context,
					response.data,
				);
				if (transformed === undefined) {
					rows = [];
				} else {
					rows = Array.isArray(transformed) ? transformed : [transformed];
				}
			} else {
				rows = Array.isArray(response.data) ? (response.data as GridRow[]) : [];
			}

			// 6. Compute nextPage for offset pagination
			let nextPage: string | null | undefined;
			if (config.paginationConfig?.type === "offset") {
				const { pageParam, pageSizeParam } = config.paginationConfig;
				const currentSkip = parseInt(queryParams[pageParam] ?? "0", 10);
				const pageSize = parseInt(queryParams[pageSizeParam] ?? "50", 10);
				nextPage =
					rows.length >= pageSize ? String(currentSkip + pageSize) : null;
			}

			return { rows, nextPage };
		} catch (err) {
			// Re-throw DAGExecutionError as-is; wrap everything else
			if (err instanceof DAGExecutionError) throw err;
			throw new DAGExecutionError(
				`ApiNode "${config.url}" failed: ${err instanceof Error ? err.message : String(err)}`,
				String(config.url),
				err instanceof Error ? err : new Error(String(err)),
			);
		}
	}
}
