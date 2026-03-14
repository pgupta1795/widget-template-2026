// src/components/data-grid/table-engine/nodes/row-expand-node.ts

import { DAGExecutionError } from "../core/dag-validator";
import type { NodeContext } from "../core/node-context";
import type { INodeExecutor, NodeRegistry } from "../core/node-registry";
import { evaluateExpr } from "../jsonata-evaluator";
import type { DAGNode, JsonPrimitive } from "../types/dag.types";
import { extractExpr, isJsonataExpr } from "../types/dag.types";
import type {
	ApiNodeConfig,
	GridRow,
	RowExpandNodeConfig,
	RowExpandOutput,
} from "../types/table.types";

export class RowExpandNodeExecutor implements INodeExecutor<"rowExpand"> {
	constructor(private readonly nodeRegistry: NodeRegistry) {}

	async execute(
		config: RowExpandNodeConfig,
		context: NodeContext,
		allNodes: DAGNode[],
	): Promise<RowExpandOutput> {
		const expandHandler = async (row: GridRow): Promise<GridRow[]> => {
			// 1. Find the lazy child ApiNode in allNodes
			const childNode = allNodes.find(
				(n) => n.id === config.childApiNodeId && n.type === "api",
			);
			if (!childNode) {
				throw new DAGExecutionError(
					`RowExpandNode: lazy node "${config.childApiNodeId}" not found in allNodes[]. ` +
						`Ensure it is declared in dag.nodes[] (it must NOT be in dag.edges[]).`,
					config.childApiNodeId,
					new Error("Lazy node not found"),
				);
			}

			// 2. Clone context with the current row
			const rowCtx = context.withRow(row);

			// 3. Evaluate childKeyExpr to get the param value
			const keyExpr = isJsonataExpr(config.childKeyExpr)
				? extractExpr(config.childKeyExpr)
				: config.childKeyExpr;
			const keyValue =
				(await evaluateExpr<JsonPrimitive>(keyExpr, rowCtx, {})) ?? null;

			// 4. Add param to context (e.g. parentId → row.id value)
			const childCtx = rowCtx.withParams({
				[config.childQueryParam]: keyValue as JsonPrimitive,
			});

			// 5. Execute child ApiNode directly (NOT recursively via DAGEngine)
			const apiExecutor = this.nodeRegistry.resolve("api");
			const result = await apiExecutor.execute(
				childNode.config as ApiNodeConfig,
				childCtx,
				allNodes,
			);
			return result.rows;
		};

		return { expandHandler };
	}
}
