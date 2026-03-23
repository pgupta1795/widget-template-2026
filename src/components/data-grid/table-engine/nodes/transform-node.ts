import type { NodeContext } from "../core/node-context";
import type { INodeExecutor } from "../core/node-registry";
import { evaluateExpr } from "../jsonata-evaluator";
import type { DAGNode } from "../types/dag.types";
import type { GridRow, TransformNodeConfig } from "../types/table.types";
import { readSourceRows } from "./shared-row-reader";

export class TransformNodeExecutor implements INodeExecutor<"transform"> {
	async execute(
		config: TransformNodeConfig,
		context: NodeContext,
		_allNodes: DAGNode[],
	): Promise<GridRow[]> {
		const sourceRows = readSourceRows(context, config.sourceNodeId);

		const result = await evaluateExpr<GridRow | GridRow[]>(
			config.expression,
			context,
			sourceRows,
		);

		if (result === undefined) return [];
		return Array.isArray(result) ? result : [result];
	}
}
