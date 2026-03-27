// src/components/form-engine/nodes/detail-panel-node.ts
import type { INodeExecutor } from "@/components/data-grid/table-engine/core/node-registry";
import type { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type { DAGNode } from "@/components/data-grid/table-engine/types/dag.types";
import type {
	DetailPanelNodeConfig,
	DetailPanelNodeOutput,
	FormSectionNodeConfig,
	FormSectionNodeOutput,
} from "../types/form.types";
import { FormSectionNodeExecutor } from "./form-section-node";

const sectionExecutor = new FormSectionNodeExecutor();

export class DetailPanelNodeExecutor implements INodeExecutor<"detailPanel"> {
	async execute(
		config: DetailPanelNodeConfig,
		context: NodeContext,
		allNodes: DAGNode[],
	): Promise<DetailPanelNodeOutput> {
		// Resolve each formSection node by ID from allNodes
		const sections: FormSectionNodeOutput[] = [];
		for (const sectionId of config.sections) {
			const node = allNodes.find(
				(n) => n.id === sectionId && n.type === "formSection",
			);
			if (!node) {
				console.warn(
					`[FormEngine] detailPanel: section node "${sectionId}" not found`,
				);
				continue;
			}
			const sectionConfig = node.config as FormSectionNodeConfig;
			const sectionContext = context.forNode(sectionId);
			const output = await sectionExecutor.execute(
				sectionConfig,
				sectionContext,
				allNodes,
			);
			sections.push(output);
		}
		return { config, sections };
	}
}
