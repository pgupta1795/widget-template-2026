import type { NodeContext } from "../core/node-context";
import type { INodeExecutor } from "../core/node-registry";
import { evaluateExpr } from "../jsonata-evaluator";
import type { DAGNode } from "../types/dag.types";
import type { GridRow, TransformNodeConfig } from "../types/table.types";

export class TransformNodeExecutor implements INodeExecutor<"transform"> {
	async execute(
		config: TransformNodeConfig,
		context: NodeContext,
		_allNodes: DAGNode[],
	): Promise<GridRow[]> {
		// Return empty rows when source is not yet available (graceful for optional sources)
		if (!context.has(config.sourceNodeId)) return [];

		const entry = context.getAll().get(config.sourceNodeId);

		let sourceRows: GridRow[];
		if (entry?.type === "api") {
			sourceRows = context.get(config.sourceNodeId, "api").rows;
		} else if (entry?.type === "merge") {
			sourceRows = context.get(config.sourceNodeId, "merge");
		} else if (entry?.type === "transform") {
			sourceRows = context.get(config.sourceNodeId, "transform");
		} else {
			sourceRows = [];
		}

		const result = await evaluateExpr<GridRow | GridRow[]>(
			config.expression,
			context,
			sourceRows,
		);

		if (result === undefined) return [];
		return Array.isArray(result) ? result : [result];
	}
}
