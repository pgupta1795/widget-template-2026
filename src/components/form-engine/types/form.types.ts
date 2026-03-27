// src/components/form-engine/types/form.types.ts
import type {
	DAGConfig,
	JsonPrimitive,
} from "@/components/data-grid/table-engine/types/dag.types";

// ── Field Types ───────────────────────────────────────────────────────────────

export type FormFieldType =
	| "text"
	| "date"
	| "badge"
	| "link"
	| "dropdown"
	| "number"
	| "boolean"
	| "image"
	| "richtext"
	| "keyvalue";

export type FormSectionLayout = "horizontal" | "vertical" | "grid";

// ── FormField Node ────────────────────────────────────────────────────────────

export interface FormFieldNodeConfig {
	fieldType: FormFieldType;
	label: string;
	/** Field name from the API response to read the value from */
	sourceField: string;
	editable?: boolean;
	/** ID of a DAG api node that returns options for dropdown/badge edit */
	optionsApiNodeId?: string;
	/** Color map for badge field type: { [value]: colorToken } */
	badgeColorMap?: Record<string, string>;
	/** For link fields: the URL template (supports $: JSONata) */
	linkUrl?: string;
}

export interface FormFieldNodeOutput {
	fieldId: string;
	config: FormFieldNodeConfig;
}

// ── FormSection Node ──────────────────────────────────────────────────────────

export interface FormSectionNodeConfig {
	label: string;
	layout: FormSectionLayout;
	/** Number of columns for grid layout; ignored for horizontal/vertical */
	columns?: number;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
	/** IDs of formField nodes belonging to this section */
	fieldIds: string[];
}

export interface FormSectionNodeOutput {
	sectionId: string;
	config: FormSectionNodeConfig;
	fields: FormFieldNodeOutput[];
}

// ── HeaderForm Node ───────────────────────────────────────────────────────────

export interface HeaderFormNodeConfig {
	/** ID of the DAG api node that provides header data */
	sourceNodeId: string;
	imageField?: string;
	titleField: string;
	nameField?: string;
	badgeField?: string;
	badgeColorMap?: Record<string, string>;
	/** Fields shown only in expanded mode (as label: value pairs) */
	expandedFields?: string[];
	/** Fields always shown as compact key-value pairs in expanded mode */
	keyValueFields?: string[];
	/** When true, the ℹ icon fires onToggleDetail callback */
	infoIconTogglesDetailPanel?: boolean;
}

export interface HeaderFormNodeOutput {
	config: HeaderFormNodeConfig;
}

// ── DetailPanel Node ──────────────────────────────────────────────────────────

export interface DetailPanelToolbarConfig {
	showSave?: boolean;
	showClose?: boolean;
	showEdit?: boolean;
}

export interface DetailPanelNodeConfig {
	/** ID of the DAG api node that provides form data */
	sourceNodeId: string;
	/** ID of the DAG api node to call on save (PATCH/POST) */
	saveApiNodeId?: string;
	/** Field name used as the row identifier */
	rowKeyField: string;
	/** IDs of formSection nodes to render in order */
	sections: string[];
	toolbar?: DetailPanelToolbarConfig;
	/** Number of skeleton rows to show while loading */
	skeletonRows?: number;
}

export interface DetailPanelNodeOutput {
	config: DetailPanelNodeConfig;
	sections: FormSectionNodeOutput[];
}

// ── DAGFormConfig ─────────────────────────────────────────────────────────────

export interface DAGFormConfig {
	formId: string;
	/** Object types this form accepts via drag-and-drop */
	acceptedTypes: string[];
	/** The param name to inject the dropped object's ID as ($params.<dropParamName>) */
	dropParamName?: string;
	dag: DAGConfig;
}

// ── Runtime Form State ────────────────────────────────────────────────────────

export interface FormFieldData {
	fieldId: string;
	label: string;
	fieldType: FormFieldType;
	value: JsonPrimitive;
	editable: boolean;
	options?: Array<{ label: string; value: JsonPrimitive }>;
	badgeColorMap?: Record<string, string>;
	linkUrl?: string;
}

export interface FormSectionData {
	sectionId: string;
	label: string;
	layout: FormSectionLayout;
	columns?: number;
	collapsible: boolean;
	defaultCollapsed: boolean;
	fields: FormFieldData[];
}

export interface HeaderFormData {
	image?: string;
	title: string;
	name?: string;
	badge?: string;
	badgeColor?: string;
	expandedFields: Array<{ label: string; value: string }>;
	keyValueFields: Array<{ label: string; value: string }>;
}
