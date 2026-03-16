// src/components/data-grid/toolbar/toolbar.types.ts
import type { ComponentType } from "react";
import type { Table } from "@tanstack/react-table";
import type {
	GridDensity,
	GridFeaturesConfig,
	GridMode,
	GridRow,
} from "@/components/data-grid/types/grid-types";

export type ToolbarCommandType =
	| "command"
	| "menu"
	| "search"
	| "spacer"
	| "separator";
export type ToolbarAlign = "left" | "right";

export interface ToolbarCommand {
	id: string;
	type: ToolbarCommandType;
	/** Default: false — must explicitly set true to render */
	enabled?: boolean;
	/** Default: 'left' */
	align?: ToolbarAlign;
	label?: string;
	/**
	 * React component reference OR lucide icon name string.
	 * Strings are resolved at render time via resolveLucideIcon().
	 */
	icon?: ComponentType<{ className?: string }> | string;
	/** Applied to the button/trigger/input element */
	className?: string;
	/** Static disabled state */
	disabled?: boolean;

	// ── type: 'command' ──────────────────────────────────────────────────────
	handler?: (
		ctx: ToolbarContext,
		params?: Record<string, unknown>,
	) => Promise<void>;
	/** Static params passed as second argument to handler */
	handlerParams?: Record<string, unknown>;

	// ── type: 'menu' ─────────────────────────────────────────────────────────
	/** Flat list of sub-commands — NO nesting within sub-commands (1 level max) */
	commands?: ToolbarCommand[];
	/** Applied to DropdownMenuContent element */
	menuClassName?: string;

	// ── type: 'search' ───────────────────────────────────────────────────────
	/**
	 * When set: server-side search via ctx.onSearch(queryParamName, value).
	 * When omitted: client-side filter via ctx.setGlobalFilter(value).
	 */
	apiNodeId?: string;
	/** Query param key sent to onSearch. Default: 'q' */
	queryParamName?: string;
	/** Debounce delay in ms. Default: 300 */
	debounceMs?: number;
	placeholder?: string;
	/** Applied to the Input element */
	inputClassName?: string;
}

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

	/** True while data is refetching — use to show spinner on refresh button */
	isRefetching: boolean;

	/**
	 * Execute a DAG ActionDef by its id. No-op when DataGrid is standalone.
	 * Maps to onAction(actionId, undefined) — no row context at toolbar level.
	 */
	executeApiNode: (actionId: string) => Promise<void>;

	/** Trigger a data refetch (maps to onRefresh prop) */
	refetch?: () => void;

	/** Lazy-expand a single tree row */
	expandRow?: (row: GridRow) => Promise<void>;
	/** Collapse all expanded rows */
	collapseAll?: () => void;

	/**
	 * Server-side search relay. Called by command-search when apiNodeId is set.
	 * paramName = command.queryParamName ?? 'q'
	 * ConfiguredTable wires this to update its searchParams state.
	 */
	onSearch?: (paramName: string, query: string) => void;

	mode?: GridMode;
	features?: GridFeaturesConfig;
}
