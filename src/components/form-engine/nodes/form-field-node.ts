// src/components/form-engine/nodes/form-field-node.ts
import type { INodeExecutor } from "@/components/data-grid/table-engine/core/node-registry";
import type { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type { DAGNode } from "@/components/data-grid/table-engine/types/dag.types";
import type {
	FormFieldNodeConfig,
	FormFieldNodeOutput,
} from "../types/form.types";

export class FormFieldNodeExecutor implements INodeExecutor<"formField"> {
	execute(
		config: FormFieldNodeConfig,
		context: NodeContext,
		_allNodes: DAGNode[],
	): Promise<FormFieldNodeOutput> {
		// FormField nodes are pure config carriers — the executor just packages
		// the config alongside the node ID for use by FormSectionNodeExecutor.
		const nodeId = context.getNodeId();
		return Promise.resolve({ fieldId: nodeId, config });
	}
}
