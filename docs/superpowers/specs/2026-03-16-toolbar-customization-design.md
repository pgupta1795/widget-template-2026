# Toolbar Customization System — Design Spec

**Date:** 2026-03-16 | **Status:** Approved | **Branch:** tanstack-table-ui

---

## Overview

Replace the hardcoded `DataGridToolbar` with a flat, composable `toolbarCommands` prop system. Commands are explicit, opt-in (`enabled: false` by default), and fully customizable via `className` at every level. The system works on both standalone `DataGrid` and the DAG-driven `ConfiguredTable`.

The existing `slots.toolbarLeft/toolbarRight/toolbar` APIs are removed. `SelectionActionBar` and `ActiveFiltersBadge` remain static built-ins rendered by `data-grid-toolbar.tsx`, unaffected by this system.

---

## Core Types

```typescript
// src/components/data-grid/toolbar/toolbar.types.ts

type ToolbarCommandType = 'command' | 'menu' | 'search' | 'spacer' | 'separator'
type Align = 'left' | 'right'

interface ToolbarCommand {
  id: string
  type: ToolbarCommandType
  enabled?: boolean                    // default: false — explicit opt-in required
  align?: Align                        // default: 'left'
  label?: string
  // Component reference OR lucide icon name string (resolved via resolveLucideIcon at render)
  icon?: React.ComponentType<{ className?: string }> | string
  className?: string                   // applied to button/trigger/input element
  disabled?: boolean                   // static disabled state

  // type: 'command'
  handler?: (ctx: ToolbarContext, params?: Record<string, unknown>) => Promise<void>
  handlerParams?: Record<string, unknown>  // static params passed to handler as second arg

  // type: 'menu'
  commands?: ToolbarCommand[]          // flat sub-commands only — NO nesting within sub-commands
  menuClassName?: string               // DropdownMenuContent className

  // type: 'search'
  apiNodeId?: string                   // set → server-side; omit → client-side globalFilter
  queryParamName?: string              // query param key, e.g. 'q' (server-side only)
  debounceMs?: number                  // default: 300
  placeholder?: string
  inputClassName?: string              // Input element className
}
```

**Nesting depth:** `menu` commands support one level only. Items inside `commands[]` are always rendered as flat `DropdownMenuItem` — they cannot themselves be `type:'menu'`.

**`separator`** renders `<Separator orientation="vertical" className="h-4 mx-1" />`.
**`spacer`** renders `<div className="flex-1" />`.
Both ignore all other fields.

---

## ToolbarContext

```typescript
interface ToolbarContext {
  // Full TanStack Table instance — sorting, filtering, visibility, pagination, all state
  table: Table<GridRow>

  // Convenience row accessors
  rows: GridRow[]              // filtered/visible rows (getFilteredRowModel)
  allRows: GridRow[]           // all rows unfiltered (getCoreRowModel)
  selectedRows: GridRow[]      // currently selected rows

  // Grid state + setters
  globalFilter: string
  setGlobalFilter: (value: string) => void
  density: GridDensity
  setDensity: (d: GridDensity) => void

  // Async state
  isRefetching: boolean        // true while data is refetching (for spinner on refresh button)

  // Action execution — fires a DAG ActionDef by id; no-op if onAction not wired
  executeApiNode: (actionId: string) => Promise<void>

  // Data refetch (maps to onRefresh)
  refetch?: () => void

  // Tree operations
  expandRow?: (row: GridRow) => Promise<void>   // lazy-expand a single tree row
  collapseAll?: () => void                       // collapse all expanded rows

  // Server-side search relay — called by command-search with (paramName, query)
  // paramName comes from command.queryParamName (default: 'q')
  onSearch?: (paramName: string, query: string) => void

  // Mode & features (read-only)
  mode?: GridMode
  features?: GridFeaturesConfig
}
```

### Notes on `executeApiNode`

`executeApiNode` is a wrapper around the `onAction` prop passed to `DataGrid`. It fires a DAG `ActionDef` by its `id`. The DAG `onAction` from `useDAGTable` has signature `(actionId: string, row?: GridRow) => Promise<void>` — at the toolbar level there is no row context, so `row` is always `undefined`.

When `DataGrid` is used standalone (no DAG), `executeApiNode` is a no-op — handlers that call it simply resolve immediately without error.

### Server-Side Search

Server-side search does **not** use `executeApiNode`. It uses a dedicated `onSearch?` callback on `DataGrid`:

```typescript
onSearch?: (query: string) => void
```

When `apiNodeId` is set on a `search` command, `command-search.tsx` reads `ctx.onSearch` from `ToolbarContext`. It debounces user input then calls `ctx.onSearch(command.queryParamName ?? 'q', value)` — the `globalFilter` is **not** set. When cleared, `ctx.onSearch(paramName, "")` resets the query.

`command-search.tsx` calls `ctx.onSearch` with the **param name** so that the receiver can store it under the right key. The conventional default key is `'q'` — API node configs that support server-side search should expect `$params.q` (or whatever `queryParamName` is set to) in their `queryParams`.

`DataGridContextValue.onSearch` is forwarded from `DataGridProps.onSearch` through `useDataGrid` into context — the same threading as `executeApiNode`. `ToolbarContext.onSearch` mirrors this field.

**`ConfiguredTable` owns `searchQuery` state internally** — no new prop is required:
```typescript
// inside ConfiguredTable (no new prop needed on ConfiguredTableProps)
const [searchParams, setSearchParams] = useState<Record<string, string>>({})
// onSearch updates the key matching the param name
const handleSearch = useCallback((paramName: string, query: string) => {
  setSearchParams(prev => query ? { ...prev, [paramName]: query } : omit(prev, paramName))
}, [])
const dagResult = useDAGTable(config, engine, { ...params, ...searchParams })
<DataGrid ... onSearch={handleSearch} />
```
`searchParams` is merged into `useDAGTable`'s `params` → included in React Query queryKey → triggers refetch with the search value.

When `apiNodeId` is omitted, `ctx.setGlobalFilter(value)` is called — standard client-side TanStack Table filtering.

---

## DataGrid Props

```typescript
interface DataGridProps<TData extends GridRow> {
  // ...existing props unchanged...
  toolbarCommands?: ToolbarCommand[]    // undefined = no toolbar bar rendered at all
  toolbarClassName?: string             // classes the toolbar bar element only (not SelectionActionBar)
  onAction?: (actionId: string, row?: GridRow) => Promise<void>   // matches useDAGTable return type
  // Server-side search callback. paramName = command.queryParamName (default: 'q')
  onSearch?: (paramName: string, query: string) => void
}
```

`toolbarCommands` undefined → no toolbar renders.
`toolbarCommands={[]}` → toolbar bar renders (height preserved), no commands visible.

---

## DataGrid Context Additions

```typescript
// data-grid-context.tsx additions
interface DataGridContextValue {
  // ...existing fields...
  toolbarCommands?: ToolbarCommand[]
  toolbarClassName?: string
  // Derived from onAction prop — always present (no-op if onAction not provided)
  executeApiNode: (actionId: string) => Promise<void>
  // Forwarded from DataGridProps.onSearch — undefined when not wired
  onSearch?: (paramName: string, query: string) => void
}
```

**Threading path for `executeApiNode`:**
1. `DataGridProps.onAction?` is passed into `useDataGrid(props)` (the hook that builds `DataGridContextValue`)
2. `useDataGrid` constructs `executeApiNode` as:
   ```typescript
   const executeApiNode = useCallback(
     (actionId: string) => props.onAction?.(actionId, undefined) ?? Promise.resolve(),
     [props.onAction]
   )
   ```
3. `executeApiNode` is stored in `DataGridContextValue` and consumed by `ToolbarRenderer` when building `ToolbarContext`

`isRefetching` is already in `DataGridContextValue` — no change needed.

**Threading path for `onSearch`:**
1. `DataGridProps.onSearch?` passes through `useDataGrid` into `DataGridContextValue.onSearch`
2. `command-search.tsx` reads `onSearch` from `DataGridContext` and calls it on debounced input when `apiNodeId` is set
3. In `ConfiguredTable`, `onSearch` is wired to local `searchQuery` state:
   ```typescript
   const [searchQuery, setSearchQuery] = useState('')
   // searchQuery fed into useDAGTable params → included in React Query queryKey → triggers refetch
   const dagResult = useDAGTable(
     config,
     engine,
     { ...params, ...(searchQuery ? { q: searchQuery } : {}) }
   )
   // ...
   <DataGrid ... onSearch={setSearchQuery} />
   ```
   `ConfiguredTable` owns `searchQuery` state. `DataGrid` is stateless with respect to server-side search — it only relays the value via `onSearch`.

---

## Folder Structure

```
src/components/data-grid/
├── toolbar/
│   ├── toolbar.types.ts        # ToolbarCommand, ToolbarContext types
│   ├── toolbar-defaults.ts     # Named exports + TOOLBAR_DEFAULTS array
│   ├── toolbar-renderer.tsx    # <ToolbarRenderer> — main component, builds ToolbarContext
│   ├── command-button.tsx      # Renders type:'command'
│   ├── command-menu.tsx        # Renders type:'menu'
│   ├── command-search.tsx      # Renders type:'search' (debounced)
│   ├── icon-resolver.ts        # resolveLucideIcon(name: string) → ComponentType
│   └── index.ts                # Barrel
│
├── data-grid-toolbar.tsx       # Slimmed: SelectionActionBar + ActiveFiltersBadge + ToolbarRenderer
├── data-grid.tsx               # +toolbarCommands, +toolbarClassName, +onAction, +onSearch props
├── data-grid-context.tsx       # +toolbarCommands, +toolbarClassName, +executeApiNode, +onSearch
└── types/
    └── slot-types.ts           # Remove toolbar/toolbarLeft/toolbarRight — keep rest
```

### Modified Files Summary

| File | Change |
|---|---|
| `data-grid.tsx` | Add `toolbarCommands?`, `toolbarClassName?`, `onAction?`, `onSearch?` props |
| `data-grid-context.tsx` | Add `toolbarCommands?`, `toolbarClassName?`, `executeApiNode`, `onSearch?` |
| `types/slot-types.ts` | Remove `toolbar`, `toolbarLeft`, `toolbarRight` fields |
| `table-engine/configured-table.tsx` | Convert `toolbarActions` → `ToolbarCommand[]`; add `toolbarCommands?`, `toolbarClassName?` props; wire `onAction`, `onSearch` |

---

## Default Commands

All defaults ship with `enabled: false`. Consumers opt in explicitly.

```typescript
// toolbar/toolbar-defaults.ts

export const DEFAULT_SEARCH: ToolbarCommand = {
  id: 'search', type: 'search', enabled: false, align: 'left',
  placeholder: 'Search...', debounceMs: 300,
}
export const DEFAULT_COLUMN_VISIBILITY: ToolbarCommand = {
  id: 'columnVisibility', type: 'menu', enabled: false, align: 'right',
  label: 'Columns', icon: 'Columns3',
}
export const DEFAULT_DENSITY: ToolbarCommand = {
  id: 'density', type: 'menu', enabled: false, align: 'right',
  icon: 'AlignJustify',
}
export const DEFAULT_EXPAND_ALL: ToolbarCommand = {
  id: 'expandAll', type: 'command', enabled: false, align: 'left',
  icon: 'ChevronsUpDown',
  // label computed at render time: "Expand all" or "Collapse all" based on table state
}
export const DEFAULT_REFRESH: ToolbarCommand = {
  id: 'refresh', type: 'command', enabled: false, align: 'right',
  icon: 'RefreshCw',
  // button disables and icon spins while isRefetching
}
export const DEFAULT_EXPORT: ToolbarCommand = {
  id: 'export', type: 'command', enabled: false, align: 'right',
  label: 'Export', icon: 'Download',
}
export const DEFAULT_ADD_ROW: ToolbarCommand = {
  id: 'addRow', type: 'command', enabled: false, align: 'right',
  label: 'Add row', icon: 'Plus',
  // handler guards: typeof features.addRow === 'object' before accessing .onAddRow
  // renders nothing if features.addRow is falsy or a bare boolean true
}

// Canonical order: search on left, spacer, then right-side controls
export const TOOLBAR_DEFAULTS: ToolbarCommand[] = [
  DEFAULT_SEARCH,
  { id: 'spacer', type: 'spacer', enabled: false },
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_DENSITY,
  DEFAULT_EXPAND_ALL,
  DEFAULT_REFRESH,
  DEFAULT_EXPORT,
  DEFAULT_ADD_ROW,
]
```

**Usage pattern:**
```typescript
toolbarCommands={[
  { ...DEFAULT_SEARCH,            enabled: true, placeholder: 'Find records...' },
  { ...DEFAULT_EXPORT,            enabled: true, className: 'text-primary' },
  { id: 'spacer', type: 'spacer', enabled: true },
  { ...DEFAULT_COLUMN_VISIBILITY, enabled: true },
]}
```

---

## Built-in Command Behaviour

| ID | Notes |
|---|---|
| `search` | Client-side: `setGlobalFilter`. Server-side: `onSearch(value)` when `apiNodeId` set |
| `columnVisibility` | Renders toggle list of hideable columns (existing `ColumnVisibilityToggle` logic) |
| `density` | Renders compact/normal/comfortable options (existing `DensityControl` logic) |
| `expandAll` | Toggle: label = "Expand all" / "Collapse all" based on `table.getIsAllRowsExpanded()` |
| `refresh` | Calls `ctx.refetch()`. Button disabled + icon spins while `ctx.isRefetching` |
| `export` | Exports filtered rows to CSV (existing `exportToCsv` logic) |
| `addRow` | Calls `(ctx.features?.addRow as AddRowFeatureConfig)?.onAddRow?.()`. Renders nothing if `features.addRow` is falsy or `true` (boolean). Guard: `typeof features.addRow === 'object'` |

`disabledExpr` from DAG `ActionDef` is **ignored** during conversion — toolbar commands have no per-row context. Consumers who need conditional disabling should supply a `disabled: boolean` or override the handler.

---

## Rendering

`ToolbarRenderer` (inside `toolbar-renderer.tsx`):
1. Filters commands to `enabled: true` only
2. Splits into `left` and `right` groups (default: `left`); renders spacers at their position
3. Left group renders left-to-right; right group renders left-to-right

```
[left commands...] [spacers in-order] [right commands...]
```

Renders as a `div` with the glassmorphism toolbar style:
```
sticky top-0 z-10 flex h-12 items-center gap-2 border-b border-border/60
bg-background/80 px-3 backdrop-blur-md
```
`toolbarClassName` is merged onto this element only — not onto the `SelectionActionBar` wrapper.

**Per-type rendering:**
- `command` → `<Button variant="ghost" size="sm" className="h-8 gap-1.5">` + optional icon + label
- `menu` → `<DropdownMenu>` trigger + flat `DropdownMenuItem` list (1 level only)
- `search` → `<Input>` with leading Search icon and clear button; debounced
- `separator` → `<Separator orientation="vertical" className="h-4 mx-1" />`
- `spacer` → `<div className="flex-1" />`
- Icons: `h-3.5 w-3.5`; string icons resolved via `resolveLucideIcon()`

**Async command handlers:** While a handler is executing, its button is disabled. Errors thrown by handlers propagate to the caller — no built-in toast/alert. Consumers handle error display in their own handler.

`data-grid-toolbar.tsx` becomes:
```tsx
export const DataGridToolbar = memo(function DataGridToolbar() {
  const { toolbarCommands, toolbarClassName } = useDataGridContext()
  return (
    <div>
      <SelectionActionBar />
      <ActiveFiltersBadge />
      {toolbarCommands !== undefined && (
        <ToolbarRenderer commands={toolbarCommands} className={toolbarClassName} />
      )}
    </div>
  )
})
```

---

## ToolbarContext Construction

`ToolbarRenderer` builds `ToolbarContext` from `DataGridContextValue` before invoking handlers:

```typescript
const ctx: ToolbarContext = {
  table,
  rows: table.getFilteredRowModel().rows.map(r => r.original as GridRow),
  allRows: table.getCoreRowModel().rows.map(r => r.original as GridRow),
  selectedRows: table.getSelectedRowModel().rows.map(r => r.original as GridRow),
  globalFilter,
  setGlobalFilter,
  density,
  setDensity,
  isRefetching,
  executeApiNode,                                         // no-op if onAction not wired
  refetch: onRefresh,
  expandRow: (row) => handleExpand(row as Row<GridRow>),
  collapseAll: () => table.toggleAllRowsExpanded(false),
  onSearch,            // forwarded from DataGridContextValue.onSearch
  mode,
  features,
}
```

---

## `mergeToolbarCommands` Utility

```typescript
function mergeToolbarCommands(
  base: ToolbarCommand[],
  overrides?: ToolbarCommand[]
): ToolbarCommand[]
```

**Rules:**
1. Start with a copy of `base` in original order
2. For each item in `overrides`: if an item with the same `id` exists in base, **replace** the base entry entirely (no field merging — the override object wins completely)
3. Override items whose `id` is not in `base` are **appended** after all base items (in the order they appear in `overrides`)
4. If `overrides` is `undefined` or empty, return `base` unchanged

Consumers who want partial field changes must spread explicitly:
```typescript
mergeToolbarCommands(dagCommands, [
  { ...DEFAULT_SEARCH, enabled: true, placeholder: 'Custom...' }
])
```

---

## DAG / ConfiguredTable Integration

`ConfiguredTable` gains `toolbarCommands?` and `toolbarClassName?` props:

```typescript
interface ConfiguredTableProps {
  config: DAGTableConfig
  className?: string
  params?: Record<string, JsonPrimitive>
  toolbarCommands?: ToolbarCommand[]   // extends/overrides DAG toolbar actions
  toolbarClassName?: string
}
```

**Conversion of DAG `toolbarActions`:**
```typescript
const dagToolbarCommands = useMemo<ToolbarCommand[]>(() =>
  toolbarActions.map(action => ({
    id: action.id,
    type: 'command' as const,
    enabled: true,
    label: action.label,
    icon: action.icon,                         // string → resolved at render time
    handler: async (ctx) => ctx.executeApiNode(action.id),
  })),
  [toolbarActions]
)

// Consumer overrides DAG commands by matching id; new ids appended
const merged = mergeToolbarCommands(dagToolbarCommands, props.toolbarCommands)
```

**`onSearch` wiring in `ConfiguredTable`** — uses `Record<string, string>` keyed by `paramName` to support arbitrary `queryParamName` values:
```typescript
const [searchParams, setSearchParams] = useState<Record<string, string>>({})
const handleSearch = useCallback((paramName: string, query: string) => {
  setSearchParams(prev => {
    if (!query) { const next = { ...prev }; delete next[paramName]; return next }
    return { ...prev, [paramName]: query }
  })
}, [])
const dagResult = useDAGTable(config, engine, { ...params, ...searchParams })
// ...
<DataGrid ... onSearch={handleSearch} />
```

**Icon resolution:**
```typescript
// toolbar/icon-resolver.ts
import * as LucideIcons from 'lucide-react'

export function resolveLucideIcon(name: string): React.ComponentType<{ className?: string }> {
  return (LucideIcons as Record<string, unknown>)[name] as React.ComponentType<{ className?: string }>
    ?? LucideIcons.AlertCircle
}
```

---

## Backward Compatibility

| Scenario | Behavior |
|---|---|
| `toolbarCommands` omitted | No toolbar bar rendered |
| `toolbarCommands={[]}` | Empty toolbar bar renders (height preserved) |
| `enabled: false` on a command | Command not rendered |
| `slots.toolbar` | **Removed** — use `toolbarCommands` |
| `slots.toolbarLeft` | **Removed** — use `toolbarCommands` with `align: 'left'` |
| `slots.toolbarRight` | **Removed** — use `toolbarCommands` with `align: 'right'` |
| `slots.selectionActions` | **Unchanged** |
| `slots.emptyState` | **Unchanged** |
| `slots.loadingState` | **Unchanged** |
| `ConfiguredTable` with DAG `toolbarActions` | Auto-converted, all `enabled: true` |
| `ConfiguredTable` without DAG `toolbarActions` | No toolbar unless `toolbarCommands` passed |
| DAG `ActionDef.disabledExpr` | Ignored during conversion — no row context at toolbar level |

---

## Example — Custom Handler with Full Context Access

```typescript
// Expand all root rows via API then expand UI tree
const expandAllDeep: ToolbarCommand = {
  id: 'expand-all-deep',
  type: 'command',
  enabled: true,
  align: 'left',
  label: 'Expand all',
  icon: ChevronsUpDown,
  handler: async (ctx) => {
    await ctx.executeApiNode('expand-all-api')
    const rootRows = ctx.table.getCoreRowModel().rows
    for (const row of rootRows) {
      await ctx.expandRow?.(row.original)
    }
  },
}

// Custom density switcher with className override
const compactMode: ToolbarCommand = {
  id: 'compact-mode',
  type: 'command',
  enabled: true,
  align: 'right',
  label: 'Compact',
  icon: AlignJustify,
  className: 'text-muted-foreground hover:text-foreground',
  handler: async (ctx) => ctx.setDensity('compact'),
}

// Bulk action using selected rows
const archiveSelected: ToolbarCommand = {
  id: 'archive-selected',
  type: 'command',
  enabled: true,
  align: 'right',
  label: 'Archive',
  icon: Archive,
  handler: async (ctx) => {
    if (!ctx.selectedRows.length) return
    await ctx.executeApiNode('archive-api')
    ctx.table.resetRowSelection()
  },
}
```
