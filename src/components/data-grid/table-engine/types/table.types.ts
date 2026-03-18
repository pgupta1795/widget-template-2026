// src/components/data-grid/table-engine/types/table.types.ts

import type {
	ColumnType,
	GridColumnDef,
	SelectOption,
} from "@/components/data-grid/types/column-types";
import type {
	GridDensity,
	GridFeaturesConfig,
	GridMode,
	GridRow,
} from "@/components/data-grid/types/grid-types";
import type {
	DAGExecutionError,
	DAGValidationError,
} from "../core/dag-validator";
import type { DAGConfig, JsonataExpr, JsonValue } from "./dag.types";
import type { SerializableToolbarCommand } from "@/components/data-grid/toolbar/toolbar.types";

// Re-export for consumers of table.types
export type { GridRow, GridColumnDef, ColumnType, SelectOption };

// ── Shared ───────────────────────────────────────────────────────────────────

export type DepthRule =
	| { depths: number[] }
	| { minDepth: number }
	| { maxDepth: number };

// ── ApiNode ──────────────────────────────────────────────────────────────────

export interface ApiNodeConfig {
	url: string | JsonataExpr;
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	authAdapterId: string;
	queryParams?: Record<string, string | JsonataExpr>;
	headers?: Record<string, string>;
	body?: JsonValue | JsonataExpr;
	formParams?: Record<string, string | JsonataExpr>;
	fileParams?: Array<{ fieldName: string; sourceKey: string }>;
	/** JSONata on ServiceResponse.data → GridRow[] */
	responseTransform?: string;
	paginationConfig?: {
		type: "offset" | "cursor" | "page";
		pageSizeParam: string;
		pageParam: string;
		totalKey?: string;
	};
}

export interface ApiNodeOutput {
	rows: GridRow[];
	total?: number;
	nextPage?: string | null;
}

// ── TransformNode ─────────────────────────────────────────────────────────────

export interface TransformNodeConfig {
	/** Must reference an 'api' or 'merge' node */
	sourceNodeId: string;
	/** JSONata expression; input is source rows */
	expression: string;
}

// ── ColumnNode ────────────────────────────────────────────────────────────────

export interface ColumnDef {
	field: string;
	header: string;
	type?: ColumnType;
	sortable?: boolean;
	filterable?: boolean;
	editable?: boolean | DepthRule;
	renderType?: "badge" | "boolean" | "date" | "code" | "custom";
	/** JSONata per-cell transform; input is the row object */
	valueExpr?: string;
	width?: number;
	pinned?: "left" | "right";
	hidden?: boolean;
	selectOptions?: SelectOption[];
	depthRules?: DepthRule[];
	/** Tailwind CSS classes for the column header */
	classNameHeader?: string;
	/** Tailwind CSS classes for the column cells */
	classNameCell?: string;
}

export interface ColumnNodeConfig {
	columns: ColumnDef[];
	/** References an ActionNode in the same DAG; output appended as action column */
	actionNodeId?: string;
}

export interface ColumnNodeOutput {
	columns: GridColumnDef<GridRow>[];
	/** Columns with hidden:true appear as { field: false } */
	visibility: Record<string, boolean>;
}

// ── RowExpandNode ─────────────────────────────────────────────────────────────

export interface RowExpandNodeConfig {
	triggerOnExpand: boolean;
	/** References a lazy ApiNode in nodes[] — NOT in edges */
	childApiNodeId: string;
	/** e.g. '$:$row.id' — evaluated with row context */
	childKeyExpr: JsonataExpr;
	/** Query param key to inject, e.g. 'parentId' */
	childQueryParam: string;
	infiniteLoad?: boolean;
	maxDepth?: number;
}

export interface RowExpandOutput {
	expandHandler: (row: GridRow) => Promise<GridRow[]>;
}

// ── RowEnrichNode ─────────────────────────────────────────────────────────────

export interface RowEnrichDescriptor {
	/** Key value identifying the row — derived from rowKeyField */
	rowKey: string;
	/** Plain row data snapshot — no NodeContext stored */
	rowData: GridRow;
}

export interface RowEnrichNodeConfig {
	/** Must reference an 'api', 'transform', or 'merge' node */
	sourceNodeId: string;
	/**
	 * Lazy ApiNode in nodes[] — NOT in edges.
	 * Same convention as RowExpandNodeConfig.childApiNodeId.
	 */
	childApiNodeId: string;
	/** Field used as the row identity key. Default: 'id' */
	rowKeyField?: string;
	/**
	 * false (default) = fires immediately after root load.
	 * true = waits for triggerEnrich() to be called.
	 */
	lazy?: boolean;
	/**
	 * JSONata expression applied to the first row of the childApi response
	 * before merging into the root row.
	 * Input: first GridRow from childApi response.
	 * Output: object spread onto the root row.
	 * Evaluated via evaluateExpr (jsonata-evaluator.ts).
	 * When absent, first row is spread directly.
	 */
	mergeTransform?: string;
	/**
	 * TanStack Query keys to invalidate after ALL row enrich queries succeed.
	 * Each string is wrapped in an array: queryClient.invalidateQueries({ queryKey: [key] })
	 * e.g. ['eng-expand'] re-fetches the root table after enrichment completes.
	 */
	invalidateQueryKeys?: string[];
}

export interface RowEnrichNodeOutput {
	descriptors: RowEnrichDescriptor[];
	/** Shared childApiNodeId for all descriptors */
	childApiNodeId: string;
	/** Resolved rowKeyField (default 'id' applied) */
	rowKeyField: string;
	lazy: boolean;
	mergeTransform?: string;
	invalidateQueryKeys?: string[];
}

// ── ColumnHydrateNode ─────────────────────────────────────────────────────────

export interface ColumnHydrateDescriptor {
	/** Key value identifying the row */
	rowKey: string;
	/** Plain row data snapshot */
	rowData: GridRow;
	/** Column this descriptor is for */
	columnId: string;
}

export interface ColumnHydrateEntry {
	/** Must match a ColumnDef.field in the ColumnNode of the same DAG */
	columnId: string;
	/**
	 * Lazy ApiNode in nodes[] — NOT in edges.
	 * Same convention as RowEnrichNodeConfig.childApiNodeId.
	 */
	childApiNodeId: string;
	/** Per-column lazy gate. false (default) = fires with root load */
	lazy?: boolean;
	/**
	 * JSONata expression applied to the first row of the childApi response.
	 * Output is merged as { [columnId]: transformedValue } onto the root row.
	 * When absent, merged as { [columnId]: result.rows[0] }.
	 */
	mergeTransform?: string;
	/**
	 * TanStack Query keys to invalidate after this column's queries all succeed.
	 * Each string is wrapped in an array for the invalidateQueries call.
	 */
	invalidateQueryKeys?: string[];
}

export interface ColumnHydrateNodeConfig {
	/** Must reference an 'api', 'transform', or 'merge' node */
	sourceNodeId: string;
	/** Field used as the row identity key. Default: 'id' */
	rowKeyField?: string;
	columns: ColumnHydrateEntry[];
}

export interface ColumnHydrateNodeOutput {
	descriptors: ColumnHydrateDescriptor[];
	/**
	 * Preserved from config for lazy lookups and mergeTransform access in useDAGTable.
	 * Index-aligned to descriptors would be ambiguous — use columnEntries.find(c => c.columnId === desc.columnId).
	 */
	columnEntries: ColumnHydrateEntry[];
	/** Resolved rowKeyField (default 'id' applied) */
	rowKeyField: string;
}

// ── MergeNode ─────────────────────────────────────────────────────────────────

export type MergeStrategy = "concat" | "join" | "merge";

export interface MergeNodeConfig {
	/** Must reference 'api' or 'transform' nodes */
	sourceNodeIds: string[];
	strategy: MergeStrategy;
	/** Required when strategy is 'join' */
	joinKey?: string;
}

// ── ActionNode ────────────────────────────────────────────────────────────────

export interface ActionDef {
	id: string;
	label: string;
	icon?: string;
	/** Lazy ApiNode id (NOT in edges) */
	apiNodeId: string;
	confirmMessage?: string;
	/** Evaluated with $row context; default visible */
	visibilityExpr?: JsonataExpr;
	/** Evaluated with $row context; default enabled */
	disabledExpr?: JsonataExpr;
}

export interface ActionNodeConfig {
	rowActions?: ActionDef[];
	cellActions?: ActionDef[];
}

export interface ActionOutput {
	rowActions: ActionDef[];
	cellActions: ActionDef[];
}

// ── NodeOutputMap ─────────────────────────────────────────────────────────────

export interface NodeOutputMap {
	api: ApiNodeOutput;
	transform: GridRow[];
	column: ColumnNodeOutput;
	rowExpand: RowExpandOutput;
	merge: GridRow[];
	action: ActionOutput;
	rowEnrich: RowEnrichNodeOutput;
	columnHydrate: ColumnHydrateNodeOutput;
}

// ── Features ──────────────────────────────────────────────────────────────────

export interface DAGFeaturesConfig extends GridFeaturesConfig {
	columnOrdering?: { enabled?: boolean };
	columnResizing?: { enabled?: boolean };
	columnVisibility?: { enabled?: boolean };
}

// ── Top-level config ──────────────────────────────────────────────────────────

export interface DAGTableConfig {
	tableId: string;
	mode: GridMode;
	dag: DAGConfig;
	features?: DAGFeaturesConfig;
	density?: GridDensity;
	/**
	 * Toolbar commands for this table.
	 * Use action: 'apiNodeId' to wire to a DAG API node.
	 * Consumer toolbarCommands on ConfiguredTable are merged on top (consumer wins on matching id).
	 */
	toolbarCommands?: SerializableToolbarCommand[];
}

// ── Hook result ───────────────────────────────────────────────────────────────

export interface DAGTableResult {
	data: GridRow[];
	columns: GridColumnDef<GridRow>[];
	columnVisibility: Record<string, boolean>;
	isLoading: boolean;
	isFetchingNextPage: boolean;
	error: DAGExecutionError | DAGValidationError | null;
	pagination?: {
		pageIndex: number;
		pageCount: number;
		onPageChange: (page: number) => void;
		pageSize: number;
	};
	hasNextPage?: boolean;
	fetchNextPage?: () => void;
	onExpand?: (row: GridRow) => Promise<GridRow[]>;
	onAction?: (actionId: string, row?: GridRow) => Promise<void>;
	executeNode: (nodeId: string) => Promise<GridRow[]>;
	/** True while any per-row enrichment query is in-flight */
	isEnriching: boolean;
	/** True while any per-column hydration query is in-flight */
	isHydrating: boolean;
	/**
	 * Enables eager rowEnrich queries when rowEnrich.lazy === true.
	 * Undefined when the DAG has no rowEnrich node or lazy is false.
	 */
	triggerEnrich?: () => void;
	/**
	 * Enables a specific column's hydration queries when that column has lazy === true.
	 * Undefined when the DAG has no columnHydrate node or no column has lazy === true.
	 */
	triggerHydrate?: (columnId: string) => void;
}
