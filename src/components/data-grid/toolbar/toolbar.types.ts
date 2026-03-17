// src/components/data-grid/toolbar/toolbar.types.ts
import type { ComponentType } from "react";
import type { Table } from "@tanstack/react-table";
import type {
	GridDensity,
	GridFeaturesConfig,
	GridMode,
	GridRow,
} from "@/components/data-grid/types/grid-types";

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
}

/** Visual divider between commands */
export interface SeparatorToolbarCommand {
	id: string;
	type: "separator";
	enabled?: boolean;
}

// ── Union ─────────────────────────────────────────────────────────────────────

export type ToolbarCommand =
	| CommandToolbarCommand
	| MenuToolbarCommand
	| SearchToolbarCommand
	| SpacerToolbarCommand
	| SeparatorToolbarCommand;

/**
 * Config-safe subset — handler and handlerParams omitted (not JSON-serializable).
 * Use this type in DAGTableConfig.toolbarCommands.
 */
export type SerializableToolbarCommand =
	| Omit<CommandToolbarCommand, "handler" | "handlerParams">
	| (Omit<MenuToolbarCommand, "commands"> & {
			commands: Omit<CommandToolbarCommand, "handler" | "handlerParams">[];
	  })
	| SearchToolbarCommand
	| SpacerToolbarCommand
	| SeparatorToolbarCommand;

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

	/** True while data is refetching — use to show spinner on refresh button */
	isRefetching: boolean;

	/**
	 * Fires a DAG API node directly by nodeId (bypasses ActionNode).
	 * In ConfiguredTable: wired to useDAGTable's executeNode(nodeId).
	 * In standalone DataGrid: no-op (use handler for programmatic logic instead).
	 */
	executeApiNode: (nodeId: string) => Promise<void>;

	/** Trigger a data refetch (maps to onRefresh prop) */
	refetch?: () => void;

	/** Lazy-expand a single tree row */
	expandRow?: (row: GridRow) => Promise<void>;
	/** Collapse all expanded rows */
	collapseAll?: () => void;

	/**
	 * Server-side search relay. Called by SearchToolbarCommand when action is set.
	 * paramName = command.queryParamName ?? 'q'
	 * ConfiguredTable wires this to update its searchParams state.
	 */
	onSearch?: (paramName: string, query: string) => void;

	mode?: GridMode;
	features?: GridFeaturesConfig;
}
