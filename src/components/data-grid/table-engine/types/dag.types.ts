// src/components/data-grid/table-engine/types/dag.types.ts
import type {
	ActionNodeConfig,
	ApiNodeConfig,
	ColumnHydrateNodeConfig,
	ColumnNodeConfig,
	MergeNodeConfig,
	NodeOutputMap,
	RowEnrichNodeConfig,
	RowExpandNodeConfig,
	TransformNodeConfig,
} from "./table.types";
import type {
	DetailPanelNodeConfig,
	FormFieldNodeConfig,
	FormSectionNodeConfig,
	HeaderFormNodeConfig,
} from "../../form-engine/types/form.types";

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue =
	| JsonPrimitive
	| { [key: string]: JsonValue }
	| JsonValue[];
export type JsonataExpr = `$:${string}`;

export function isJsonataExpr(value: string): value is JsonataExpr {
	return value.startsWith("$:");
}

export function extractExpr(value: JsonataExpr): string {
	return value.slice(2);
}

export type NodeType =
	| "api"
	| "transform"
	| "column"
	| "rowExpand"
	| "merge"
	| "action"
	| "rowEnrich"
	| "columnHydrate"
	| "headerForm"
	| "detailPanel"
	| "formSection"
	| "formField";

export interface NodeConfigMap {
	api: ApiNodeConfig;
	transform: TransformNodeConfig;
	column: ColumnNodeConfig;
	rowExpand: RowExpandNodeConfig;
	merge: MergeNodeConfig;
	action: ActionNodeConfig;
	rowEnrich: RowEnrichNodeConfig;
	columnHydrate: ColumnHydrateNodeConfig;
	headerForm: HeaderFormNodeConfig;
	detailPanel: DetailPanelNodeConfig;
	formSection: FormSectionNodeConfig;
	formField: FormFieldNodeConfig;
}

export type { NodeOutputMap };

export type DAGNode =
	| { id: string; type: "api"; config: ApiNodeConfig }
	| { id: string; type: "transform"; config: TransformNodeConfig }
	| { id: string; type: "column"; config: ColumnNodeConfig }
	| { id: string; type: "rowExpand"; config: RowExpandNodeConfig }
	| { id: string; type: "merge"; config: MergeNodeConfig }
	| { id: string; type: "action"; config: ActionNodeConfig }
	| { id: string; type: "rowEnrich"; config: RowEnrichNodeConfig }
	| { id: string; type: "columnHydrate"; config: ColumnHydrateNodeConfig }
	| { id: string; type: "headerForm"; config: HeaderFormNodeConfig }
	| { id: string; type: "detailPanel"; config: DetailPanelNodeConfig }
	| { id: string; type: "formSection"; config: FormSectionNodeConfig }
	| { id: string; type: "formField"; config: FormFieldNodeConfig };

export interface DAGEdge {
	from: string;
	to: string;
}

export interface DAGConfig {
	/** ALL nodes including lazy ones not referenced in edges */
	nodes: DAGNode[];
	/** Defines initial execution order only — lazy nodes are NOT listed here */
	edges: DAGEdge[];
	rootNodeId: string;
}
