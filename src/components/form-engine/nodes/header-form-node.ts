// src/components/form-engine/nodes/header-form-node.ts
import type { INodeExecutor } from "@/components/data-grid/table-engine/core/node-registry";
import type { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type { DAGNode } from "@/components/data-grid/table-engine/types/dag.types";
import type {
	HeaderFormNodeConfig,
	HeaderFormNodeOutput,
} from "../types/form.types";

export class HeaderFormNodeExecutor implements INodeExecutor<"headerForm"> {
	execute(
		config: HeaderFormNodeConfig,
		_context: NodeContext,
		_allNodes: DAGNode[],
	): Promise<HeaderFormNodeOutput> {
		// HeaderForm is a config carrier — rendering is done by ConfiguredForm.
		// The executor validates that required fields are declared.
		if (!config.titleField) {
			throw new Error("[FormEngine] headerForm node requires titleField");
		}
		return Promise.resolve({ config });
	}
}
