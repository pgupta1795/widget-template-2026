// src/components/data-grid/table-engine/nodes/shared-row-reader.ts

import type { NodeContext } from "../core/node-context";
import type { GridRow } from "../types/table.types";

/**
 * Reads GridRow[] from context for a given source node.
 *
 * Supports source node types:
 *   'api'       → ApiNodeOutput.rows
 *   'transform' → GridRow[] (direct)
 *   'merge'     → GridRow[] (direct)
 *
 * Returns [] when context.has(sourceNodeId) is false — matches the graceful-absence
 * pattern in TransformNodeExecutor and MergeNodeExecutor (optional sources).
 *
 * Does NOT need allNodes — reads only from context.
 */
export function readSourceRows(
	context: NodeContext,
	sourceNodeId: string,
): GridRow[] {
	if (!context.has(sourceNodeId)) return [];
	const entry = context.getAll().get(sourceNodeId);
	if (entry?.type === "api") return context.get(sourceNodeId, "api").rows;
	if (entry?.type === "transform")
		return context.get(sourceNodeId, "transform");
	if (entry?.type === "merge") return context.get(sourceNodeId, "merge");
	return [];
}
