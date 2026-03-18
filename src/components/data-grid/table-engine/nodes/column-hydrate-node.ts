// src/components/data-grid/table-engine/nodes/column-hydrate-node.ts

import { DAGValidationError } from "../core/dag-validator";
import type { NodeContext } from "../core/node-context";
import type { INodeExecutor } from "../core/node-registry";
import type { DAGNode } from "../types/dag.types";
import type {
	ColumnHydrateNodeConfig,
	ColumnHydrateNodeOutput,
	GridRow,
} from "../types/table.types";
import { readSourceRows } from "./shared-row-reader";

export class ColumnHydrateNodeExecutor
	implements INodeExecutor<"columnHydrate">
{
	async execute(
		config: ColumnHydrateNodeConfig,
		context: NodeContext,
		allNodes: DAGNode[],
	): Promise<ColumnHydrateNodeOutput> {
		// Validate all childApiNodeIds exist — one error per missing reference
		for (const col of config.columns) {
			const childNode = allNodes.find(
				(n) => n.id === col.childApiNodeId && n.type === "api",
			);
			if (!childNode) {
				throw new DAGValidationError(
					`ColumnHydrateNode: lazy node "${col.childApiNodeId}" for column "${col.columnId}" ` +
						`not found in allNodes[]. Ensure it is declared in dag.nodes[] (NOT in dag.edges[]).`,
					col.childApiNodeId,
				);
			}
		}

		const rowKeyField = config.rowKeyField ?? "id";
		const rows: GridRow[] = readSourceRows(context, config.sourceNodeId);

		// One descriptor per {row × column} combination
		const descriptors = config.columns.flatMap((col) =>
			rows.map((row) => ({
				rowKey: String(row[rowKeyField]),
				rowData: row,
				columnId: col.columnId,
			})),
		);

		return {
			descriptors,
			columnEntries: config.columns,
			rowKeyField,
		};
	}
}
