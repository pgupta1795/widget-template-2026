# Toolbar Redesign — Design Spec

**Date:** 2026-03-17
**Branch:** tanstack-table-ui
**Status:** Approved for implementation

---

## Problem

The existing toolbar system has three gaps:

1. **Two divergent shapes** — `ToolbarCommand` (used with `DataGrid` directly) and `ActionDef` (used in `DAGTableConfig` ActionNode) are separate types with no shared structure. A developer must learn both.
2. **No config-level toolbar commands** — toolbar commands can only be defined via `ActionNode.toolbarActions` inside the DAG, which is a poor fit (ActionNode exists for row/cell actions with row context, not toolbar-level commands).
3. **`apiNodeId` split** — `SearchToolbarCommand` used `apiNodeId` as a server-side flag while `CommandToolbarCommand` used a different mechanism to call API nodes. The same concept had two names.

---

## Design Goals

- Single `ToolbarCommand` discriminated union that works identically for `DataGrid` (programmatic) and `ConfiguredTable` (config-based) usage
- `DAGTableConfig.toolbarCommands` as a first-class field — toolbar commands live at the config level, not buried in ActionNode
- `action` field on commands = direct DAG API node reference (no ActionNode indirection)
- `handler` for complex programmatic cases with full `ToolbarContext` access
- Remove `ActionNode.toolbarActions` entirely — no backward compat burden

---

## Type System

### Shared Base

```ts
// src/components/data-grid/toolbar/toolbar.types.ts

interface ToolbarCommandBase {
  id: string
  /**
   * When absent or false, the command is not rendered.
   * Must be explicitly set to true to opt in.
   */
  enabled?: boolean
  align?: 'left' | 'right'   // default 'left'
  label?: string
  icon?: ComponentType<{ className?: string }> | string  // lucide name or component ref
  className?: string
  disabled?: boolean
}
```

> **Note:** `SpacerToolbarCommand` and `SeparatorToolbarCommand` intentionally do **not** extend
> `ToolbarCommandBase`. They are layout-only primitives — they carry no presentation fields
> (`label`, `icon`, `className`, `disabled`, `align` are meaningless on them).

### Discriminated Variants

```ts
/** Button that executes an action or custom handler */
interface CommandToolbarCommand extends ToolbarCommandBase {
  type: 'command'
  /**
   * Direct DAG API node ID. Fires ctx.executeApiNode(action) when clicked.
   * No-op in standalone DataGrid — use handler instead for programmatic use.
   */
  action?: string
  /**
   * Full custom handler. Takes precedence over action when both present.
   * Receives full ToolbarContext — table, rows, columns, all state.
   */
  handler?: (ctx: ToolbarContext, params?: Record<string, unknown>) => Promise<void>
  /** Static params passed as second argument to handler. Ignored when only action is set. */
  handlerParams?: Record<string, unknown>
}

/** Dropdown menu with 1-level-deep sub-items */
interface MenuToolbarCommand extends ToolbarCommandBase {
  type: 'menu'
  /** Sub-items are CommandToolbarCommands — support action and handler. No nesting beyond 1 level. */
  commands: CommandToolbarCommand[]
  menuClassName?: string
}

/** Search input — client-side or server-side */
interface SearchToolbarCommand extends ToolbarCommandBase {
  type: 'search'
  /**
   * When set → server-side mode: ctx.onSearch(queryParamName, value) on debounce.
   *   The value is not used to call the node directly — it signals ConfiguredTable
   *   to update its searchParams state, triggering a React Query refetch.
   * When omitted → client-side mode: ctx.setGlobalFilter(value) on debounce.
   */
  action?: string
  /** Query param key passed to onSearch. Default: 'q' */
  queryParamName?: string
  /** Debounce delay in ms. Default: 300 */
  debounceMs?: number
  placeholder?: string
  inputClassName?: string
}

/** Flexible spacer — pushes subsequent items to the right. No ToolbarCommandBase fields. */
interface SpacerToolbarCommand {
  id: string
  type: 'spacer'
  enabled?: boolean
}

/** Visual divider between commands. No ToolbarCommandBase fields. */
interface SeparatorToolbarCommand {
  id: string
  type: 'separator'
  enabled?: boolean
}

/** Full union */
export type ToolbarCommand =
  | CommandToolbarCommand
  | MenuToolbarCommand
  | SearchToolbarCommand
  | SpacerToolbarCommand
  | SeparatorToolbarCommand

/**
 * Config-safe subset — handler and handlerParams omitted (functions are not JSON-serializable).
 * Use this type in DAGTableConfig.toolbarCommands.
 */
export type SerializableToolbarCommand =
  | Omit<CommandToolbarCommand, 'handler' | 'handlerParams'>
  | (Omit<MenuToolbarCommand, 'commands'> & {
      commands: Omit<CommandToolbarCommand, 'handler' | 'handlerParams'>[]
    })
  | SearchToolbarCommand
  | SpacerToolbarCommand
  | SeparatorToolbarCommand
```

### ToolbarContext

`ToolbarContext` keeps its existing shape with one semantic clarification on `executeApiNode`:

```ts
interface ToolbarContext {
  // ...existing fields unchanged...

  /**
   * Fires a DAG API node directly by nodeId (bypasses ActionNode).
   * In ConfiguredTable: wired to useDAGTable's executeNode(nodeId) — see DAG wiring section.
   * In standalone DataGrid: no-op (use handler for programmatic logic instead).
   */
  executeApiNode: (nodeId: string) => Promise<void>
}
```

---

## DAGTableConfig — `toolbarCommands` as first-class field

```ts
// src/components/data-grid/table-engine/types/table.types.ts

export interface DAGTableConfig {
  tableId: string
  mode: GridMode
  dag: DAGDefinition
  features?: DAGFeaturesConfig
  density?: GridDensity
  /**
   * Toolbar commands for this table.
   * Use action: 'apiNodeId' to wire a command to a DAG API node.
   * Consumer-provided toolbarCommands on ConfiguredTable are merged on top:
   *   matching id → consumer wins (full replacement, not deep merge)
   *   new id      → appended after config commands
   */
  toolbarCommands?: SerializableToolbarCommand[]
}
```

### ActionNode changes

`ActionNodeConfig.toolbarActions` and `ActionOutput.toolbarActions` are **removed**.
`ActionNode` retains `rowActions` and `cellActions` only — those retain row context
(`visibilityExpr`, `disabledExpr`) and have no equivalent at toolbar level.

---

## ConfiguredTable — merge logic

Two sources, lowest → highest priority:

```
1. config.toolbarCommands     (SerializableToolbarCommand[])
2. props.toolbarCommands      (ToolbarCommand[] — consumer override)
```

Merge rule: same `id` → props win (full replacement, not deep merge).
New `id` → appended after config commands.

`actionDefToToolbarCommand` is **deleted** — no longer needed.

### `mergeToolbarCommands` signature update

The function must accept heterogeneous types between base and overrides:

```ts
// Before
function mergeToolbarCommands(
  base: ToolbarCommand[],
  overrides?: ToolbarCommand[]
): ToolbarCommand[]

// After
function mergeToolbarCommands(
  base: SerializableToolbarCommand[],
  overrides?: ToolbarCommand[]
): ToolbarCommand[]
```

`SerializableToolbarCommand` is structurally compatible with `ToolbarCommand` (it is a strict
subset — same discriminant, fewer optional fields), so the return type `ToolbarCommand[]` is safe.

---

## DAG Wiring — `executeApiNode` in ConfiguredTable

This is the mechanism that makes `action: 'expand-all-api'` work at runtime.

Currently `ctx.executeApiNode` maps to `onAction` from `useDAGTable`, which fires an ActionNode
by actionId. The redesign requires firing API nodes directly (no ActionNode in between).

`useDAGTable` must expose a new stable callback:

```ts
// useDAGTable return shape (addition)
executeNode: (nodeId: string) => Promise<void>
```

This calls the DAG engine directly, bypassing the ActionNode layer:

```ts
// inside useDAGTable
// `params` is the same merged params object already passed to useDAGTable
// (e.g. { ...props.params, ...searchParams } from ConfiguredTable)
const executeNode = useCallback(
  (nodeId: string) => engine.executeNode(nodeId, params),
  [engine, params],
)
```

`params` here is the same value passed as the third argument to `useDAGTable` — the merged
`{ ...props.params, ...searchParams }` from `ConfiguredTable`. No new state is introduced.
The engine already supports on-demand node execution (the row-expand mechanism uses this pattern).

`ConfiguredTable` wires this into the DataGrid:

```ts
// configured-table.tsx
const { data, columns, ..., executeNode } = useDAGTable(config, engine, mergedParams)

<DataGrid
  ...
  onExecuteNode={executeNode}
  // when absent (standalone DataGrid), executeApiNode in context defaults to async no-op
/>
```

### Context threading

`ToolbarContext` is **not** the same as `DataGridContext`. It is a derived object constructed
inside `ToolbarRenderer` from fields read via `useDataGridContext()`. The threading path is:

```
DataGrid prop:  onExecuteNode
      ↓  stored in DataGridContext as executeApiNode (already a field — update its value)
DataGridContext.executeApiNode
      ↓  read by ToolbarRenderer via useDataGridContext()
ToolbarContext.executeApiNode   ← passed to CommandButton / CommandMenu / CommandSearch
```

`executeApiNode` is **already declared** in `DataGridContext` (current implementation wires it
to `onAction`). The only change is replacing that wiring with `onExecuteNode` (the new direct
node executor). No new fields are added to `DataGridContext` or `ToolbarContext` types.

**Files additionally affected by this wiring:**
- `src/components/data-grid/table-engine/hooks/use-dag-table.ts` — expose `executeNode`
- `src/components/data-grid/data-grid.tsx` — add `onExecuteNode` prop; pass to context
- `src/components/data-grid/data-grid-context.ts` — update `executeApiNode` wiring from `onAction` to `onExecuteNode`

---

## Renderer changes

### `CommandButton` — execution priority

```ts
if (command.handler) {
  await command.handler(ctx, command.handlerParams)
} else if (command.action) {
  await ctx.executeApiNode(command.action)
}
// else: no-op — button remains enabled but does nothing
// Set disabled: true on the command if a no-op button is undesirable
```

### `CommandMenu` — same execution priority for sub-items

Sub-items are `CommandToolbarCommand`. The `handleItemClick` function in `CommandMenu` must apply
the same chain as `CommandButton`:

```ts
const handleItemClick = useCallback((item: CommandToolbarCommand) => {
  startTransition(async () => {
    if (item.handler) {
      await item.handler(ctx, item.handlerParams)
    } else if (item.action) {
      await ctx.executeApiNode(item.action)
    }
  })
}, [ctx])
```

### `CommandSearch` — server-side detection

```ts
const isServerSide = Boolean(command.action)  // replaces: Boolean(command.apiNodeId)
```

### `ToolbarRenderer` — type-narrowed dispatch

`renderCommand` uses the discriminated union `command.type` for narrowing.
Built-in IDs (`columnVisibility`, `density`, `refresh`, `export`, `addRow`) keep dedicated
renderers and are matched **before** the generic type dispatch — no change to built-in behavior.

> **Convention for built-in commands in config files:** Built-in commands declared in
> `config.toolbarCommands` (e.g., `{ id: 'columnVisibility', type: 'menu', commands: [] }`)
> must conform to the discriminated union type for TypeScript validity, but their `type` and
> sub-fields are ignored at render time — the built-in renderer is selected by `id` match alone.
> `commands: []` is the correct placeholder for `MenuToolbarCommand` conformance.

---

## Config File Examples

### `eng-search.config.ts` — server-side infinite search

```ts
export const engSearchConfig: DAGTableConfig = {
  tableId: 'eng-search',
  mode: 'infinite',

  toolbarCommands: [
    {
      id: 'search',
      type: 'search',
      enabled: true,
      align: 'left',
      action: 'root-api',          // present → server-side mode (onSearch relay)
      queryParamName: 'searchStr', // matches $params.searchStr in DAG queryParams
      placeholder: 'Search engineering items...',
      debounceMs: 400,
    },
    { id: 'spacer', type: 'spacer', enabled: true },
    { id: 'refresh',          type: 'command', enabled: true, align: 'right', icon: 'RefreshCw' },
    { id: 'columnVisibility', type: 'menu',    enabled: true, align: 'right',
      label: 'Columns', icon: 'Columns3', commands: [] },  // commands: [] for type conformance
  ],

  dag: { /* unchanged from current */ },
  features: { /* unchanged from current */ },
}
```

### `eng-expand.config.ts` — deep expand via API

```ts
export const engExpandConfig: DAGTableConfig = {
  tableId: 'eng-expand',
  mode: 'tree',

  toolbarCommands: [
    {
      id: 'expandAllDeep',
      type: 'command',
      enabled: true,
      align: 'left',
      label: 'Expand All',
      icon: 'ChevronsUpDown',
      action: 'expand-all-api',    // fires DAG API node directly (expandDepth: -1)
    },
    {
      id: 'collapseAll',
      type: 'command',
      enabled: true,
      align: 'left',
      label: 'Collapse All',
      icon: 'Minimize2',
      // No action or handler in config — collapseAll requires ctx.collapseAll() (function).
      // Consumer must provide handler via props.toolbarCommands override:
      //   { id: 'collapseAll', type: 'command', handler: async (ctx) => ctx.collapseAll?.() }
      // Until overridden, the button is visible but no-op. Set disabled: true if undesirable.
      disabled: true,  // safe default until consumer wires a handler
    },
    { id: 'spacer',   type: 'spacer',   enabled: true },
    { id: 'refresh',  type: 'command',  enabled: true, align: 'right', icon: 'RefreshCw' },
  ],

  dag: {
    nodes: [
      // ── existing nodes (unchanged) ──────────────────────────────────
      { id: 'root-api',         /* expandDepth: 1 */ },
      { id: 'row-expand',       /* unchanged */ },
      { id: 'columns',          /* unchanged */ },
      { id: 'child-expand-api', /* expandDepth: 1 */ },

      // ── new: deep expand triggered from toolbar ──────────────────────
      {
        id: 'expand-all-api',
        type: 'api',
        config: {
          url: EXPAND_URL,
          method: 'POST',
          authAdapterId: 'wafdata',
          body: { expandDepth: -1, withPath: true },  // deep — no row param needed
          responseTransform: EXPAND_RESPONSE_TRANSFORM,
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        },
        // NOT in edges — fired on-demand from toolbar, not part of initial DAG wave
      },
    ],
    edges: [
      { from: 'root-api',   to: 'row-expand' },
      { from: 'row-expand', to: 'columns' },
    ],
    // rootNodeId is the terminal output node (the node whose result is the final table data),
    // not the DAG entry point. 'columns' is the node that produces the rendered column
    // definitions — it is the last node in the pipeline. This matches the existing convention.
    rootNodeId: 'columns',
  },
}
```

### DataGrid standalone — programmatic `handler`

```ts
<DataGrid
  toolbarCommands={[
    {
      id: 'expandAll',
      type: 'command',
      enabled: true,
      label: 'Expand All',
      icon: 'ChevronsUpDown',
      handler: async (ctx) => {
        ctx.table.toggleAllRowsExpanded(true)
      },
    },
    {
      id: 'search',
      type: 'search',
      enabled: true,
      // no action → client-side filter via setGlobalFilter
      placeholder: 'Filter...',
    },
    {
      id: 'actions',
      type: 'menu',
      enabled: true,
      label: 'Actions',
      icon: 'MoreHorizontal',
      commands: [
        {
          id: 'exportCsv',
          type: 'command',
          label: 'Export CSV',
          icon: 'Download',
          handler: async (ctx) => exportToCsv(ctx.rows, ...),
        },
        {
          id: 'clearSelection',
          type: 'command',
          label: 'Clear Selection',
          handler: async (ctx) => ctx.table.resetRowSelection(),
        },
      ],
    },
  ]}
/>
```

---

## Files Affected

| File | Change |
|------|--------|
| `src/components/data-grid/toolbar/toolbar.types.ts` | Rewrite — discriminated union, `SerializableToolbarCommand`, remove `apiNodeId` |
| `src/components/data-grid/toolbar/toolbar-defaults.ts` | Update default shapes to match new union variants |
| `src/components/data-grid/toolbar/toolbar-renderer.tsx` | Type-narrowed dispatch via discriminated union |
| `src/components/data-grid/toolbar/command-button.tsx` | Add `action` fallback chain |
| `src/components/data-grid/toolbar/command-search.tsx` | Replace `apiNodeId` check with `action` |
| `src/components/data-grid/toolbar/command-menu.tsx` | Sub-items typed as `CommandToolbarCommand`; add `action` fallback chain in `handleItemClick` |
| `src/components/data-grid/toolbar/merge-toolbar-commands.ts` | Update signature: base `SerializableToolbarCommand[]`, overrides `ToolbarCommand[]` |
| `src/components/data-grid/table-engine/types/table.types.ts` | Add `toolbarCommands` to `DAGTableConfig`; remove `toolbarActions` from `ActionNodeConfig`/`ActionOutput` |
| `src/components/data-grid/table-engine/configured-table.tsx` | Remove `actionDefToToolbarCommand`; two-source merge via `mergeToolbarCommands` |
| `src/components/data-grid/table-engine/nodes/action-node.ts` | Remove `toolbarActions` processing |
| `src/components/data-grid/table-engine/hooks/use-dag-table.ts` | Expose `executeNode(nodeId)` callback |
| `src/components/data-grid/data-grid.tsx` | Add `onExecuteNode?: (nodeId: string) => Promise<void>` prop |
| `src/components/data-grid/data-grid-context.ts` | Thread `onExecuteNode` into context as `executeApiNode` |
| `src/features/xen/configs/eng-search.config.ts` | Add `toolbarCommands` section |
| `src/features/xen/configs/eng-expand.config.ts` | Add `toolbarCommands` section + `expand-all-api` node |
| `src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts` | Update for new signature and two-source merge |
| `src/components/data-grid/toolbar/__tests__/toolbar-defaults.test.ts` | Update for discriminated union shapes |
| `src/components/data-grid/table-engine/__tests__/action-node.test.ts` | Remove `toolbarActions` test cases |

---

## Non-Goals

- No changes to row/cell action system
- No changes to built-in toolbar renderers (`columnVisibility`, `density`, `refresh`, `export`, `addRow`)
- No runtime validation of `SerializableToolbarCommand` (TypeScript-only guard)
- No deep merge for toolbar commands — matching id always does full replacement
