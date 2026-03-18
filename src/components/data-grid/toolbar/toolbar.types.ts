// src/components/data-grid/toolbar/toolbar.types.ts
import type {
	GridDensity,
	GridFeaturesConfig,
	GridMode,
	GridRow,
} from "@/components/data-grid/types/grid-types";
import type { Row, Table } from "@tanstack/react-table";
import type { ComponentType } from "react";
import type { ActiveEdit } from "@/components/data-grid/features/editing/use-editing";
import React from "react";

// ── Shared base ───────────────────────────────────────────────────────────────

export interface ToolbarCommandBase {
	id: string;
	/**
	 * When absent or false, the command is not rendered.
	 * Must be explicitly set to true to opt in.
	 */
	enabled?: boolean;
	/** Default: 'left' */
	align?: "left" | "right";
	label?: string;
	/**
	 * React component reference OR lucide icon name string.
	 * Strings are resolved at render time via resolveLucideIcon().
	 */
	icon?: ComponentType<{ className?: string }> | string;
	/** Applied to the button/trigger/input element */
	className?: string;
	disabled?: boolean;
}

// ── Command ───────────────────────────────────────────────────────────────────

export interface CommandToolbarCommand extends ToolbarCommandBase {
	type: "command";
	/**
	 * Direct DAG API node ID. Fires ctx.executeApiNode(action) when clicked.
	 * No-op in standalone DataGrid — use handler instead for programmatic use.
	 */
	action?: string;
	/**
	 * Full custom handler. Takes precedence over action when both present.
	 * Receives full ToolbarContext — table, rows, columns, all state.
	 */
	handler?: (
		ctx: ToolbarContext,
		params?: Record<string, unknown>,
	) => Promise<void>;
	/** Static params passed as second argument to handler. Ignored when only action is set. */
	handlerParams?: Record<string, unknown>;
}

// ── Menu ──────────────────────────────────────────────────────────────────────

export interface MenuToolbarCommand extends ToolbarCommandBase {
	type: "menu";
	/** Sub-items are CommandToolbarCommands — support action and handler. 1 level max. */
	commands: CommandToolbarCommand[];
	menuClassName?: string;
}

// ── Search ────────────────────────────────────────────────────────────────────

export interface SearchToolbarCommand extends ToolbarCommandBase {
	type: "search";
	/**
	 * When set → server-side mode: ctx.onSearch(queryParamName, value) on debounce.
	 * When omitted → client-side mode: ctx.setGlobalFilter(value) on debounce.
	 */
	action?: string;
	/** Query param key passed to onSearch. Default: 'q' */
	queryParamName?: string;
	/** Debounce delay in ms. Default: 300 */
	debounceMs?: number;
	placeholder?: string;
	inputClassName?: string;
}

// ── Layout primitives — intentionally do NOT extend ToolbarCommandBase ────────

/** Flexible spacer — pushes subsequent items to the right */
export interface SpacerToolbarCommand {
	id: string;
	type: "spacer";
	enabled?: boolean;
	align?: "left" | "right";
}

/** Visual divider between commands */
export interface SeparatorToolbarCommand {
	id: string;
	type: "separator";
	enabled?: boolean;
	align?: "left" | "right";
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type ToolbarCommand =
	| CommandToolbarCommand
	| MenuToolbarCommand
	| SearchToolbarCommand
	| SpacerToolbarCommand
	| SeparatorToolbarCommand;

/**
 * Extracts the union of all type discriminants from ToolbarCommand.
 * Useful for type-narrowing dispatches or route-based rendering.
 */
export type ToolbarCommandType = ToolbarCommand["type"];

/**
 * Alignment position for toolbar commands.
 */
export type ToolbarAlign = "left" | "right";

/**
 * Type alias for ToolbarCommand — allows inline handler functions in DAGTableConfig.
 * Previously restricted to serializable-only (no handler/handlerParams), but configs
 * are TypeScript code (not stored JSON), so inline handlers are safe and supported.
 */
export type SerializableToolbarCommand = ToolbarCommand;

// ── ToolbarContext ─────────────────────────────────────────────────────────────

export interface ToolbarContext {
	/** Full TanStack Table instance — all state, sorting, filtering, visibility */
	table: Table<GridRow>;
	/** Filtered/visible rows */
	rows: GridRow[];
	/** All rows unfiltered (getCoreRowModel) */
	allRows: GridRow[];
	/** Currently selected rows */
	selectedRows: GridRow[];

	globalFilter: string;
	setGlobalFilter: (value: string) => void;
	density: GridDensity;
	setDensity: (d: GridDensity) => void;

	/** True while data is refetching */
	isRefetching: boolean;
	/** True while initial data is loading */
	isLoading: boolean;
	/** True while next page is loading (infinite mode) */
	isFetchingNextPage: boolean;

	/**
	 * Fires a DAG API node directly by nodeId. Returns the rows from the API response.
	 * In ConfiguredTable: wired to useDAGTable's executeNode(nodeId).
	 * In standalone DataGrid: returns empty array.
	 */
	executeApiNode: (nodeId: string) => Promise<GridRow[]>;

	/** Replace all tree rows with a new set (e.g. after an expand-all API call). */
	setRows: (rows: GridRow[]) => void;

	/** Trigger a data refetch (maps to onRefresh prop) */
	refetch?: () => void;

	/** Row IDs currently loading children (lazy tree expand) */
	loadingRowIds: Set<string>;
	/** Lazy-expand a single tree row — takes the full TanStack Row object */
	expandRow?: (row: Row<GridRow>) => Promise<void>;
	/** Collapse all expanded rows */
	collapseAll?: () => void;

	/**
	 * Server-side search relay.
	 * paramName = command.queryParamName ?? 'q'
	 */
	onSearch?: (paramName: string, query: string) => void;

	mode?: GridMode;
	features?: GridFeaturesConfig;

	// ── Editing ─────────────────────────────────────────────────────────────
	activeEdit: ActiveEdit | null;
	startEditing: (rowId: string, columnId: string, value: unknown) => void;
	cancelEditing: () => void;
	commitEditing: (value: unknown) => Promise<void>;
	mutatingRowIds: Set<string>;
	errorRowIds: Set<string>;

	// ── Pagination ───────────────────────────────────────────────────────────
	pagination: { pageIndex: number; pageSize: number };
	setPagination: React.Dispatch<
		React.SetStateAction<{ pageIndex: number; pageSize: number }>
	>;
	paginatedTotal: number | undefined;

	// ── Infinite ─────────────────────────────────────────────────────────────
	hasNextPage: boolean;
	fetchNextPage: () => void;

	// ── Row/Column enrichment ─────────────────────────────────────────────────
	/** True while any per-row enrichment query is in-flight */
	isEnriching: boolean;
	/** True while any per-column hydration query is in-flight */
	isHydrating: boolean;
	/** Trigger rowEnrich queries when rowEnrich node has lazy === true. Undefined when not applicable. */
	triggerEnrich?: () => void;
	/** Trigger a column's hydration queries (lazy === true). Undefined when not applicable. */
	triggerHydrate?: (columnId: string) => void;
}
