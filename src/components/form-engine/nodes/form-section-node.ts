// src/components/form-engine/nodes/form-section-node.ts
import type { INodeExecutor } from "@/components/data-grid/table-engine/core/node-registry";
import type { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type { DAGNode } from "@/components/data-grid/table-engine/types/dag.types";
import type {
	FormFieldNodeConfig,
	FormFieldNodeOutput,
	FormSectionNodeConfig,
	FormSectionNodeOutput,
} from "../types/form.types";
import { FormFieldNodeExecutor } from "./form-field-node";

const fieldExecutor = new FormFieldNodeExecutor();

export class FormSectionNodeExecutor implements INodeExecutor<"formSection"> {
	async execute(
		config: FormSectionNodeConfig,
		context: NodeContext,
		allNodes: DAGNode[],
	): Promise<FormSectionNodeOutput> {
		const sectionId = context.getNodeId();

		// Resolve each formField node by ID from allNodes
		const fields: FormFieldNodeOutput[] = [];
		for (const fieldId of config.fieldIds) {
			const node = allNodes.find(
				(n) => n.id === fieldId && n.type === "formField",
			);
			if (!node) {
				console.warn(
					`[FormEngine] formSection "${sectionId}": field node "${fieldId}" not found`,
				);
				continue;
			}
			const fieldConfig = node.config as FormFieldNodeConfig;
			// Create a child context for the field node
			const fieldContext = context.forNode(fieldId);
			const output = await fieldExecutor.execute(
				fieldConfig,
				fieldContext,
				allNodes,
			);
			fields.push(output);
		}

		return { sectionId, config, fields };
	}
}
