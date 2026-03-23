# Toolbar

A declarative command bar above the grid. Compose built-in commands (search, column visibility, density, refresh, export, expand-all, add-row) with fully custom buttons, menus, and handlers — in both standalone `DataGrid` and config-driven `ConfiguredTable`.

---

## Quick Navigation

- [Overview & render rules](#overview)
- [Command types](#command-types)
  - [command — clickable button](#command--clickable-button)
  - [menu — dropdown](#menu--dropdown-menu)
  - [search — search input](#search--search-input)
  - [spacer — flex gap](#spacer--flexible-space)
  - [separator — visual divider](#separator--visual-divider)
- [ToolbarContext — handler API](#toolbarcontext--handler-api)
  - [Data access](#data-access) · [State setters](#state-setters) · [Loading state](#loading-state)
  - [DAG integration](#dag-integration-configuredtable) · [Tree/expansion](#treeexpansion) · [Server-side search](#server-side-search-relay)
  - [Mode & features](#mode--features) · [Editing](#inline-editing) · [Pagination](#pagination) · [Infinite scroll](#infinite-scroll)
- [Built-in commands](#built-in-commands)
- [Standalone DataGrid](#standalone-datagrid)
- [ConfiguredTable](#configuredtable)
- [Merging commands](#merging-toolbar-commands)
- [Icons](#icons)
- [Server-side search (full flow)](#server-side-search-full-flow)
- [Real-world config examples](#real-world-config-examples)

---

## Overview

The toolbar renders above the grid when `toolbarCommands` is supplied. Each entry in the array is a command object. **Only entries with `enabled: true` are rendered.** Commands appear left-to-right in the order declared.

```
DataGrid / ConfiguredTable
  └── DataGridToolbar
        └── ToolbarRenderer
              └── for each command where enabled === true:
                    ├── id === built-in? → BuiltIn<X> component (columnVisibility, density, …)
                    └── else type switch  → CommandButton | CommandMenu | CommandSearch | spacer | separator
```

**Three states for `toolbarCommands`:**

| Value | Result |
|-------|--------|
| `undefined` (default) | No toolbar bar rendered |
| `[]` | Toolbar bar rendered at full height, empty |
| `[{ enabled: true, … }]` | Commands rendered inside the bar |

---

## Command Types

All commands except `spacer` and `separator` extend `ToolbarCommandBase`.

### ToolbarCommandBase — shared fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | `string` | — | Unique key. Built-in IDs (`search`, `columnVisibility`, `density`, `expandAll`, `refresh`, `export`, `addRow`) activate special render logic. |
| `enabled` | `boolean` | `false` | Must be `true` to render. Omit or `false` to hide without removing. |
| `align` | `"left" \| "right"` | `"left"` | Which side of the toolbar the command appears on. |
| `label` | `string` | — | Text label shown on the button or menu trigger. |
| `icon` | `ComponentType<{className?}> \| string` | — | React component **or** lucide icon name string, e.g. `"Download"`. Resolved at render time. |
| `className` | `string` | — | Extra CSS classes on the outermost button/trigger/input element. |
| `disabled` | `boolean` | — | Disables the interactive element without hiding it. |

---

### `command` — Clickable button

A button that runs an async `handler` or fires a DAG API node by `action` ID.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"command"` | Type discriminant. |
| `action` | `string` | DAG API node ID. Calls `ctx.executeApiNode(action)` when clicked. Ignored in standalone `DataGrid` (no DAG) — use `handler` instead. |
| `handler` | `(ctx: ToolbarContext, params?: Record<string, unknown>) => Promise<void>` | Custom async function. **Takes precedence over `action`** when both are present. |
| `handlerParams` | `Record<string, unknown>` | Static object forwarded as the second argument to `handler`. Has no effect when only `action` is set. |

**Execution priority:** `handler` → `action` → no-op (button still renders).

**Button renders with `isPending` disabled state** while the handler/action is awaiting.

```ts
// Minimal: no-op button (renders, click does nothing)
{ id: "noop", type: "command", enabled: true, label: "Click me" }

// Fire a DAG API node (ConfiguredTable only — standalone DataGrid ignores action)
{ id: "runApi", type: "command", enabled: true, label: "Fetch", icon: "Download", action: "my-api-node" }

// Custom handler — works in both ConfiguredTable and standalone DataGrid
{
  id: "logSelected",
  type: "command",
  enabled: true,
  label: "Log selection",
  icon: "Terminal",
  handler: async (ctx) => {
    console.log("Selected:", ctx.selectedRows);
  },
}

// Handler + static params
{
  id: "bulkApprove",
  type: "command",
  enabled: true,
  label: "Approve",
  icon: "CheckCircle",
  handlerParams: { status: "approved" },
  handler: async (ctx, params) => {
    for (const row of ctx.selectedRows) {
      await ctx.executeApiNode("approve-api"); // params available if needed
    }
  },
}
```

---

### `menu` — Dropdown menu

A button that opens a dropdown. Items are `CommandToolbarCommand` objects — same `action`/`handler` support as `command`. **One level of nesting only.**

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"menu"` | Type discriminant. |
| `commands` | `CommandToolbarCommand[]` | Dropdown items. Each supports `action`, `handler`, `handlerParams`, `icon`, `label`. |
| `menuClassName` | `string` | Extra CSS class on the dropdown content panel. |

```ts
// Simple dropdown with handler items
{
  id: "actionsMenu",
  type: "menu",
  enabled: true,
  label: "Actions",
  icon: "Settings",
  commands: [
    {
      id: "exportCsv",
      type: "command",
      label: "Export CSV",
      icon: "Download",
      handler: async (ctx) => {
        // ctx.rows = currently visible rows
        console.log("Exporting", ctx.rows.length, "rows");
      },
    },
    {
      id: "deleteSelected",
      type: "command",
      label: "Delete selected",
      icon: "Trash2",
      handler: async (ctx) => {
        const ids = ctx.selectedRows.map((r) => r.id);
        console.log("Deleting:", ids);
      },
    },
  ],
}

// Mixed: some items fire DAG nodes, some use handlers
{
  id: "apiMenu",
  type: "menu",
  enabled: true,
  label: "Operations",
  icon: "Wrench",
  commands: [
    // DAG node trigger (ConfiguredTable only)
    { id: "syncItem",   type: "command", label: "Sync",   icon: "RefreshCw", action: "sync-api-node" },
    // Custom handler
    { id: "previewItem", type: "command", label: "Preview", icon: "Eye",
      handler: async (ctx) => { /* open preview panel */ } },
  ],
}
```

---

### `search` — Search input

A debounced text input with a clear (×) button. Two modes based on whether `action` is set.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | `"search"` | — | Type discriminant. |
| `action` | `string` | — | **Any truthy string** activates server-side mode. The actual string value is not used as an API node ID — it only acts as a flag. When omitted → client-side mode. |
| `queryParamName` | `string` | `"q"` | Key passed to `ctx.onSearch(paramName, value)`. In `ConfiguredTable`, this is stored in `searchParams` and injected into the DAG as `$params.<queryParamName>`. |
| `debounceMs` | `number` | `300` | Milliseconds to wait after the last keystroke before firing. |
| `placeholder` | `string` | `"Search..."` | Input placeholder text. |
| `inputClassName` | `string` | — | Extra CSS on the `<input>` element. Default: `w-56`, expands to `w-72` on focus. |

**Mode comparison:**

| Mode | `action` field | On debounce fires | Effect |
|------|---------------|-------------------|--------|
| Client-side | omitted / falsy | `ctx.setGlobalFilter(value)` | Filters rows already in memory |
| Server-side | any truthy string | `ctx.onSearch(queryParamName, value)` | Updates React Query key → new API fetch |

```ts
// Client-side: filter rows already loaded in memory
{
  id: "search",
  type: "search",
  enabled: true,
  placeholder: "Filter by name, type...",
  debounceMs: 200,
}

// Server-side: trigger a new API call on each keypress (after debounce)
{
  id: "search",
  type: "search",
  enabled: true,
  action: "root-api",          // truthy string → server-side mode
  queryParamName: "searchStr", // injected as $params.searchStr in DAG queryParams
  placeholder: "Search by name, description...",
  debounceMs: 400,
}
```

---

### `spacer` — Flexible space

Inserts a `flex-1` `<div>` that pushes everything after it to the right. Does **not** extend `ToolbarCommandBase` — has only: `id`, `type`, `enabled`, `align`.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"spacer"` | Type discriminant. |
| `enabled` | `boolean` | Must be `true` to render. |

```ts
// Standard usage: left commands | spacer | right commands
toolbarCommands: [
  { id: "search",  type: "search",  enabled: true },  // ← left side
  { id: "spacer",  type: "spacer",  enabled: true },  // ← pushes right side
  { id: "refresh", type: "command", enabled: true, icon: "RefreshCw" },  // → right side
  { id: "export",  type: "command", enabled: true, label: "Export" },    // → right side
]
```

---

### `separator` — Visual divider

A vertical line (`1px` tall, `h-4`) between commands. Same minimal shape as `spacer`.

| Field | Type | Description |
|-------|------|-------------|
| `type` | `"separator"` | Type discriminant. |
| `enabled` | `boolean` | Must be `true` to render. |

```ts
// Separate refresh from export visually
toolbarCommands: [
  { id: "search",  type: "search",   enabled: true },
  { id: "spacer",  type: "spacer",   enabled: true },
  { id: "refresh", type: "command",  enabled: true, icon: "RefreshCw" },
  { id: "sep1",    type: "separator", enabled: true },
  { id: "export",  type: "command",  enabled: true, label: "Export", icon: "Download" },
]
```

---

## ToolbarContext — handler API

Every `handler` function receives a `ToolbarContext` as its first argument. This gives you complete access to table state, data, DAG execution, search, editing, pagination, and more.

```ts
handler: async (ctx: ToolbarContext, params?: Record<string, unknown>) => {
  // Full API available here
}
```

---

### Data access

| Property | Type | Description |
|----------|------|-------------|
| `table` | `Table<GridRow>` | Raw TanStack Table instance. Access sorting state, column visibility, row models, column definitions — everything. |
| `rows` | `GridRow[]` | Visible rows after filtering: `table.getFilteredRowModel().rows.map(r => r.original)`. |
| `allRows` | `GridRow[]` | All rows before filtering: `table.getCoreRowModel().rows.map(r => r.original)`. |
| `selectedRows` | `GridRow[]` | Rows with an active checkbox selection. |

**Usage examples:**

```ts
// Count visible vs total
handler: async (ctx) => {
  console.log(`Showing ${ctx.rows.length} of ${ctx.allRows.length} rows`);
}

// Operate on selected rows only
handler: async (ctx) => {
  if (ctx.selectedRows.length === 0) {
    alert("Select at least one row first");
    return;
  }
  for (const row of ctx.selectedRows) {
    console.log(row.id, row.name);
  }
}

// Access TanStack Table API directly
handler: async (ctx) => {
  // Get current sort state
  const sorting = ctx.table.getState().sorting;
  console.log("Sorted by:", sorting);

  // Get all visible column IDs
  const visibleCols = ctx.table.getVisibleLeafColumns().map(c => c.id);
  console.log("Visible columns:", visibleCols);

  // Toggle a specific column's visibility programmatically
  ctx.table.getColumn("owner")?.toggleVisibility(false);
}
```

---

### State setters

| Property | Type | Description |
|----------|------|-------------|
| `globalFilter` | `string` | Current global filter string (what the search input syncs to in client-side mode). |
| `setGlobalFilter` | `(value: string) => void` | Set the client-side global filter programmatically. |
| `density` | `GridDensity` | Current row density: `"compact" \| "normal" \| "comfortable"`. |
| `setDensity` | `(d: GridDensity) => void` | Change row density programmatically. |

**Usage examples:**

```ts
// Clear the search filter from a custom button
{
  id: "clearFilter",
  type: "command",
  enabled: true,
  label: "Clear",
  icon: "X",
  handler: async (ctx) => {
    ctx.setGlobalFilter("");
  },
}

// Switch to compact mode for dense data review
{
  id: "compactMode",
  type: "command",
  enabled: true,
  label: "Compact",
  icon: "AlignJustify",
  handler: async (ctx) => {
    ctx.setDensity(ctx.density === "compact" ? "normal" : "compact");
  },
}

// Show current filter in a menu item label (dynamic label trick via handlerParams)
{
  id: "filterStatus",
  type: "command",
  enabled: true,
  handler: async (ctx) => {
    console.log("Current filter:", ctx.globalFilter);
  },
}
```

---

### Loading state

| Property | Type | Description |
|----------|------|-------------|
| `isRefetching` | `boolean` | `true` while data is re-fetching after a manual refresh or param change. |
| `isLoading` | `boolean` | `true` during initial data load (skeleton is shown). |
| `isFetchingNextPage` | `boolean` | `true` while the next infinite-scroll page is in-flight. |

**Usage examples:**

```ts
// Guard a handler against firing during a load
{
  id: "processData",
  type: "command",
  enabled: true,
  label: "Process",
  handler: async (ctx) => {
    if (ctx.isLoading || ctx.isRefetching) {
      console.warn("Wait for data to finish loading");
      return;
    }
    // safe to proceed
    console.log("Processing", ctx.rows.length, "rows");
  },
}

// Show different label depending on fetch state (via disabled)
{
  id: "refresh",
  type: "command",
  enabled: true,
  label: "Refresh",
  icon: "RefreshCw",
  // disabled while refetching — built-in refresh does this automatically,
  // but a custom command must handle it manually:
  handler: async (ctx) => {
    if (ctx.isRefetching) return;
    ctx.refetch?.();
  },
}
```

---

### DAG integration (ConfiguredTable)

| Property | Type | Description |
|----------|------|-------------|
| `executeApiNode` | `(nodeId: string) => Promise<GridRow[]>` | Execute a DAG API node by its `id` and return the resulting rows. In standalone `DataGrid` this is a no-op that returns `[]`. |
| `setRows` | `(rows: GridRow[]) => void` | Replace all rows currently in the grid. Useful after fetching a new complete dataset (e.g. expand-all). |
| `refetch` | `() => void \| undefined` | Trigger a full data refresh (calls `onRefresh` on the DataGrid). |

**Usage examples:**

```ts
// Trigger a DAG API node and replace rows with the result
{
  id: "expandAll",
  type: "command",
  enabled: true,
  label: "Expand All",
  icon: "ChevronsUpDown",
  handler: async (ctx) => {
    const isExpanded = ctx.table.getIsAllRowsExpanded();
    if (isExpanded) {
      // Already fully expanded — collapse instead
      ctx.table.toggleAllRowsExpanded(false);
    } else {
      // Fetch all levels from the API
      const result = await ctx.executeApiNode("expand-all-api");
      const treeRows = result[0]?.children ?? [];
      if (treeRows.length > 0) {
        ctx.setRows(result);                        // replace grid data
        ctx.table.toggleAllRowsExpanded(true);     // visually expand all
      }
    }
  },
}

// Refresh button that uses the DAG's refetch
{
  id: "refresh",
  type: "command",
  enabled: true,
  icon: "RefreshCw",
  handler: async (ctx) => {
    ctx.refetch?.();
  },
}

// Fetch from one node and push into grid
{
  id: "loadSummary",
  type: "command",
  enabled: true,
  label: "Load Summary",
  icon: "BarChart2",
  handler: async (ctx) => {
    const summaryRows = await ctx.executeApiNode("summary-api");
    ctx.setRows(summaryRows);
  },
}
```

---

### Tree/expansion

| Property | Type | Description |
|----------|------|-------------|
| `loadingRowIds` | `Set<string>` | Set of row IDs currently loading their children. |
| `expandRow` | `(row: Row<GridRow>) => Promise<void> \| undefined` | Lazy-expand a specific tree row (triggers `RowExpandNode`). |
| `collapseAll` | `() => void \| undefined` | Collapse all expanded tree rows. |

**Usage examples:**

```ts
// Collapse all expanded tree rows from a toolbar button
{
  id: "collapseAll",
  type: "command",
  enabled: true,
  label: "Collapse all",
  icon: "ChevronUp",
  handler: async (ctx) => {
    ctx.collapseAll?.();
  },
}

// Show a count of rows still loading children
{
  id: "loadingStatus",
  type: "command",
  enabled: true,
  label: "Loading…",
  handler: async (ctx) => {
    console.log("Still loading:", [...ctx.loadingRowIds]);
  },
}

// Expand a specific row programmatically
{
  id: "expandFirst",
  type: "command",
  enabled: true,
  label: "Expand first",
  handler: async (ctx) => {
    const firstRow = ctx.table.getRowModel().rows[0];
    if (firstRow && ctx.expandRow) {
      await ctx.expandRow(firstRow);
    }
  },
}
```

---

### Server-side search relay

| Property | Type | Description |
|----------|------|-------------|
| `onSearch` | `(paramName: string, query: string) => void \| undefined` | Called by `SearchToolbarCommand` in server-side mode. In `ConfiguredTable`, updates `searchParams[paramName]` which re-keys the React Query query. In standalone `DataGrid`, wire this yourself via the `onSearch` prop. |

**Usage examples:**

```ts
// Custom button that resets the server-side search
{
  id: "clearSearch",
  type: "command",
  enabled: true,
  label: "Clear search",
  icon: "X",
  handler: async (ctx) => {
    ctx.onSearch?.("searchStr", "");   // clears the searchStr param
  },
}

// Pre-fill search from a custom source
{
  id: "searchByOwner",
  type: "command",
  enabled: true,
  label: "My items",
  icon: "User",
  handler: async (ctx) => {
    ctx.onSearch?.("owner", "currentUser"); // triggers API with owner=currentUser
  },
}
```

---

### Mode & features

| Property | Type | Description |
|----------|------|-------------|
| `mode` | `GridMode \| undefined` | `"flat" \| "paginated" \| "infinite" \| "tree"`. Use to guard mode-specific actions. |
| `features` | `GridFeaturesConfig \| undefined` | Active feature configuration. Use to check if e.g. selection is enabled. |

**Usage examples:**

```ts
// Guard tree-only operations
{
  id: "expandAll",
  type: "command",
  enabled: true,
  label: "Expand all",
  handler: async (ctx) => {
    if (ctx.mode !== "tree") {
      console.warn("Expand all is only valid in tree mode");
      return;
    }
    ctx.table.toggleAllRowsExpanded(true);
  },
}

// Adapt behaviour based on mode
{
  id: "smartExport",
  type: "command",
  enabled: true,
  label: "Export",
  icon: "Download",
  handler: async (ctx) => {
    if (ctx.mode === "infinite" || ctx.mode === "paginated") {
      // Warn that export only covers loaded rows
      console.warn("Export covers only currently loaded rows");
    }
    console.log("Exporting", ctx.rows.length, "rows");
  },
}

// Check if addRow feature is configured
{
  id: "addItem",
  type: "command",
  enabled: true,
  label: "Add",
  handler: async (ctx) => {
    const addRowConfig = typeof ctx.features?.addRow === "object"
      ? ctx.features.addRow
      : null;
    if (!addRowConfig?.onAddRow) {
      console.warn("addRow not configured");
      return;
    }
    addRowConfig.onAddRow();
  },
}
```

---

### Inline editing

| Property | Type | Description |
|----------|------|-------------|
| `activeEdit` | `ActiveEdit \| null` | Currently active edit: `{ rowId: string; columnId: string; value: unknown }` or `null`. |
| `startEditing` | `(rowId: string, columnId: string, value: unknown) => void` | Begin editing a specific cell programmatically. |
| `cancelEditing` | `() => void` | Discard the current unsaved edit. |
| `commitEditing` | `(value: unknown) => Promise<void>` | Save the current edit value. |
| `mutatingRowIds` | `Set<string>` | Row IDs with in-flight mutations. |
| `errorRowIds` | `Set<string>` | Row IDs where the last mutation failed. |

**Usage examples:**

```ts
// Cancel any active edit from a toolbar button
{
  id: "cancelEdit",
  type: "command",
  enabled: true,
  label: "Cancel edit",
  icon: "X",
  handler: async (ctx) => {
    if (ctx.activeEdit) {
      ctx.cancelEditing();
    }
  },
}

// Show which rows have errors
{
  id: "showErrors",
  type: "command",
  enabled: true,
  label: "Show errors",
  handler: async (ctx) => {
    if (ctx.errorRowIds.size === 0) {
      console.log("No errors");
      return;
    }
    const errorRows = ctx.allRows.filter((r) => ctx.errorRowIds.has(String(r.id)));
    console.log("Rows with errors:", errorRows.map((r) => r.id));
  },
}

// Start editing the first selected row's "name" column
{
  id: "editName",
  type: "command",
  enabled: true,
  label: "Edit name",
  icon: "Pencil",
  handler: async (ctx) => {
    const row = ctx.selectedRows[0];
    if (!row) return;
    ctx.startEditing(String(row.id), "name", row.name);
  },
}
```

---

### Pagination

| Property | Type | Description |
|----------|------|-------------|
| `pagination` | `{ pageIndex: number; pageSize: number }` | Current zero-based page index and page size. |
| `setPagination` | `React.Dispatch<SetStateAction<{ pageIndex: number; pageSize: number }>>` | Update pagination state. |
| `paginatedTotal` | `number \| undefined` | Server-reported total row count (paginated mode only). |

**Usage examples:**

```ts
// Jump to first page
{
  id: "firstPage",
  type: "command",
  enabled: true,
  label: "First page",
  icon: "ChevronsLeft",
  handler: async (ctx) => {
    ctx.setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  },
}

// Show pagination info
{
  id: "pageInfo",
  type: "command",
  enabled: true,
  label: "Page info",
  handler: async (ctx) => {
    const { pageIndex, pageSize } = ctx.pagination;
    const total = ctx.paginatedTotal ?? "?";
    const start = pageIndex * pageSize + 1;
    const end = Math.min((pageIndex + 1) * pageSize, Number(total));
    console.log(`Showing ${start}–${end} of ${total}`);
  },
}

// Change page size
{
  id: "pageSize100",
  type: "command",
  enabled: true,
  label: "100 per page",
  handler: async (ctx) => {
    ctx.setPagination({ pageIndex: 0, pageSize: 100 });
  },
}
```

---

### Infinite scroll

| Property | Type | Description |
|----------|------|-------------|
| `hasNextPage` | `boolean` | `true` when more pages are available to load. |
| `fetchNextPage` | `() => void` | Load the next page of data. |

**Usage examples:**

```ts
// Load all pages button (use carefully on large datasets)
{
  id: "loadAll",
  type: "command",
  enabled: true,
  label: "Load all",
  icon: "ChevronsDown",
  handler: async (ctx) => {
    while (ctx.hasNextPage && !ctx.isFetchingNextPage) {
      ctx.fetchNextPage();
      // Wait for next page to settle — in practice use a proper polling approach
      await new Promise((r) => setTimeout(r, 500));
    }
  },
}

// Show "load more" button only when there is more data
{
  id: "loadMore",
  type: "command",
  enabled: true,  // conditionally disable instead of hide, to keep layout stable
  disabled: false, // set dynamically if possible via a computed config
  label: "Load more",
  icon: "ChevronDown",
  handler: async (ctx) => {
    if (ctx.hasNextPage) {
      ctx.fetchNextPage();
    }
  },
}
```

---

## Built-in Commands

Built-in commands are dispatched by `id` in `toolbar-renderer.tsx` **before** checking `type`. Their `type` field is only used for TypeScript narrowing.

| `id` | `type` | Default `align` | Behaviour |
|------|--------|-----------------|-----------|
| `search` | `search` | `left` | Debounced input. Client-side (no `action`) or server-side (with `action`). |
| `columnVisibility` | `menu` | `right` | Popover with checkboxes per column. Skips columns with `enableHiding: false`. |
| `density` | `menu` | `right` | Dropdown: `compact`, `normal`, `comfortable`. Calls `ctx.setDensity`. |
| `expandAll` | `command` | `left` | Toggles `table.toggleAllRowsExpanded()`. Label flips between "Expand all" / "Collapse all". |
| `refresh` | `command` | `right` | Calls `ctx.refetch?.()`. Icon spins while `ctx.isRefetching`. Button disabled during refetch. |
| `export` | `command` | `right` | Exports `ctx.rows` to CSV using currently visible column headers. |
| `addRow` | `command` | `right` | Calls `features.addRow.onAddRow()`. Renders `null` if `features.addRow` is not a config object. |

### Enable built-ins in your config

```ts
toolbarCommands: [
  // Built-in search (server-side)
  {
    id: "search",
    type: "search",
    enabled: true,
    action: "root-api",
    queryParamName: "q",
    placeholder: "Search...",
  },
  // Spacer
  { id: "spacer", type: "spacer", enabled: true },
  // Built-in column visibility toggle
  { id: "columnVisibility", type: "menu", enabled: true, label: "Columns", icon: "Columns3", commands: [] },
  // Built-in density picker
  { id: "density",          type: "menu", enabled: true, icon: "AlignJustify", commands: [] },
  // Built-in expand all (tree mode)
  { id: "expandAll",        type: "command", enabled: true },
  // Built-in refresh
  { id: "refresh",          type: "command", enabled: true },
  // Built-in CSV export
  { id: "export",           type: "command", enabled: true, label: "Export" },
  // Built-in add row (needs features.addRow)
  { id: "addRow",           type: "command", enabled: true, label: "Add row" },
]
```

---

## Standalone DataGrid

Pass `toolbarCommands` directly to `<DataGrid>`. Wire async callbacks via props:

| Prop | Type | Description |
|------|------|-------------|
| `toolbarCommands` | `ToolbarCommand[]` | Toolbar commands. `undefined` = no bar. `[]` = empty bar. |
| `toolbarClassName` | `string` | Extra CSS on the toolbar bar element. |
| `onRefresh` | `() => void` | Called by the built-in `refresh` button and `ctx.refetch()`. |
| `onSearch` | `(paramName, query) => void` | Called by server-side search commands. Wire to your own state. |
| `onExecuteNode` | `(nodeId) => Promise<GridRow[]>` | Provides `ctx.executeApiNode`. Not needed in standalone — use `handler` instead. |
| `onAction` | `(actionId, row?) => Promise<void>` | Wired by `ConfiguredTable` for `ActionNode` — not normally set manually. |

```tsx
import { DataGrid } from "@/components/data-grid";
import { stringColumn, numberColumn } from "@/components/data-grid/columns";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export function MyTable() {
  const [filter, setFilter] = useState("");
  const { data = [], refetch, isFetching } = useQuery({
    queryKey: ["users", filter],
    queryFn: () => fetchUsers(filter),
  });

  return (
    <DataGrid
      data={data}
      columns={[stringColumn("name", "Name"), numberColumn("age", "Age")]}
      mode="flat"
      isRefetching={isFetching}
      onRefresh={() => refetch()}
      onSearch={(paramName, query) => setFilter(query)} // wire server-side search
      toolbarCommands={[
        {
          id: "search",
          type: "search",
          enabled: true,
          action: "any",            // truthy → server-side mode
          queryParamName: "q",      // paramName passed to onSearch
          placeholder: "Filter users...",
        },
        { id: "spacer",  type: "spacer",  enabled: true },
        { id: "refresh", type: "command", enabled: true, icon: "RefreshCw" },
        { id: "export",  type: "command", enabled: true, label: "Export", icon: "Download" },
        {
          id: "logSelected",
          type: "command",
          enabled: true,
          label: "Log",
          icon: "Terminal",
          handler: async (ctx) => {
            console.log("Selected:", ctx.selectedRows);
          },
        },
      ]}
      features={{
        sorting: { enabled: true },
        selection: { enabled: true, mode: "multi" },
      }}
    />
  );
}
```

---

## ConfiguredTable

In `ConfiguredTable`, toolbar commands come from two sources merged together:

```
merged = mergeToolbarCommands(config.toolbarCommands, consumerToolbarCommands)
```

| Source | Where defined | Role |
|--------|--------------|------|
| `config.toolbarCommands` | Inside the `DAGTableConfig` file | Default commands for this table |
| `toolbarCommands` prop | At the `<ConfiguredTable>` call site | Override or extend per usage context |

### `config.toolbarCommands` — commands in the config file

Define the table's default toolbar directly in your `DAGTableConfig`:

```ts
// src/features/my-feature/configs/my-table.config.ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

export const myTableConfig: DAGTableConfig = {
  tableId: "my-table",
  mode: "infinite",

  dag: {
    nodes: [
      {
        id: "root-api",
        type: "api",
        config: {
          url: "/api/items/search",
          method: "GET",
          authAdapterId: "wafdata",
          queryParams: {
            // searchStr param is injected by the search toolbar command
            $search: '$:$params.searchStr ?? ""',
            $top:    "50",
            $skip:   '$:$exists($params.cursor) ? $params.cursor : "0"',
          },
          paginationConfig: { type: "offset", pageParam: "$skip", pageSizeParam: "$top" },
        },
      },
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name",  header: "Name",  sortable: true, filterable: true },
            { field: "state", header: "State", renderType: "badge" },
            { field: "owner", header: "Owner" },
          ],
        },
      },
    ],
    edges: [{ from: "root-api", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    sorting:           { enabled: true },
    filtering:         { enabled: true },
    columnResizing:    { enabled: true },
    columnVisibility:  { enabled: true },
    selection:         { enabled: true, mode: "multi" },
  },

  toolbarCommands: [
    {
      id: "search",
      type: "search",
      enabled: true,
      action: "root-api",          // truthy → server-side mode
      queryParamName: "searchStr", // becomes $params.searchStr in DAG
      placeholder: "Search items...",
      debounceMs: 400,
    },
    { id: "spacer", type: "spacer", enabled: true },
    { id: "columnVisibility", type: "menu",    enabled: true, label: "Columns", icon: "Columns3", commands: [] },
    { id: "density",          type: "menu",    enabled: true, icon: "AlignJustify", commands: [] },
    { id: "refresh",          type: "command", enabled: true, icon: "RefreshCw" },
    { id: "export",           type: "command", enabled: true, label: "Export", icon: "Download" },
    {
      id: "actions",
      type: "menu",
      enabled: true,
      label: "Actions",
      icon: "Settings",
      align: "right",
      commands: [
        {
          id: "approve",
          type: "command",
          label: "Approve selected",
          icon: "CheckCircle",
          handler: async (ctx) => {
            if (ctx.selectedRows.length === 0) return;
            for (const row of ctx.selectedRows) {
              await ctx.executeApiNode("approve-api");
            }
            ctx.refetch?.();
          },
        },
      ],
    },
  ],
};
```

**Use it:**

```tsx
<ConfiguredTable config={myTableConfig} className="h-full" />
```

---

### `toolbarCommands` prop — consumer overrides

Override or extend config commands at the call site without editing the config file:

```tsx
// Override: disable the search bar for this specific use
<ConfiguredTable
  config={myTableConfig}
  toolbarCommands={[
    { id: "search", type: "search", enabled: false },
  ]}
/>

// Extend: add a custom button that doesn't belong in the shared config
<ConfiguredTable
  config={myTableConfig}
  toolbarCommands={[
    {
      id: "openPanel",
      type: "command",
      enabled: true,
      label: "Open panel",
      icon: "SidebarOpen",
      handler: async (ctx) => {
        // ctx.selectedRows is available
        openDetailPanel(ctx.selectedRows[0]);
      },
    },
  ]}
/>
```

---

## Merging Toolbar Commands

`mergeToolbarCommands(base, overrides)` — applied automatically inside `ConfiguredTable`.

| Rule | Behaviour |
|------|-----------|
| Override `id` matches a base entry | Override **fully replaces** that entry. No partial merge — provide all fields you need. |
| Override `id` is new | Appended after all base entries, in the order they appear in overrides. |
| Overrides is `undefined` or `[]` | Base returned unchanged. |

```ts
import { mergeToolbarCommands } from "@/components/data-grid/toolbar/merge-toolbar-commands";

const base = [
  { id: "search",  type: "search",  enabled: true, queryParamName: "q", action: "root-api" },
  { id: "spacer",  type: "spacer",  enabled: true },
  { id: "refresh", type: "command", enabled: true, icon: "RefreshCw" },
  { id: "export",  type: "command", enabled: true, label: "Export" },
];

const overrides = [
  // Replace: override the search command entirely (disable it)
  { id: "search", type: "search", enabled: false },
  // New: append a custom button after all base commands
  { id: "myBtn",  type: "command", enabled: true, label: "Custom", icon: "Zap",
    handler: async (ctx) => { console.log(ctx.rows); } },
];

const merged = mergeToolbarCommands(base, overrides);
// Result (in order):
// { id: "search",  type: "search",  enabled: false }     ← replaced
// { id: "spacer",  type: "spacer",  enabled: true }      ← unchanged
// { id: "refresh", type: "command", enabled: true, ... } ← unchanged
// { id: "export",  type: "command", enabled: true, ... } ← unchanged
// { id: "myBtn",   type: "command", enabled: true, ... } ← appended
```

---

## Icons

`icon` accepts a **React component** or a **lucide-react icon name string**. Both work in every command type.

```ts
import { Download } from "lucide-react";

// Option A — component reference (type-safe, import required)
{ id: "export", type: "command", enabled: true, icon: Download }

// Option B — string name (resolved at render via resolveLucideIcon())
{ id: "export", type: "command", enabled: true, icon: "Download" }
```

String icon names are resolved by `toolbar/icon-resolver.ts` against the bundled lucide-react icon set. Unknown names fall back to `AlertCircle`. Always use the exact **PascalCase** lucide name.

**Common icons used in toolbar commands:**

| Icon name | Use case |
|-----------|----------|
| `"Download"` | Export |
| `"RefreshCw"` | Refresh |
| `"Columns3"` | Column visibility |
| `"AlignJustify"` | Density |
| `"ChevronsUpDown"` | Expand/collapse |
| `"ChevronsDownUp"` | Expand/collapse (alternate) |
| `"Settings"` | Actions menu |
| `"Search"` | Search (automatic in `search` type) |
| `"Plus"` | Add row |
| `"Trash2"` | Delete |
| `"CheckCircle"` | Approve/confirm |
| `"X"` | Clear/cancel |
| `"Pencil"` | Edit |
| `"Eye"` | Preview |
| `"Upload"` | Import |
| `"Zap"` | Quick action |
| `"SidebarOpen"` | Open panel |
| `"BarChart2"` | Analytics |
| `"Terminal"` | Debug/log |

---

## Server-side Search (full flow)

Server-side search wires the toolbar search input to a React Query key change, triggering a new API fetch on each debounced keystroke.

**Step-by-step:**

```
User types "eng"
  → CommandSearch debounces 400ms
  → ctx.onSearch("searchStr", "eng")
  → ConfiguredTable.handleSearch("searchStr", "eng")
  → setSearchParams({ searchStr: "eng" })
  → searchParams merged into params: { ...params, searchStr: "eng" }
  → useDAGTable receives new params → React Query key changes
  → API node re-executes with $params.searchStr = "eng"
  → New data loaded into grid
```

**Config wiring:**

```ts
export const searchTableConfig: DAGTableConfig = {
  tableId: "my-search-table",
  mode: "infinite",

  dag: {
    nodes: [
      {
        id: "root-api",
        type: "api",
        config: {
          url: "/api/items/search",
          method: "GET",
          authAdapterId: "wafdata",
          queryParams: {
            // queryParamName must match the key used here ($params.<queryParamName>)
            $search:  '$:$params.searchStr ?? ""',
            $top:     "50",
            $skip:    '$:$exists($params.cursor) ? $params.cursor : "0"',
          },
          paginationConfig: { type: "offset", pageParam: "$skip", pageSizeParam: "$top" },
          responseTransform: `member.{ "id": id, "name": name, "type": type }`,
        },
      },
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true, filterable: true },
            { field: "type", header: "Type" },
          ],
        },
      },
    ],
    edges: [{ from: "root-api", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    sorting:  { enabled: true },
    filtering: { enabled: true },
  },

  toolbarCommands: [
    {
      id: "search",
      type: "search",
      enabled: true,
      action: "root-api",          // any truthy string → server-side mode
      queryParamName: "searchStr", // must match $params key in queryParams above
      placeholder: "Search by name or type...",
      debounceMs: 400,
    },
    { id: "spacer",  type: "spacer",  enabled: true },
    { id: "refresh", type: "command", enabled: true, icon: "RefreshCw" },
    { id: "export",  type: "command", enabled: true, label: "Export", icon: "Download" },
  ],
};
```

**Multiple independent search params** — each `queryParamName` is stored separately:

```ts
toolbarCommands: [
  {
    id: "nameSearch",
    type: "search",
    enabled: true,
    action: "root-api",
    queryParamName: "nameFilter",   // → $params.nameFilter
    placeholder: "Search by name...",
  },
  {
    id: "ownerSearch",
    type: "search",
    enabled: true,
    action: "root-api",
    queryParamName: "ownerFilter",  // → $params.ownerFilter (independent)
    placeholder: "Search by owner...",
  },
]
```

---

## Real-world Config Examples

These are complete, runnable `DAGTableConfig` objects showing toolbar in realistic scenarios.

---

### 1. Infinite scroll table with server-side search

Mirrors `engSearchConfig` — search, column controls, refresh, export, and an actions dropdown.

```ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

export const engSearchConfig: DAGTableConfig = {
  tableId: "eng-search",
  mode: "infinite",

  dag: {
    nodes: [
      {
        id: "root-api",
        type: "api",
        config: {
          url: "/resources/v1/modeler/dseng/dseng:EngItem/search",
          method: "GET",
          authAdapterId: "wafdata",
          queryParams: {
            $searchStr: '$:$params.searchStr ?? ""',
            $top:       "50",
            $skip:      '$:$exists($params.cursor) ? $params.cursor : "0"',
            $mask:      "dskern:Mask.Default",
          },
          paginationConfig: { type: "offset", pageParam: "$skip", pageSizeParam: "$top" },
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          responseTransform: `
            member.{
              "id": id, "name": name, "title": title, "type": type,
              "revision": revision, "state": state, "owner": owner,
              "organization": organization, "collabspace": collabspace,
              "created": created, "modified": modified
            }
          `,
        },
      },
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name",         header: "Name",         sortable: true, filterable: true },
            { field: "title",        header: "Title",        sortable: true, filterable: true },
            { field: "type",         header: "Type" },
            { field: "revision",     header: "Rev" },
            { field: "state",        header: "State",        renderType: "badge" },
            { field: "owner",        header: "Owner" },
            { field: "organization", header: "Organization" },
            { field: "collabspace",  header: "Collab Space" },
            { field: "created",      header: "Created",      type: "date" },
            { field: "modified",     header: "Modified",     type: "date" },
          ],
        },
      },
    ],
    edges: [{ from: "root-api", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    sorting:          { enabled: true },
    filtering:        { enabled: true },
    columnResizing:   { enabled: true },
    columnVisibility: { enabled: true },
    selection:        { enabled: true, mode: "multi" },
  },

  toolbarCommands: [
    {
      id: "search",
      type: "search",
      enabled: true,
      action: "root-api",          // server-side mode
      queryParamName: "searchStr",
      placeholder: "Search by name, description...",
      debounceMs: 400,
    },
    { id: "spacer",           type: "spacer",  enabled: true },
    { id: "columnVisibility", type: "menu",    enabled: true, label: "Columns", icon: "Columns3", commands: [] },
    { id: "density",          type: "menu",    enabled: true, icon: "AlignJustify", commands: [] },
    { id: "refresh",          type: "command", enabled: true, icon: "RefreshCw" },
    { id: "export",           type: "command", enabled: true, label: "Export", icon: "Download" },
    {
      id: "menu",
      type: "menu",
      enabled: true,
      label: "Actions",
      icon: "Settings",
      align: "right",
      commands: [
        // Add action items here as your API grows
      ],
    },
  ],
};
```

---

### 2. Tree table with expand-all toolbar command

Mirrors `engExpandConfig` — a custom command that calls a "deep expand" API node and replaces the grid rows.

```ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

const EXPAND_URL = '$:"/resources/v1/modeler/dseng/dseng:EngItem/" & $params.nodeId & "/expand"';

const TREE_RESPONSE_TRANSFORM = `(
  $members := member;
  $refs     := $members[type = "VPMReference"];
  $insts    := $members[type = "VPMInstance"];
  $paths    := $map($members[$exists(Path)], function($m) { $m.Path });
  $refMap   := $refs{ id: $ };
  $instMap  := $insts{ id: $ };

  $relations := $reduce($paths, function($acc, $path) {
    $append($acc, $filter($map($path, function($v, $i, $a) {
      $i % 2 = 0 and $i + 2 < $count($a)
        ? { "parentId": $a[$i], "instId": $a[$i + 1], "childId": $a[$i + 2] }
    }), function($x) { $exists($x) }))
  }, []);

  $buildTree := function($nodeId) {(
    $node     := $lookup($refMap, $nodeId);
    $childIds := $distinct($relations[parentId = $nodeId].childId);
    $instIds  := $distinct($relations[childId  = $nodeId].instId);
    $merge([$node, {
      "instances": [ $map($instIds,  function($id) { $lookup($instMap, $id) }) ],
      "children":  [ $map($childIds, function($id) { $buildTree($id) }) ]
    }])
  )};

  $buildTree($paths[0][0])
)`;

export const engExpandConfig: DAGTableConfig = {
  tableId: "eng-expand",
  mode: "tree",

  dag: {
    nodes: [
      // Initial wave: load root level
      {
        id: "root-api",
        type: "api",
        config: {
          url: EXPAND_URL,
          method: "POST",
          authAdapterId: "wafdata",
          body: { expandDepth: 1, withPath: true },
          responseTransform: TREE_RESPONSE_TRANSFORM,
          headers: { "Content-Type": "application/json", Accept: "application/json" },
        },
      },
      // Lazy row expand: fires child-expand-api when a row is opened
      {
        id: "row-expand",
        type: "rowExpand",
        config: {
          triggerOnExpand:  true,
          childApiNodeId:   "child-expand-api",
          childKeyExpr:     "$:$row.id",
          childQueryParam:  "nodeId",
          maxDepth:         10,
        },
      },
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name",     header: "Name",   sortable: true, filterable: true },
            { field: "title",    header: "Title",  sortable: true, filterable: true },
            { field: "type",     header: "Type" },
            { field: "revision", header: "Rev" },
            { field: "state",    header: "State",  renderType: "badge" },
            { field: "owner",    header: "Owner" },
            { field: "created",  header: "Created", type: "date" },
            { field: "modified", header: "Modified", type: "date" },
          ],
        },
      },
      // Lazy child expand API (same URL, depth 1)
      {
        id: "child-expand-api",
        type: "api",
        config: {
          url: EXPAND_URL,
          method: "POST",
          authAdapterId: "wafdata",
          body: { expandDepth: 1, withPath: true },
          responseTransform: TREE_RESPONSE_TRANSFORM,
          headers: { "Content-Type": "application/json", Accept: "application/json" },
        },
      },
      // Toolbar action node: expand ALL levels at once
      {
        id: "expand-all-api",
        type: "api",
        config: {
          url: '$:"/resources/v1/modeler/dseng/dseng:EngItem/" & $params.nodeId & "/expand"',
          method: "POST",
          authAdapterId: "wafdata",
          body: { expandDepth: -1, withPath: true },  // -1 = all levels
          responseTransform: TREE_RESPONSE_TRANSFORM,
          headers: { "Content-Type": "application/json", Accept: "application/json" },
        },
      },
    ],
    edges: [
      { from: "root-api",   to: "row-expand" },
      { from: "row-expand", to: "columns" },
    ],
    rootNodeId: "columns",
  },

  features: {
    sorting:          { enabled: true },
    filtering:        { enabled: true },
    columnResizing:   { enabled: true },
    columnVisibility: { enabled: true },
    selection:        { enabled: true, mode: "multi" },
  },

  toolbarCommands: [
    {
      id: "expand-all",
      type: "command",
      enabled: true,
      label: "Expand/Collapse",
      icon: "ChevronsDownUp",
      handler: async (ctx) => {
        const isExpanded = ctx.table.getIsAllRowsExpanded();
        if (isExpanded) {
          // Collapse: use built-in TanStack toggle — no API call needed
          ctx.table.toggleAllRowsExpanded(false);
        } else {
          // Expand all: fetch the full recursive tree from the API
          const result = await ctx.executeApiNode("expand-all-api");
          const treeRows = result[0]?.children ?? [];
          if (treeRows.length > 0) {
            ctx.setRows(result);                      // replace grid with fully expanded tree
            ctx.table.toggleAllRowsExpanded(true);    // visually expand all nodes
          }
        }
      },
    },
    { id: "spacer",           type: "spacer",  enabled: true },
    { id: "columnVisibility", type: "menu",    enabled: true, label: "Columns", icon: "Columns3", commands: [] },
    { id: "density",          type: "menu",    enabled: true, icon: "AlignJustify", commands: [] },
    { id: "refresh",          type: "command", enabled: true, icon: "RefreshCw" },
    { id: "export",           type: "command", enabled: true, label: "Export", icon: "Download" },
  ],
};
```

**Render it** (with runtime params so the DAG knows which node to expand):

```tsx
<ConfiguredTable
  config={engExpandConfig}
  params={{ nodeId: selectedNodeId }}
  className="h-full"
/>
```

---

### 3. Flat table with client-side search and addRow

```ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

export const usersTableConfig: DAGTableConfig = {
  tableId: "users-flat",
  mode: "flat",

  dag: {
    nodes: [
      {
        id: "users-api",
        type: "api",
        config: {
          url: "/api/users",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `$.{ "id": id, "name": name, "email": email, "role": role }`,
        },
      },
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name",  header: "Name",  sortable: true, filterable: true },
            { field: "email", header: "Email", sortable: true, filterable: true },
            { field: "role",  header: "Role",  renderType: "badge" },
          ],
        },
      },
    ],
    edges: [{ from: "users-api", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    sorting:   { enabled: true },
    filtering: { enabled: true },
    selection: { enabled: true, mode: "multi" },
    addRow:    { onAddRow: () => { /* open a create modal */ } },
  },

  toolbarCommands: [
    // Client-side search (no action → filters in-memory)
    { id: "search",  type: "search",  enabled: true, placeholder: "Search users..." },
    { id: "spacer",  type: "spacer",  enabled: true },
    { id: "refresh", type: "command", enabled: true, icon: "RefreshCw" },
    { id: "export",  type: "command", enabled: true, label: "Export", icon: "Download" },
    // Built-in addRow button — calls features.addRow.onAddRow()
    { id: "addRow",  type: "command", enabled: true, label: "Add user", icon: "Plus" },
  ],
};
```

---

### 4. Consumer toolbar override at call site

Override built-in commands and add a context-specific action without editing the shared config:

```tsx
import { engSearchConfig } from "@/features/xen/configs/eng-search.config";

function MyPage() {
  const [panelOpen, setPanelOpen] = useState(false);
  const [selected, setSelected] = useState<GridRow[]>([]);

  return (
    <ConfiguredTable
      config={engSearchConfig}
      toolbarCommands={[
        // Disable the built-in export (not needed here)
        { id: "export", type: "command", enabled: false },

        // Add a custom "Open panel" button — appended after all config commands
        {
          id: "openPanel",
          type: "command",
          enabled: true,
          label: "Open panel",
          icon: "SidebarOpen",
          handler: async (ctx) => {
            setSelected(ctx.selectedRows);
            setPanelOpen(true);
          },
        },
      ]}
    />
  );
}
```

---

## See Also

- [API Reference](../07-api-reference.md) — `DataGrid` and `ConfiguredTable` prop tables
- [Config API Reference](config-api-reference.md) — Full `DAGTableConfig` schema
- [Config Basics](config-basics.md) — When to use config vs raw props
- Source files:
  - `src/components/data-grid/toolbar/toolbar.types.ts` — all TypeScript interfaces
  - `src/components/data-grid/toolbar/toolbar-defaults.ts` — `TOOLBAR_DEFAULTS` and `DEFAULT_*` constants
  - `src/components/data-grid/toolbar/toolbar-renderer.tsx` — built-in command render logic
  - `src/components/data-grid/toolbar/merge-toolbar-commands.ts` — merge algorithm
  - `src/features/xen/configs/eng-search.config.ts` — real infinite search example
  - `src/features/xen/configs/eng-expand.config.ts` — real tree expand-all example
