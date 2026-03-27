import type { ServiceError } from "@/services";
import type { DAGConfig } from "../types/dag.types";

// ── Error classes ─────────────────────────────────────────────────────────────

/** Thrown at config mount time — invalid graph structure */
export class DAGValidationError extends Error {
	constructor(
		message: string,
		public readonly nodeId?: string,
	) {
		super(message);
		this.name = "DAGValidationError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

/** Thrown at execution time — node executor failed */
export class DAGExecutionError extends Error {
	constructor(
		message: string,
		public readonly nodeId: string,
		public readonly cause: ServiceError | Error,
	) {
		super(message);
		this.name = "DAGExecutionError";
		Object.setPrototypeOf(this, new.target.prototype);
	}
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateDAG(dag: DAGConfig, authIds: Set<string>): void {
	const nodeIds = new Set(dag.nodes.map((n) => n.id));

	// Duplicate node ids
	const seen = new Set<string>();
	for (const n of dag.nodes) {
		if (seen.has(n.id))
			throw new DAGValidationError(`Duplicate node id: "${n.id}"`, n.id);
		seen.add(n.id);
	}

	// Edge references must exist in nodes[]
	for (const edge of dag.edges) {
		if (!nodeIds.has(edge.from)) {
			throw new DAGValidationError(
				`Edge references unknown node: "${edge.from}"`,
				edge.from,
			);
		}
		if (!nodeIds.has(edge.to)) {
			throw new DAGValidationError(
				`Edge references unknown node: "${edge.to}"`,
				edge.to,
			);
		}
	}

	// rootNodeId must exist
	if (!nodeIds.has(dag.rootNodeId)) {
		throw new DAGValidationError(
			`rootNodeId "${dag.rootNodeId}" not found in nodes[]`,
			dag.rootNodeId,
		);
	}

	// Per-node validation
	for (const node of dag.nodes) {
		if (node.type === "api") {
			if (!authIds.has(node.config.authAdapterId)) {
				throw new DAGValidationError(
					`Node "${node.id}" references unknown authAdapterId: "${node.config.authAdapterId}"`,
					node.id,
				);
			}
		}

		if (node.type === "rowExpand") {
			if (!nodeIds.has(node.config.childApiNodeId)) {
				throw new DAGValidationError(
					`RowExpandNode "${node.id}" references unknown childApiNodeId: "${node.config.childApiNodeId}"`,
					node.id,
				);
			}
		}

		if (node.type === "action") {
			const allActions = [
				...(node.config.rowActions ?? []),
				...(node.config.cellActions ?? []),
			];
			for (const action of allActions) {
				if (!nodeIds.has(action.apiNodeId)) {
					throw new DAGValidationError(
						`ActionNode "${node.id}" action "${action.id}" references unknown apiNodeId: "${action.apiNodeId}"`,
						node.id,
					);
				}
			}
		}

		if (node.type === "rowEnrich") {
			if (!nodeIds.has(node.config.sourceNodeId)) {
				throw new DAGValidationError(
					`RowEnrichNode "${node.id}" references unknown sourceNodeId: "${node.config.sourceNodeId}"`,
					node.id,
				);
			}
			if (!nodeIds.has(node.config.childApiNodeId)) {
				throw new DAGValidationError(
					`RowEnrichNode "${node.id}" references unknown childApiNodeId: "${node.config.childApiNodeId}"`,
					node.id,
				);
			}
		}

		if (node.type === "columnHydrate") {
			if (!nodeIds.has(node.config.sourceNodeId)) {
				throw new DAGValidationError(
					`ColumnHydrateNode "${node.id}" references unknown sourceNodeId: "${node.config.sourceNodeId}"`,
					node.id,
				);
			}
			for (const col of node.config.columns) {
				if (!nodeIds.has(col.childApiNodeId)) {
					throw new DAGValidationError(
						`ColumnHydrateNode "${node.id}" column "${col.columnId}" references unknown childApiNodeId: "${col.childApiNodeId}"`,
						node.id,
					);
				}
			}
		}

		if (node.type === "detailPanel") {
			if (!nodeIds.has(node.config.sourceNodeId)) {
				throw new DAGValidationError(
					`DetailPanelNode "${node.id}" references unknown sourceNodeId: "${node.config.sourceNodeId}"`,
					node.id,
				);
			}
			if (
				node.config.saveApiNodeId &&
				!nodeIds.has(node.config.saveApiNodeId)
			) {
				throw new DAGValidationError(
					`DetailPanelNode "${node.id}" references unknown saveApiNodeId: "${node.config.saveApiNodeId}"`,
					node.id,
				);
			}
			for (const sectionId of node.config.sections) {
				if (!nodeIds.has(sectionId)) {
					throw new DAGValidationError(
						`DetailPanelNode "${node.id}" references unknown section: "${sectionId}"`,
						node.id,
					);
				}
			}
		}

		if (node.type === "headerForm") {
			if (!nodeIds.has(node.config.sourceNodeId)) {
				throw new DAGValidationError(
					`HeaderFormNode "${node.id}" references unknown sourceNodeId: "${node.config.sourceNodeId}"`,
					node.id,
				);
			}
		}

		if (node.type === "formSection") {
			for (const fieldId of node.config.fieldIds) {
				if (!nodeIds.has(fieldId)) {
					throw new DAGValidationError(
						`FormSectionNode "${node.id}" references unknown fieldId: "${fieldId}"`,
						node.id,
					);
				}
			}
		}

		if (node.type === "formField") {
			if (
				node.config.optionsApiNodeId &&
				!nodeIds.has(node.config.optionsApiNodeId)
			) {
				throw new DAGValidationError(
					`FormFieldNode "${node.id}" references unknown optionsApiNodeId: "${node.config.optionsApiNodeId}"`,
					node.id,
				);
			}
		}
	}
}
