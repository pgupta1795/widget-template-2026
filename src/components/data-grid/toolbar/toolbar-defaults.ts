// src/components/data-grid/toolbar/toolbar-defaults.ts
import type { ToolbarCommand } from "./toolbar.types";

export const DEFAULT_SEARCH: ToolbarCommand = {
	id: "search",
	type: "search",
	enabled: false,
	align: "left",
	placeholder: "Search...",
	debounceMs: 300,
};

export const DEFAULT_COLUMN_VISIBILITY: ToolbarCommand = {
	id: "columnVisibility",
	type: "menu",
	enabled: false,
	align: "right",
	label: "Columns",
	icon: "Columns3",
};

export const DEFAULT_DENSITY: ToolbarCommand = {
	id: "density",
	type: "menu",
	enabled: false,
	align: "right",
	icon: "AlignJustify",
};

export const DEFAULT_EXPAND_ALL: ToolbarCommand = {
	id: "expandAll",
	type: "command",
	enabled: false,
	align: "left",
	icon: "ChevronsUpDown",
	// label is computed at render time: 'Expand all' / 'Collapse all'
};

export const DEFAULT_REFRESH: ToolbarCommand = {
	id: "refresh",
	type: "command",
	enabled: false,
	align: "right",
	icon: "RefreshCw",
	// button disables and icon spins while ctx.isRefetching
};

export const DEFAULT_EXPORT: ToolbarCommand = {
	id: "export",
	type: "command",
	enabled: false,
	align: "right",
	label: "Export",
	icon: "Download",
};

export const DEFAULT_ADD_ROW: ToolbarCommand = {
	id: "addRow",
	type: "command",
	enabled: false,
	align: "right",
	label: "Add row",
	icon: "Plus",
	// handler guards typeof features.addRow === 'object' before accessing .onAddRow
};

/**
 * All built-in defaults in canonical display order.
 * All entries have enabled: false — spread and override to opt in.
 *
 * @example
 * toolbarCommands={[
 *   { ...DEFAULT_SEARCH, enabled: true, placeholder: 'Find...' },
 *   { id: 'spacer', type: 'spacer', enabled: true },
 *   { ...DEFAULT_EXPORT, enabled: true },
 * ]}
 */
export const TOOLBAR_DEFAULTS: ToolbarCommand[] = [
	DEFAULT_SEARCH,
	{ id: "spacer", type: "spacer", enabled: false },
	DEFAULT_COLUMN_VISIBILITY,
	DEFAULT_DENSITY,
	DEFAULT_EXPAND_ALL,
	DEFAULT_REFRESH,
	DEFAULT_EXPORT,
	DEFAULT_ADD_ROW,
];
