# Toolbar Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat `ToolbarCommand` interface with a discriminated union, add `DAGTableConfig.toolbarCommands` as a first-class field, and wire `action` directly to DAG API nodes — making config-based and programmatic toolbar commands work identically.

**Architecture:** The discriminated union (`CommandToolbarCommand | MenuToolbarCommand | SearchToolbarCommand | SpacerToolbarCommand | SeparatorToolbarCommand`) replaces the flat interface. A `SerializableToolbarCommand` utility type (no `handler`/`handlerParams`) is used in `DAGTableConfig`. A new `onExecuteNode` prop on `DataGrid` threads DAG node execution into the toolbar context, replacing the indirect `onAction` path.

**Tech Stack:** TypeScript 5, React 19, TanStack Table v8, Vitest 3, Biome

**Spec:** `docs/superpowers/specs/2026-03-17-toolbar-redesign.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/data-grid/toolbar/toolbar.types.ts` | Rewrite | Discriminated union types + `SerializableToolbarCommand` |
| `src/components/data-grid/table-engine/types/table.types.ts` | Modify | Add `toolbarCommands` to `DAGTableConfig`; remove `toolbarActions` |
| `src/components/data-grid/table-engine/nodes/action-node.ts` | Modify | Remove `toolbarActions` passthrough |
| `src/components/data-grid/table-engine/hooks/use-dag-table.ts` | Modify | Add `executeNode` to return; remove `toolbarActions` from `onAction` |
| `src/components/data-grid/data-grid.tsx` | Modify | Add `onExecuteNode` prop |
| `src/components/data-grid/hooks/use-data-grid.ts` | Modify | Rewire `executeApiNode` to `onExecuteNode` |
| `src/components/data-grid/toolbar/toolbar-defaults.ts` | Modify | Match new union variant shapes |
| `src/components/data-grid/toolbar/command-button.tsx` | Modify | `handler → action → no-op` execution chain |
| `src/components/data-grid/toolbar/command-search.tsx` | Modify | `action` replaces `apiNodeId` for server-side detection |
| `src/components/data-grid/toolbar/command-menu.tsx` | Modify | `CommandToolbarCommand` sub-items + `action` fallback |
| `src/components/data-grid/toolbar/toolbar-renderer.tsx` | Modify | Type-narrowed dispatch via discriminated union |
| `src/components/data-grid/toolbar/merge-toolbar-commands.ts` | Modify | Signature: base `SerializableToolbarCommand[]` |
| `src/components/data-grid/table-engine/configured-table.tsx` | Modify | Two-source merge; remove `actionDefToToolbarCommand` |
| `src/features/xen/configs/eng-search.config.ts` | Modify | Add `toolbarCommands` with server-side search |
| `src/features/xen/configs/eng-expand.config.ts` | Modify | Add `toolbarCommands` + `expand-all-api` node |
| `src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts` | Modify | Update for `SerializableToolbarCommand` base type |
| `src/components/data-grid/toolbar/__tests__/toolbar-defaults.test.ts` | Modify | Update for discriminated union shapes |
| `src/components/data-grid/table-engine/__tests__/action-node.test.ts` | Modify | Remove `toolbarActions` test cases |

---

## Chunk 1: Type Foundation

These are pure type changes. No runtime behaviour changes in this chunk. All existing tests should still pass after this chunk.

---

### Task 1: Rewrite `toolbar.types.ts` — discriminated union

**Files:**
- Modify: `src/components/data-grid/toolbar/toolbar.types.ts`

- [ ] **Step 1: Replace the file contents**

```ts
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
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template"
npm run build 2>&1 | head -50
```

Expected: may have errors in files that use the old flat `ToolbarCommand` shape — that's fine, we'll fix those in subsequent tasks. Look specifically for errors in `toolbar.types.ts` itself — there should be none.

- [ ] **Step 3: Commit**

```bash
git add src/components/data-grid/toolbar/toolbar.types.ts
git commit -m "refactor(toolbar): rewrite types — discriminated union + SerializableToolbarCommand"
```

---

### Task 2: Update `table.types.ts` — add `toolbarCommands`, remove `toolbarActions`

**Files:**
- Modify: `src/components/data-grid/table-engine/types/table.types.ts`

- [ ] **Step 1: Add `SerializableToolbarCommand` import and `toolbarCommands` to `DAGTableConfig`**

Find the `DAGTableConfig` interface and add the new field. Also remove `toolbarActions` from `ActionNodeConfig` and `ActionOutput`.

In `table.types.ts`, make these changes:

**Add import at top of file (after existing imports):**
```ts
import type { SerializableToolbarCommand } from "@/components/data-grid/toolbar/toolbar.types";
```

**Add to `DAGTableConfig` interface:**
```ts
export interface DAGTableConfig {
  tableId: string;
  mode: GridMode;
  dag: DAGDefinition;
  features?: DAGFeaturesConfig;
  density?: GridDensity;
  /**
   * Toolbar commands for this table.
   * Use action: 'apiNodeId' to wire to a DAG API node.
   * Consumer toolbarCommands on ConfiguredTable are merged on top (consumer wins on matching id).
   */
  toolbarCommands?: SerializableToolbarCommand[];
}
```

**Remove `toolbarActions` from `ActionNodeConfig`:**
```ts
export interface ActionNodeConfig {
  rowActions?: ActionDef[];
  cellActions?: ActionDef[];
  // toolbarActions removed — toolbar commands live in DAGTableConfig.toolbarCommands
}
```

**Remove `toolbarActions` from `ActionOutput`:**
```ts
export interface ActionOutput {
  rowActions: ActionDef[];
  cellActions: ActionDef[];
  // toolbarActions removed
}
```

- [ ] **Step 2: Check TypeScript errors**

```bash
npm run build 2>&1 | head -80
```

Expected: errors in `action-node.ts` (references `toolbarActions`) and `use-dag-table.ts` (references `toolbarActions`). These will be fixed in Chunk 2. No errors should come from `table.types.ts` itself.

- [ ] **Step 3: Commit**

```bash
git add src/components/data-grid/table-engine/types/table.types.ts
git commit -m "refactor(table-types): add toolbarCommands to DAGTableConfig, remove toolbarActions"
```

---

## Chunk 2: DAG + DataGrid Wiring

Fix the TypeScript errors introduced in Chunk 1 and add `executeNode` to the public API.

---

### Task 3: Remove `toolbarActions` from `action-node.ts` and its test

**Files:**
- Modify: `src/components/data-grid/table-engine/nodes/action-node.ts`
- Modify: `src/components/data-grid/table-engine/__tests__/action-node.test.ts`

- [ ] **Step 1: Update the test first — remove `toolbarActions` cases**

Replace the full test file:

```ts
// src/components/data-grid/table-engine/__tests__/action-node.test.ts
import { describe, expect, it } from "vitest";
import { NodeContext } from "../core/node-context";
import { ActionNodeExecutor } from "../nodes/action-node";
import type { ActionNodeConfig } from "../types/table.types";

const executor = new ActionNodeExecutor();

describe("ActionNodeExecutor", () => {
  it("passes rowActions through from config", async () => {
    const config: ActionNodeConfig = {
      rowActions: [
        { id: "promote", label: "Promote", apiNodeId: "promote-api" },
      ],
    };
    const result = await executor.execute(config, new NodeContext(), []);
    expect(result.rowActions).toHaveLength(1);
    expect(result.rowActions[0].id).toBe("promote");
    expect(result.rowActions[0].apiNodeId).toBe("promote-api");
  });

  it("passes cellActions through from config", async () => {
    const config: ActionNodeConfig = {
      cellActions: [
        { id: "view", label: "View", apiNodeId: "view-api" },
      ],
    };
    const result = await executor.execute(config, new NodeContext(), []);
    expect(result.cellActions).toHaveLength(1);
    expect(result.cellActions[0].id).toBe("view");
  });

  it("defaults to empty arrays when config has no actions", async () => {
    const result = await executor.execute({}, new NodeContext(), []);
    expect(result.rowActions).toEqual([]);
    expect(result.cellActions).toEqual([]);
  });

  it("rowActions and cellActions are independent", async () => {
    const config: ActionNodeConfig = {
      rowActions: [{ id: "r", label: "Row", apiNodeId: "r-api" }],
      cellActions: [{ id: "c", label: "Cell", apiNodeId: "c-api" }],
    };
    const result = await executor.execute(config, new NodeContext(), []);
    expect(result.rowActions).toHaveLength(1);
    expect(result.cellActions).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run the test — expect TypeScript/compile errors because `action-node.ts` still has `toolbarActions`**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/action-node.test.ts
```

Expected: FAIL — compilation error referencing `toolbarActions`.

- [ ] **Step 3: Update `action-node.ts` — remove `toolbarActions`**

```ts
// src/components/data-grid/table-engine/nodes/action-node.ts

import type { NodeContext } from "../core/node-context";
import type { INodeExecutor } from "../core/node-registry";
import type { DAGNode } from "../types/dag.types";
import type { ActionNodeConfig, ActionOutput } from "../types/table.types";

/**
 * ActionNodeExecutor is a pure pass-through on the initial wave.
 * It reads row and cell action declarations and stores them in NodeContext.
 * Toolbar commands are now defined in DAGTableConfig.toolbarCommands, not here.
 */
export class ActionNodeExecutor implements INodeExecutor<"action"> {
  async execute(
    config: ActionNodeConfig,
    _context: NodeContext,
    _allNodes: DAGNode[],
  ): Promise<ActionOutput> {
    return {
      rowActions: config.rowActions ?? [],
      cellActions: config.cellActions ?? [],
    };
  }
}
```

- [ ] **Step 4: Run the test — expect PASS**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/action-node.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/nodes/action-node.ts \
        src/components/data-grid/table-engine/__tests__/action-node.test.ts
git commit -m "refactor(action-node): remove toolbarActions — toolbar commands moved to DAGTableConfig"
```

---

### Task 4: Add `executeNode` to `use-dag-table.ts`, fix `onAction`

**Files:**
- Modify: `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

The `onAction` handler currently reads `toolbarActions` from `ActionOutput`. We remove that reference. We also add a new `executeNode` callback that fires any API node by ID using the current params context.

- [ ] **Step 1: Update `DAGTableResult` type to include `executeNode`**

In `src/components/data-grid/table-engine/types/table.types.ts`, find `DAGTableResult` and add the new field:

```ts
export interface DAGTableResult {
  data: GridRow[];
  columns: GridColumnDef[];
  columnVisibility: Record<string, boolean>;
  isLoading: boolean;
  isFetchingNextPage: boolean;
  error: Error | null;
  pagination?: {
    pageIndex: number;
    pageCount: number;
    onPageChange: (idx: number) => void;
    pageSize: number;
  };
  hasNextPage?: boolean;
  fetchNextPage?: (...args: unknown[]) => unknown;
  onExpand?: (row: GridRow) => Promise<GridRow[]> | void;
  onAction?: (actionId: string, row?: GridRow) => Promise<void>;
  /** Fires a DAG API node directly by nodeId using the current params context. */
  executeNode: (nodeId: string) => Promise<void>;
}
```

- [ ] **Step 2: Update `use-dag-table.ts` — fix `onAction` and add `executeNode`**

In `use-dag-table.ts`, locate the `onAction` callback (around line 162) and make two changes:

**a) Fix `onAction` — remove `toolbarActions` reference:**

```ts
const onAction = useCallback(
  async (actionId: string, row?: GridRow) => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    // 1. Find ActionNode in DAG to locate the ActionDef
    const actionNode = config.dag.nodes.find((n) => n.type === "action");
    if (!actionNode || !ctx.has(actionNode.id)) return;

    const actionOutput = ctx.get(actionNode.id, "action");
    // toolbarActions removed — only rowActions and cellActions remain
    const allActions = [
      ...actionOutput.rowActions,
      ...actionOutput.cellActions,
    ];
    const actionDef = allActions.find((a) => a.id === actionId);
    if (!actionDef) return;

    // 2. Look up lazy ApiNode by actionDef.apiNodeId
    const lazyApiNode = config.dag.nodes.find(
      (n) => n.id === actionDef.apiNodeId && n.type === "api",
    );
    if (!lazyApiNode) return;

    // 3. Execute the lazy ApiNode with row context
    const rowCtx = row ? ctx.withRow(row) : ctx;
    const apiExecutor = new ApiNodeExecutor(engine.getAuthRegistry());
    await apiExecutor.execute(
      lazyApiNode.config as import("../types/table.types").ApiNodeConfig,
      rowCtx,
      config.dag.nodes,
    );

    // 4. Invalidate query cache to trigger re-fetch
    await queryClient.invalidateQueries({ queryKey: [config.tableId] });
  },
  [config, engine, queryClient],
);
```

**b) Add `executeNode` callback after `onAction`:**

```ts
/**
 * Fires a DAG API node directly by nodeId.
 * Creates a fresh NodeContext from the current params (same params passed to useDAGTable)
 * so the execution is never stale. Does NOT go through ActionNode.
 *
 * Note: DAGEngine has no executeNode method — we call ApiNodeExecutor directly,
 * the same pattern onAction uses for lazy node execution.
 */
const executeNode = useCallback(
  async (nodeId: string) => {
    const node = config.dag.nodes.find(
      (n) => n.id === nodeId && n.type === "api",
    );
    if (!node) return;

    // Fresh context from current params — never stale, isolated from the ongoing query
    const ctx = new NodeContext().withParams(params);
    const apiExecutor = new ApiNodeExecutor(engine.getAuthRegistry());
    await apiExecutor.execute(
      node.config as import("../types/table.types").ApiNodeConfig,
      ctx,
      config.dag.nodes,
    );

    await queryClient.invalidateQueries({ queryKey: [config.tableId] });
  },
  [config, engine, queryClient, params], // params in deps — fresh context on each call
);
```

**c) Add `executeNode` to the return value:**

```ts
return {
  data: finalRows,
  columns: finalColOutput.columns,
  columnVisibility: finalColOutput.visibility,
  isLoading,
  isFetchingNextPage,
  error,
  pagination,
  hasNextPage: mode === "infinite" ? infiniteQuery.hasNextPage : undefined,
  fetchNextPage:
    mode === "infinite" ? infiniteQuery.fetchNextPage : undefined,
  onExpand,
  onAction,
  executeNode,  // ← add this
};
```

- [ ] **Step 3: Check TypeScript**

```bash
npm run build 2>&1 | head -50
```

Expected: errors only in files not yet updated (`configured-table.tsx` may complain about missing `executeNode` in destructuring — that's OK for now).

- [ ] **Step 4: Commit**

```bash
git add src/components/data-grid/table-engine/hooks/use-dag-table.ts \
        src/components/data-grid/table-engine/types/table.types.ts
git commit -m "feat(use-dag-table): add executeNode — fires API nodes directly for toolbar commands"
```

---

### Task 5: Add `onExecuteNode` to `DataGrid` + rewire `executeApiNode` in `use-data-grid.ts`

**Files:**
- Modify: `src/components/data-grid/data-grid.tsx`
- Modify: `src/components/data-grid/hooks/use-data-grid.ts`

- [ ] **Step 1: Add `onExecuteNode` prop to `DataGridProps` in `data-grid.tsx`**

In the `DataGridProps` interface, add after `onAction`:

```ts
/**
 * Fires a DAG API node directly by nodeId. Provided by ConfiguredTable from useDAGTable.executeNode.
 * Toolbar commands with action: 'nodeId' call ctx.executeApiNode(nodeId) which wraps this.
 * When absent (standalone DataGrid), executeApiNode in context is a no-op.
 */
onExecuteNode?: (nodeId: string) => Promise<void>;
```

Also update the JSDoc on `onAction` to clarify it is now for row/cell actions only:

```ts
/**
 * Fires a DAG ActionDef by id — for row and cell actions only.
 * Toolbar commands use onExecuteNode instead.
 */
onAction?: (actionId: string, row?: GridRow) => Promise<void>;
```

- [ ] **Step 2: Update `use-data-grid.ts` — rewire `executeApiNode` to use `onExecuteNode`**

In `use-data-grid.ts`, find the `onExecuteNode`/`onAction` prop destructuring (around line 108) and add `onExecuteNode`:

```ts
// In the DataGridProps destructuring inside useDataGrid:
onAction,
onExecuteNode,  // ← add
```

Then find where `executeApiNode` is created (around line 163) and change it:

```ts
// Before:
const executeApiNode = React.useCallback(
  (actionId: string) => onAction?.(actionId, undefined) ?? Promise.resolve(),
  [onAction],
);

// After:
const executeApiNode = React.useCallback(
  (nodeId: string) => onExecuteNode?.(nodeId) ?? Promise.resolve(),
  [onExecuteNode],
);
```

- [ ] **Step 3: Check TypeScript**

```bash
npm run build 2>&1 | head -50
```

Expected: no new errors. `configured-table.tsx` will still have its old errors until Task 12.

- [ ] **Step 4: Commit**

```bash
git add src/components/data-grid/data-grid.tsx \
        src/components/data-grid/hooks/use-data-grid.ts
git commit -m "feat(data-grid): add onExecuteNode prop — rewires toolbar executeApiNode to direct node firing"
```

---

## Chunk 3: Toolbar Renderers

Update all renderer files to use the new discriminated union types.

---

### Task 6: Update `toolbar-defaults.ts` — match discriminated union shapes

**Files:**
- Modify: `src/components/data-grid/toolbar/toolbar-defaults.ts`

The existing defaults have fields like `apiNodeId` (on search) and use the old flat type. We update them to match the new union variants.

- [ ] **Step 1: Run the existing defaults test to confirm it currently passes**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/toolbar-defaults.test.ts
```

Expected: may fail due to TypeScript compile error from type changes — that's expected.

- [ ] **Step 2: Update `toolbar-defaults.ts`**

```ts
// src/components/data-grid/toolbar/toolbar-defaults.ts
import type {
  CommandToolbarCommand,
  MenuToolbarCommand,
  SearchToolbarCommand,
  SpacerToolbarCommand,
  ToolbarCommand,
} from "./toolbar.types";

export const DEFAULT_SEARCH: SearchToolbarCommand = {
  id: "search",
  type: "search",
  enabled: false,
  align: "left",
  placeholder: "Search...",
  debounceMs: 300,
  // action: undefined → client-side mode by default
};

export const DEFAULT_COLUMN_VISIBILITY: MenuToolbarCommand = {
  id: "columnVisibility",
  type: "menu",
  enabled: false,
  align: "right",
  label: "Columns",
  icon: "Columns3",
  commands: [], // Built-in renderer selected by id — commands[] unused at render time
};

export const DEFAULT_DENSITY: MenuToolbarCommand = {
  id: "density",
  type: "menu",
  enabled: false,
  align: "right",
  icon: "AlignJustify",
  commands: [], // Built-in renderer selected by id
};

export const DEFAULT_EXPAND_ALL: CommandToolbarCommand = {
  id: "expandAll",
  type: "command",
  enabled: false,
  align: "left",
  icon: "ChevronsUpDown",
  // label computed at render time: 'Expand all' / 'Collapse all'
};

export const DEFAULT_REFRESH: CommandToolbarCommand = {
  id: "refresh",
  type: "command",
  enabled: false,
  align: "right",
  icon: "RefreshCw",
  // button disables and icon spins while ctx.isRefetching
};

export const DEFAULT_EXPORT: CommandToolbarCommand = {
  id: "export",
  type: "command",
  enabled: false,
  align: "right",
  label: "Export",
  icon: "Download",
};

export const DEFAULT_ADD_ROW: CommandToolbarCommand = {
  id: "addRow",
  type: "command",
  enabled: false,
  align: "right",
  label: "Add row",
  icon: "Plus",
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
  { id: "spacer", type: "spacer", enabled: false } satisfies SpacerToolbarCommand,
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_DENSITY,
  DEFAULT_EXPAND_ALL,
  DEFAULT_REFRESH,
  DEFAULT_EXPORT,
  DEFAULT_ADD_ROW,
];
```

- [ ] **Step 3: Run defaults test — expect PASS**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/toolbar-defaults.test.ts
```

Expected: PASS (8 tests). The test checks `enabled`, `type`, `id` — all still valid.

- [ ] **Step 4: Commit**

```bash
git add src/components/data-grid/toolbar/toolbar-defaults.ts
git commit -m "refactor(toolbar-defaults): update shapes to match discriminated union variants"
```

---

### Task 7: Update `command-button.tsx` — add `action` fallback chain

**Files:**
- Modify: `src/components/data-grid/toolbar/command-button.tsx`

- [ ] **Step 1: Update `command-button.tsx`**

```tsx
// src/components/data-grid/toolbar/command-button.tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCallback, useTransition } from "react";
import { resolveLucideIcon } from "./icon-resolver";
import type { CommandToolbarCommand, ToolbarContext } from "./toolbar.types";

interface CommandButtonProps {
  command: CommandToolbarCommand;
  ctx: ToolbarContext;
}

export function CommandButton({ command, ctx }: CommandButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleClick = useCallback(() => {
    startTransition(async () => {
      if (command.handler) {
        await command.handler(ctx, command.handlerParams);
      } else if (command.action) {
        await ctx.executeApiNode(command.action);
      }
      // else: no-op
    });
  }, [command, ctx]);

  const Icon =
    command.icon != null
      ? typeof command.icon === "string"
        ? resolveLucideIcon(command.icon)
        : command.icon
      : null;

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn("h-8 gap-1.5", command.className)}
      onClick={handleClick}
      disabled={command.disabled === true || isPending}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {command.label && <span className="text-xs">{command.label}</span>}
    </Button>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npm run build 2>&1 | grep "command-button" | head -20
```

Expected: no errors from `command-button.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/data-grid/toolbar/command-button.tsx
git commit -m "refactor(command-button): add action fallback chain — handler → action → no-op"
```

---

### Task 8: Update `command-search.tsx` — `action` replaces `apiNodeId`

**Files:**
- Modify: `src/components/data-grid/toolbar/command-search.tsx`

- [ ] **Step 1: Update `command-search.tsx`**

The only change is replacing `command.apiNodeId` with `command.action` for server-side detection, and updating the prop type.

```tsx
// src/components/data-grid/toolbar/command-search.tsx
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import type { SearchToolbarCommand, ToolbarContext } from "./toolbar.types";

interface CommandSearchProps {
  command: SearchToolbarCommand;
  ctx: ToolbarContext;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState<T>(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

export function CommandSearch({ command, ctx }: CommandSearchProps) {
  // action present → server-side mode (onSearch relay)
  // action absent  → client-side mode (setGlobalFilter)
  const isServerSide = Boolean(command.action);
  const debounceMs = command.debounceMs ?? 300;
  const paramName = command.queryParamName ?? "q";

  const [localValue, setLocalValue] = useState(
    isServerSide ? "" : ctx.globalFilter,
  );

  useEffect(() => {
    if (!isServerSide) {
      setLocalValue(ctx.globalFilter);
    }
  }, [ctx.globalFilter, isServerSide]);

  const debouncedValue = useDebounce(localValue, isServerSide ? debounceMs : 0);

  useEffect(() => {
    if (isServerSide) {
      ctx.onSearch?.(paramName, debouncedValue);
    } else {
      ctx.setGlobalFilter(debouncedValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedValue]);

  const handleClear = () => {
    setLocalValue("");
    if (isServerSide) {
      ctx.onSearch?.(paramName, "");
    } else {
      ctx.setGlobalFilter("");
    }
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={command.placeholder ?? "Search..."}
        value={localValue}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setLocalValue(e.target.value)
        }
        className={cn(
          "h-8 w-56 pl-8 text-sm transition-[width] duration-200 focus:w-72",
          command.inputClassName,
        )}
      />
      {localValue && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npm run build 2>&1 | grep "command-search" | head -20
```

Expected: no errors from `command-search.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/data-grid/toolbar/command-search.tsx
git commit -m "refactor(command-search): replace apiNodeId with action for server-side detection"
```

---

### Task 9: Update `command-menu.tsx` — `CommandToolbarCommand` sub-items + `action` fallback

**Files:**
- Modify: `src/components/data-grid/toolbar/command-menu.tsx`

- [ ] **Step 1: Update `command-menu.tsx`**

```tsx
// src/components/data-grid/toolbar/command-menu.tsx
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { useCallback, useState, useTransition } from "react";
import { resolveLucideIcon } from "./icon-resolver";
import type {
  CommandToolbarCommand,
  MenuToolbarCommand,
  ToolbarContext,
} from "./toolbar.types";

interface CommandMenuProps {
  command: MenuToolbarCommand;
  ctx: ToolbarContext;
}

export function CommandMenu({ command, ctx }: CommandMenuProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleItemClick = useCallback(
    (item: CommandToolbarCommand) => {
      setPendingId(item.id);
      startTransition(async () => {
        if (item.handler) {
          await item.handler(ctx, item.handlerParams);
        } else if (item.action) {
          await ctx.executeApiNode(item.action);
        }
        // else: no-op
        setPendingId(null);
      });
    },
    [ctx],
  );

  const TriggerIcon =
    command.icon != null
      ? typeof command.icon === "string"
        ? resolveLucideIcon(command.icon)
        : command.icon
      : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={cn("h-8 gap-1.5", command.className)}
            disabled={command.disabled === true || isPending}
          >
            {TriggerIcon && <TriggerIcon className="h-3.5 w-3.5" />}
            {command.label && (
              <span className="text-xs">{command.label}</span>
            )}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className={command.menuClassName}>
        <DropdownMenuGroup>
          {(command.commands ?? []).map((item) => {
            const ItemIcon =
              item.icon != null
                ? typeof item.icon === "string"
                  ? resolveLucideIcon(item.icon)
                  : item.icon
                : null;
            const isItemPending = pendingId === item.id;
            return (
              <DropdownMenuItem
                key={item.id}
                disabled={item.disabled === true || isItemPending}
                onClick={() => handleItemClick(item)}
                className={item.className}
              >
                {ItemIcon && <ItemIcon className="mr-2 h-3.5 w-3.5" />}
                {item.label}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 2: Check TypeScript**

```bash
npm run build 2>&1 | grep "command-menu" | head -20
```

Expected: no errors from `command-menu.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/data-grid/toolbar/command-menu.tsx
git commit -m "refactor(command-menu): CommandToolbarCommand sub-items + action fallback chain"
```

---

### Task 10: Update `toolbar-renderer.tsx` — type-narrowed dispatch

**Files:**
- Modify: `src/components/data-grid/toolbar/toolbar-renderer.tsx`

> **No test file exists for `toolbar-renderer.tsx`** — it is a pure React render function with no isolated unit tests. TypeScript compilation (Step 2) is the verification step.

The key change: `renderCommand` must pass correctly-typed `command` to each renderer now that we use a discriminated union.

- [ ] **Step 1: Update the import types and `renderCommand` dispatch function**

In `toolbar-renderer.tsx`, update the imports to use specific command types, and update `renderCommand`:

```tsx
// At the top — update toolbar.types import:
import type {
  CommandToolbarCommand,
  MenuToolbarCommand,
  SearchToolbarCommand,
  ToolbarCommand,
  ToolbarContext,
} from "./toolbar.types";
```

Update `renderCommand` to pass typed commands to each renderer:

```tsx
function renderCommand(command: ToolbarCommand, ctx: ToolbarContext) {
  if (command.type === "spacer") {
    return <div key={command.id} className="flex-1" />;
  }
  if (command.type === "separator") {
    return (
      <Separator
        key={command.id}
        orientation="vertical"
        className="mx-1 h-4"
      />
    );
  }

  // Built-in IDs with dedicated rendering — matched BEFORE generic type dispatch.
  // The built-in renderers accept ToolbarCommand (the full union) so no cast is needed.
  // Their prop type is intentionally ToolbarCommand not CommandToolbarCommand — the
  // renderer itself decides which fields to use and ignores the rest.
  if (command.id === "columnVisibility") {
    return <BuiltInColumnVisibility key={command.id} command={command} ctx={ctx} />;
  }
  if (command.id === "density") {
    return <BuiltInDensity key={command.id} command={command} ctx={ctx} />;
  }
  if (command.id === "expandAll") {
    return <BuiltInExpandAll key={command.id} command={command} ctx={ctx} />;
  }
  if (command.id === "refresh") {
    return <BuiltInRefresh key={command.id} command={command} ctx={ctx} />;
  }
  if (command.id === "export") {
    return <BuiltInExport key={command.id} command={command} ctx={ctx} />;
  }
  if (command.id === "addRow") {
    return <BuiltInAddRow key={command.id} command={command} ctx={ctx} />;
  }

  // Generic type-based rendering — discriminant narrows the type
  if (command.type === "search") {
    return (
      <CommandSearch
        key={command.id}
        command={command as SearchToolbarCommand}
        ctx={ctx}
      />
    );
  }
  if (command.type === "menu") {
    return (
      <CommandMenu
        key={command.id}
        command={command as MenuToolbarCommand}
        ctx={ctx}
      />
    );
  }
  if (command.type === "command") {
    return (
      <CommandButton
        key={command.id}
        command={command as CommandToolbarCommand}
        ctx={ctx}
      />
    );
  }

  return null;
}
```

The built-in renderer prop interfaces keep `command: ToolbarCommand` — no change needed. The renderer is selected by `id` before any type check, so accepting the full union is both safe and simpler than casting.

- [ ] **Step 2: Check TypeScript**

```bash
npm run build 2>&1 | grep "toolbar-renderer" | head -20
```

Expected: no errors from `toolbar-renderer.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/data-grid/toolbar/toolbar-renderer.tsx
git commit -m "refactor(toolbar-renderer): type-narrowed dispatch via discriminated union"
```

---

## Chunk 4: Merge + ConfiguredTable

---

### Task 11: Update `merge-toolbar-commands.ts` — signature change

**Files:**
- Modify: `src/components/data-grid/toolbar/merge-toolbar-commands.ts`
- Modify: `src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts`

The merge logic is unchanged. Only the `base` parameter type changes from `ToolbarCommand[]` to `SerializableToolbarCommand[]`.

- [ ] **Step 1: Update the test — add a test for `SerializableToolbarCommand` base**

In `merge-toolbar-commands.test.ts`, add an import and one new test at the end of the describe block, and update the `cmd` helper to work with both types:

```ts
import type { SerializableToolbarCommand, ToolbarCommand } from "../toolbar.types";

// Serializable command helper (no handler/handlerParams)
const scmd = (id: string, label = id): SerializableToolbarCommand => ({
  id,
  type: "command",
  enabled: true,
  label,
});
```

Add this test to the existing describe block:

```ts
it("accepts SerializableToolbarCommand[] as base with ToolbarCommand[] overrides", () => {
  const base: SerializableToolbarCommand[] = [scmd("a"), scmd("b")];
  const overrides: ToolbarCommand[] = [
    { id: "a", type: "command", enabled: true, label: "replaced",
      handler: async () => {} },
  ];
  const result = mergeToolbarCommands(base, overrides);
  expect(result).toHaveLength(2);
  expect(result[0].label).toBe("replaced");
  // handler is present on the override (ToolbarCommand)
  expect((result[0] as ToolbarCommand & { handler?: unknown }).handler).toBeDefined();
});
```

- [ ] **Step 2: Run the test — expect FAIL (wrong signature)**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts
```

Expected: FAIL — TypeScript error: `SerializableToolbarCommand[]` not assignable to `ToolbarCommand[]`.

- [ ] **Step 3: Update `merge-toolbar-commands.ts`**

```ts
// src/components/data-grid/toolbar/merge-toolbar-commands.ts
import type { SerializableToolbarCommand, ToolbarCommand } from "./toolbar.types";

/**
 * Merges consumer override commands into a base command list.
 *
 * Rules:
 * 1. Returns a copy of base in original order.
 * 2. Override with matching id: fully replaces the base entry (no partial merge).
 * 3. Override with new id: appended after all base entries, in override order.
 * 4. undefined or empty overrides: returns base copy unchanged.
 *
 * SerializableToolbarCommand (from config) is a strict structural subset of ToolbarCommand,
 * so the upcast to ToolbarCommand[] in the return is safe.
 */
export function mergeToolbarCommands(
  base: SerializableToolbarCommand[],
  overrides?: ToolbarCommand[],
): ToolbarCommand[] {
  if (!overrides || overrides.length === 0) return [...base] as ToolbarCommand[];

  const result: ToolbarCommand[] = [...base] as ToolbarCommand[];

  for (const override of overrides) {
    const idx = result.findIndex((c) => c.id === override.id);
    if (idx !== -1) {
      result[idx] = override;
    } else {
      result.push(override);
    }
  }

  return result;
}
```

- [ ] **Step 4: Run all merge tests — expect PASS**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts
```

Expected: PASS (all 9 tests including the new one).

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/toolbar/merge-toolbar-commands.ts \
        src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts
git commit -m "refactor(merge-toolbar): update signature — base SerializableToolbarCommand[], overrides ToolbarCommand[]"
```

---

### Task 12: Update `configured-table.tsx` — two-source merge, remove `actionDefToToolbarCommand`

**Files:**
- Modify: `src/components/data-grid/table-engine/configured-table.tsx`

> **Note:** `actionDefToToolbarCommand` is defined inline in `configured-table.tsx` (lines 29–43) — it is not a separate file. The full replacement below simply omits it; no separate deletion step is needed.

- [ ] **Step 1: Update `configured-table.tsx`**

```tsx
// src/components/data-grid/table-engine/configured-table.tsx
import { DataGrid } from "@/components/data-grid/data-grid";
import { mergeToolbarCommands } from "@/components/data-grid/toolbar/merge-toolbar-commands";
import type { ToolbarCommand } from "@/components/data-grid/toolbar/toolbar.types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMemo, useState, useCallback } from "react";
import { createDefaultEngine } from "./bootstrap";
import { useDAGTable } from "./hooks/use-dag-table";
import type { JsonPrimitive } from "./types/dag.types";
import type { DAGTableConfig } from "./types/table.types";

export interface ConfiguredTableProps {
  config: DAGTableConfig;
  className?: string;
  params?: Record<string, JsonPrimitive>;
  /**
   * Extends or overrides config-level toolbar commands.
   * Matching id: consumer command fully replaces the config command.
   * New id: appended after config commands.
   */
  toolbarCommands?: ToolbarCommand[];
  toolbarClassName?: string;
}

/**
 * Declarative table component. Pass a DAGTableConfig and get a fully-featured DataGrid.
 *
 * Handles:
 * - DAG-based API fetching with topological wave execution
 * - JSONata data transforms and per-cell derived values
 * - Flat, Paginated, Infinite, and Tree modes
 * - Lazy row expansion via RowExpandNode
 * - Row/cell actions via ActionNode
 * - Toolbar customization via config.toolbarCommands and toolbarCommands prop
 */
export function ConfiguredTable({
  config,
  className,
  params,
  toolbarCommands: consumerToolbarCommands,
  toolbarClassName,
}: ConfiguredTableProps) {
  const engine = useMemo(() => createDefaultEngine(), []);

  // Server-side search state — keyed by queryParamName for multi-search support
  const [searchParams, setSearchParams] = useState<Record<string, string>>({});

  const handleSearch = useCallback((paramName: string, query: string) => {
    setSearchParams((prev) => {
      if (!query) {
        const next = { ...prev };
        delete next[paramName];
        return next;
      }
      return { ...prev, [paramName]: query };
    });
  }, []);

  const {
    data,
    columns,
    columnVisibility,
    isLoading,
    error,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    onExpand,
    onAction,
    executeNode,
  } = useDAGTable(
    config,
    engine,
    // searchParams merged into params so React Query key includes them → triggers refetch
    { ...params, ...searchParams },
  );

  // Two-source merge: config commands (lowest priority) + consumer prop (highest priority)
  const mergedToolbarCommands = useMemo(
    () => mergeToolbarCommands(config.toolbarCommands ?? [], consumerToolbarCommands),
    [config.toolbarCommands, consumerToolbarCommands],
  );

  // Strip engine-only feature fields before passing to DataGrid
  const {
    columnOrdering: _co,
    columnResizing: _cr,
    columnVisibility: _cv,
    ...gridFeatures
  } = config.features ?? {};

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Failed to load table</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    );
  }

  const gridMode =
    config.mode === "infinite" ? ("flat" as const) : config.mode;

  return (
    <DataGrid
      data={data}
      columns={columns}
      mode={gridMode}
      features={gridFeatures}
      density={config.density}
      isLoading={isLoading}
      initialColumnVisibility={columnVisibility}
      isFetchingNextPage={isFetchingNextPage}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      onExpand={onExpand}
      className={className}
      // Toolbar wiring
      toolbarCommands={
        consumerToolbarCommands !== undefined || mergedToolbarCommands.length > 0
          ? mergedToolbarCommands
          : undefined
      }
      toolbarClassName={toolbarClassName}
      onAction={onAction}
      onExecuteNode={executeNode}
      onSearch={handleSearch}
    />
  );
}
```

- [ ] **Step 2: Run full build**

```bash
npm run build 2>&1 | head -60
```

Expected: clean build (no TypeScript errors). If errors remain, investigate and fix before proceeding.

- [ ] **Step 3: Run all toolbar + action tests**

```bash
npx vitest run src/components/data-grid/toolbar/ src/components/data-grid/table-engine/__tests__/action-node.test.ts
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/components/data-grid/table-engine/configured-table.tsx
git commit -m "refactor(configured-table): two-source merge, remove actionDefToToolbarCommand, wire executeNode"
```

---

## Chunk 5: Config Examples + Final Verification

---

### Task 13: Update `eng-search.config.ts` — add `toolbarCommands`

**Files:**
- Modify: `src/features/xen/configs/eng-search.config.ts`

- [ ] **Step 1: Add `toolbarCommands` to the config**

```ts
// src/features/xen/configs/eng-search.config.ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

export const engSearchConfig: DAGTableConfig = {
  tableId: "eng-search",
  mode: "infinite",

  toolbarCommands: [
    {
      id: "search",
      type: "search",
      enabled: true,
      align: "left",
      // action present → server-side mode: onSearch('searchStr', value) → React Query refetch
      action: "root-api",
      queryParamName: "searchStr", // matches $params.searchStr in DAG queryParams
      placeholder: "Search engineering items...",
      debounceMs: 400,
    },
    { id: "spacer", type: "spacer", enabled: true },
    {
      id: "refresh",
      type: "command",
      enabled: true,
      align: "right",
      icon: "RefreshCw",
    },
    {
      id: "columnVisibility",
      type: "menu",
      enabled: true,
      align: "right",
      label: "Columns",
      icon: "Columns3",
      commands: [], // Built-in renderer matched by id — commands[] unused at render time
    },
  ],

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
            $top: "50",
            $skip: '$:$exists($params.cursor) ? $params.cursor : "0"',
            $mask: "dskern:Mask.Default",
          },
          paginationConfig: {
            type: "offset",
            pageParam: "$skip",
            pageSizeParam: "$top",
          },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          responseTransform: `
            member.{
              "id":           id,
              "name":         name,
              "title":        title,
              "type":         type,
              "revision":     revision,
              "state":        state,
              "owner":        owner,
              "organization": organization,
              "collabspace":  collabspace,
              "created":      created,
              "modified":     modified
            }
          `,
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true, filterable: true },
            { field: "title", header: "Title", sortable: true, filterable: true },
            { field: "type", header: "Type" },
            { field: "revision", header: "Rev" },
            {
              field: "state",
              header: "State",
              renderType: "badge",
              classNameCell: "text-sm text-red-600",
              classNameHeader: "font-bold",
            },
            { field: "owner", header: "Owner" },
            { field: "organization", header: "Organization" },
            { field: "collabspace", header: "Collab Space" },
            { field: "created", header: "Created", type: "date" },
            { field: "modified", header: "Modified", type: "date" },
          ],
        },
      },
    ],

    edges: [{ from: "root-api", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
    columnResizing: { enabled: true },
    columnVisibility: { enabled: true },
    selection: { enabled: true, mode: "multi" },
  },
};
```

- [ ] **Step 2: Check TypeScript**

```bash
npm run build 2>&1 | grep "eng-search" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/xen/configs/eng-search.config.ts
git commit -m "feat(eng-search): add toolbarCommands — server-side search, refresh, column visibility"
```

---

### Task 14: Update `eng-expand.config.ts` — add `toolbarCommands` + `expand-all-api` node

**Files:**
- Modify: `src/features/xen/configs/eng-expand.config.ts`

- [ ] **Step 1: Update the config**

```ts
// src/features/xen/configs/eng-expand.config.ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

const EXPAND_URL =
  '$:"/resources/v1/modeler/dseng/dseng:EngItem/" & $params.nodeId & "/expand"';

const EXPAND_RESPONSE_TRANSFORM = `
  member[type = "VPMReference" and id != $params.nodeId].{
    "id":           id,
    "name":         name,
    "title":        title,
    "type":         type,
    "revision":     revision,
    "state":        state,
    "owner":        owner,
    "organization": organization,
    "collabspace":  collabspace,
    "created":      created,
    "modified":     modified,
    "_hasChildren": true
  }
`;

export const engExpandConfig: DAGTableConfig = {
  tableId: "eng-expand",
  mode: "tree",

  toolbarCommands: [
    {
      id: "expandAllDeep",
      type: "command",
      enabled: true,
      align: "left",
      label: "Expand All",
      icon: "ChevronsUpDown",
      // Fires expand-all-api directly with expandDepth: -1 and withPath: true
      action: "expand-all-api",
    },
    {
      id: "collapseAll",
      type: "command",
      enabled: true,
      align: "left",
      label: "Collapse All",
      icon: "Minimize2",
      // No action in config — requires ctx.collapseAll() which is a function.
      // Consumer must override via props.toolbarCommands:
      //   { id: 'collapseAll', type: 'command', handler: async (ctx) => ctx.collapseAll?.() }
      disabled: true, // safe default until consumer wires a handler
    },
    { id: "spacer", type: "spacer", enabled: true },
    {
      id: "refresh",
      type: "command",
      enabled: true,
      align: "right",
      icon: "RefreshCw",
    },
  ],

  dag: {
    nodes: [
      // ── Initial-wave nodes ────────────────────────────────────────────────

      {
        id: "root-api",
        type: "api",
        config: {
          url: EXPAND_URL,
          method: "POST",
          authAdapterId: "wafdata",
          body: { expandDepth: 1, withPath: true },
          responseTransform: EXPAND_RESPONSE_TRANSFORM,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      },

      {
        id: "row-expand",
        type: "rowExpand",
        config: {
          triggerOnExpand: true,
          childApiNodeId: "child-expand-api",
          childKeyExpr: "$:$row.id",
          childQueryParam: "nodeId",
          maxDepth: 10,
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true, filterable: true },
            { field: "title", header: "Title", sortable: true, filterable: true },
            { field: "type", header: "Type" },
            { field: "revision", header: "Rev" },
            { field: "state", header: "State", renderType: "badge" },
            { field: "owner", header: "Owner" },
            { field: "organization", header: "Organization" },
            { field: "collabspace", header: "Collab Space" },
            { field: "created", header: "Created", type: "date" },
            { field: "modified", header: "Modified", type: "date" },
          ],
        },
      },

      // ── Lazy node (per-row expand) ─────────────────────────────────────────

      {
        id: "child-expand-api",
        type: "api",
        config: {
          url: EXPAND_URL,
          method: "POST",
          authAdapterId: "wafdata",
          body: { expandDepth: 1, withPath: true },
          responseTransform: EXPAND_RESPONSE_TRANSFORM,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      },

      // ── Toolbar node: deep expand (NOT in edges — fired on-demand) ─────────

      {
        id: "expand-all-api",
        type: "api",
        config: {
          url: EXPAND_URL,
          method: "POST",
          authAdapterId: "wafdata",
          body: { expandDepth: -1, withPath: true }, // deep expand — all descendants
          responseTransform: EXPAND_RESPONSE_TRANSFORM,
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
        },
      },
    ],

    edges: [
      { from: "root-api", to: "row-expand" },
      { from: "row-expand", to: "columns" },
      // expand-all-api is NOT in edges — fired on-demand from toolbar
    ],

    // rootNodeId is the terminal output node (produces final column definitions),
    // not the DAG entry point. Matches existing convention.
    rootNodeId: "columns",
  },

  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
    columnResizing: { enabled: true },
    columnVisibility: { enabled: true },
    selection: { enabled: true, mode: "multi" },
  },
};
```

- [ ] **Step 2: Check TypeScript**

```bash
npm run build 2>&1 | grep "eng-expand" | head -20
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/xen/configs/eng-expand.config.ts
git commit -m "feat(eng-expand): add toolbarCommands — expand-all-api deep expand + collapseAll stub"
```

---

### Task 15: Final full verification

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```

Expected: all tests PASS. Note which test files ran — should include at minimum:
- `toolbar/__tests__/merge-toolbar-commands.test.ts`
- `toolbar/__tests__/toolbar-defaults.test.ts`
- `table-engine/__tests__/action-node.test.ts`
- All other existing tests (dag-engine, registries, etc.)

- [ ] **Step 2: Run Biome check**

```bash
npm run check
```

Expected: no linting or formatting errors. If there are auto-fixable issues:

```bash
npm run check -- --write
git add -A
git commit -m "style: biome auto-fix after toolbar redesign"
```

- [ ] **Step 3: Run full build**

```bash
npm run build
```

Expected: clean build with no TypeScript errors.

- [ ] **Step 4: Final commit if needed**

If any loose changes remain:

```bash
git add -A
git commit -m "chore: final cleanup after toolbar redesign implementation"
```

---

## Summary

The implementation proceeds in 5 chunks:

1. **Types** — pure type changes, no runtime impact
2. **DAG + DataGrid wiring** — `executeNode` added, `onExecuteNode` prop threaded through DataGrid, `executeApiNode` in context rewired
3. **Toolbar renderers** — all renderer files updated to use discriminated union; `action` fallback chain added to `CommandButton` and `CommandMenu`
4. **Merge + ConfiguredTable** — two-source merge replaces three-source; `actionDefToToolbarCommand` deleted
5. **Config examples + tests** — both xen configs gain `toolbarCommands`; all affected tests updated
