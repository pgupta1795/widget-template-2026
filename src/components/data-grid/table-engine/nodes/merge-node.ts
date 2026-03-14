// src/components/data-grid/table-engine/nodes/merge-node.ts

import type { NodeContext } from "../core/node-context";
import type { INodeExecutor } from "../core/node-registry";
import type { DAGNode } from "../types/dag.types";
import type { GridRow, MergeNodeConfig } from "../types/table.types";

/** Extract rows from a node in context regardless of whether it's api/transform/merge. */
function extractRows(context: NodeContext, id: string): GridRow[] {
	if (!context.has(id)) return [];
	const entry = context.getAll().get(id);
	if (entry?.type === "api") return context.get(id, "api").rows;
	if (entry?.type === "transform") return context.get(id, "transform");
	if (entry?.type === "merge") return context.get(id, "merge");
	return [];
}

export class MergeNodeExecutor implements INodeExecutor<"merge"> {
	async execute(
		config: MergeNodeConfig,
		context: NodeContext,
		_allNodes: DAGNode[],
	): Promise<GridRow[]> {
		const sources = config.sourceNodeIds.map((id) => extractRows(context, id));

		switch (config.strategy) {
			case "concat": {
				return sources.flat();
			}

			case "join": {
				if (!config.joinKey) {
					throw new Error(`MergeNode: "join" strategy requires a joinKey`);
				}
				const [primary, ...rest] = sources;
				return primary.map((row) => {
					const merged: GridRow = { ...row };
					for (const source of rest) {
						const match = source.find(
							(r) => r[config.joinKey!] === row[config.joinKey!],
						);
						if (match) Object.assign(merged, match);
					}
					return merged;
				});
			}

			case "merge": {
				const maxLen = Math.max(0, ...sources.map((s) => s.length));
				return Array.from({ length: maxLen }, (_, i) => {
					const merged: GridRow = { id: sources[0][i]?.id ?? String(i) };
					for (const source of sources) {
						if (source[i]) Object.assign(merged, source[i]);
					}
					return merged;
				});
			}

			default: {
				return sources.flat();
			}
		}
	}
}
