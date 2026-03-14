// src/components/data-grid/table-engine/nodes/action-node.ts

import type { NodeContext } from "../core/node-context";
import type { INodeExecutor } from "../core/node-registry";
import type { DAGNode } from "../types/dag.types";
import type { ActionNodeConfig, ActionOutput } from "../types/table.types";

/**
 * ActionNodeExecutor is a pure pass-through on the initial wave.
 * It reads the ActionNodeConfig declarations and stores them in NodeContext
 * as ActionOutput — no API calls are made here.
 *
 * Action firing happens in useDAGTable.onAction(), which:
 * 1. Reads ActionOutput from context to find the ActionDef
 * 2. Looks up the lazy ApiNode in dag.nodes[] by actionDef.apiNodeId
 * 3. Executes it directly with a row-scoped context
 */
export class ActionNodeExecutor implements INodeExecutor<"action"> {
	async execute(
		config: ActionNodeConfig,
		_context: NodeContext,
		_allNodes: DAGNode[],
	): Promise<ActionOutput> {
		return {
			rowActions: config.rowActions ?? [],
			toolbarActions: config.toolbarActions ?? [],
			cellActions: config.cellActions ?? [],
		};
	}
}
