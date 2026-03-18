// src/components/data-grid/table-engine/nodes/row-enrich-node.ts

import { DAGValidationError } from "../core/dag-validator";
import type { NodeContext } from "../core/node-context";
import type { INodeExecutor } from "../core/node-registry";
import type { DAGNode } from "../types/dag.types";
import type {
	GridRow,
	RowEnrichNodeConfig,
	RowEnrichNodeOutput,
} from "../types/table.types";
import { readSourceRows } from "./shared-row-reader";

export class RowEnrichNodeExecutor implements INodeExecutor<"rowEnrich"> {
	async execute(
		config: RowEnrichNodeConfig,
		context: NodeContext,
		allNodes: DAGNode[],
	): Promise<RowEnrichNodeOutput> {
		// Validate that the lazy child API node exists — mirrors RowExpandNodeExecutor
		const childNode = allNodes.find(
			(n) => n.id === config.childApiNodeId && n.type === "api",
		);
		if (!childNode) {
			throw new DAGValidationError(
				`RowEnrichNode: lazy node "${config.childApiNodeId}" not found in allNodes[]. ` +
					`Ensure it is declared in dag.nodes[] (it must NOT be in dag.edges[]).`,
				config.childApiNodeId,
			);
		}

		const rowKeyField = config.rowKeyField ?? "id";
		const rows: GridRow[] = readSourceRows(context, config.sourceNodeId);

		const descriptors = rows.map((row) => ({
			rowKey: String(row[rowKeyField]),
			rowData: row,
		}));

		return {
			descriptors,
			childApiNodeId: config.childApiNodeId,
			rowKeyField,
			lazy: config.lazy ?? false,
			mergeTransform: config.mergeTransform,
			invalidateQueryKeys: config.invalidateQueryKeys,
		};
	}
}
