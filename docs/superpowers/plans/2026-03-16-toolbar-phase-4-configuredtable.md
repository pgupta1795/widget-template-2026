# Toolbar System — Phase 4: ConfiguredTable Integration

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the toolbar system into `ConfiguredTable` so that DAG `toolbarActions` are automatically converted to `ToolbarCommand[]`, `onAction` and `onSearch` are properly threaded, and consumers can extend or override DAG-generated commands via a `toolbarCommands` prop.

**Architecture:** `ConfiguredTable` gains `toolbarCommands?` and `toolbarClassName?` props. It internally owns `searchParams` state for server-side search, converts DAG `toolbarActions` to `ToolbarCommand[]`, merges them with consumer overrides, and passes everything to `DataGrid`.

**Tech Stack:** React 19, TanStack Query v5 (query key includes searchParams for refetch), shadcn/ui

**Prerequisites:** Phases 1–3 complete.

**Spec:** `docs/superpowers/specs/2026-03-16-toolbar-customization-design.md`

---

## Chunk 1: ConfiguredTable Wiring

### Task 1: Update configured-table.tsx

**Files:**
- Modify: `src/components/data-grid/table-engine/configured-table.tsx`

This is the main change for Phase 4. The file needs to:
1. Accept `toolbarCommands?` and `toolbarClassName?` props
2. Own `searchParams` state for server-side search
3. Extract `toolbarActions` from the DAG result and convert them to `ToolbarCommand[]`
4. Merge DAG commands with consumer-provided `toolbarCommands` via `mergeToolbarCommands`
5. Pass `onAction`, `onSearch`, `toolbarCommands`, `toolbarClassName` to `DataGrid`

- [ ] **Step 1: Read the current file**

Read `src/components/data-grid/table-engine/configured-table.tsx` to understand the current structure.

- [ ] **Step 2: Rewrite the file**

```tsx
// src/components/data-grid/table-engine/configured-table.tsx
import { DataGrid } from '@/components/data-grid/data-grid'
import { mergeToolbarCommands } from '@/components/data-grid/toolbar/merge-toolbar-commands'
import type { ToolbarCommand } from '@/components/data-grid/toolbar/toolbar.types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useCallback, useMemo, useState } from 'react'
import { createDefaultEngine } from './bootstrap'
import { useDAGTable } from './hooks/use-dag-table'
import type { JsonPrimitive } from './types/dag.types'
import type { ActionDef, DAGTableConfig } from './types/table.types'

export interface ConfiguredTableProps {
  config: DAGTableConfig
  className?: string
  params?: Record<string, JsonPrimitive>
  /**
   * Extends or overrides DAG-generated toolbar commands.
   * Matching id: consumer command fully replaces the DAG command.
   * New id: appended after DAG commands.
   */
  toolbarCommands?: ToolbarCommand[]
  /** CSS classes for the toolbar bar element */
  toolbarClassName?: string
}

/**
 * Converts a DAG ActionDef to a ToolbarCommand.
 * Icon is a string in DAG config — resolved to a Lucide component at render time.
 */
function actionDefToToolbarCommand(
  action: ActionDef,
  onAction: (actionId: string) => Promise<void>,
): ToolbarCommand {
  return {
    id: action.id,
    type: 'command',
    enabled: true,
    label: action.label,
    // String icon — resolveLucideIcon handles the lookup at render time in ToolbarRenderer.
    // We store the string here (JSON-serializable, works with DAG config).
    icon: action.icon,
    handler: async () => onAction(action.id),
  }
}

/**
 * Declarative table component. Pass a DAGTableConfig and get a fully-featured DataGrid.
 *
 * Handles:
 * - DAG-based API fetching with topological wave execution
 * - JSONata data transforms and per-cell derived values
 * - Flat, Paginated, Infinite, and Tree modes
 * - Lazy row expansion via RowExpandNode
 * - Row/toolbar/cell actions via ActionNode
 * - Toolbar customization via toolbarCommands prop
 */
export function ConfiguredTable({
  config,
  className,
  params,
  toolbarCommands: consumerToolbarCommands,
  toolbarClassName,
}: ConfiguredTableProps) {
  // One engine instance per table mount
  const engine = useMemo(() => createDefaultEngine(), [])

  // Server-side search state — keyed by queryParamName for multi-search support
  const [searchParams, setSearchParams] = useState<Record<string, string>>({})

  const handleSearch = useCallback((paramName: string, query: string) => {
    setSearchParams((prev) => {
      if (!query) {
        const next = { ...prev }
        delete next[paramName]
        return next
      }
      return { ...prev, [paramName]: query }
    })
  }, [])

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
  } = useDAGTable(
    config,
    engine,
    // searchParams merged into params so React Query key includes them → triggers refetch
    { ...params, ...searchParams },
  )

  // Convert DAG toolbarActions → ToolbarCommand[]
  // onAction is stable (useCallback in useDAGTable), so this memo re-runs only on config change
  const dagToolbarCommands = useMemo<ToolbarCommand[]>(() => {
    const actionNode = config.dag.nodes.find((n) => n.type === 'action')
    if (!actionNode || actionNode.type !== 'action') return []
    const toolbarActions: ActionDef[] = actionNode.config.toolbarActions ?? []
    return toolbarActions.map((action) =>
      actionDefToToolbarCommand(action, (id) =>
        onAction ? onAction(id) : Promise.resolve(),
      ),
    )
  }, [config.dag.nodes, onAction])

  // Merge DAG commands with consumer overrides (consumer wins on matching id)
  const mergedToolbarCommands = useMemo(
    () => mergeToolbarCommands(dagToolbarCommands, consumerToolbarCommands),
    [dagToolbarCommands, consumerToolbarCommands],
  )

  // Strip engine-only feature fields before passing to DataGrid
  const {
    columnOrdering: _co,
    columnResizing: _cr,
    columnVisibility: _cv,
    ...gridFeatures
  } = config.features ?? {}

  if (error) {
    return (
      <Alert variant="destructive" className="m-4">
        <AlertTitle>Failed to load table</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  // For infinite mode: DataGrid's infinite query setup conflicts with useDAGTable's.
  // Pass data as flat mode but include fetchNextPage/hasNextPage for load-more support.
  const gridMode =
    config.mode === 'infinite' ? ('flat' as const) : config.mode

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
      // Pass undefined only when neither the DAG nor the consumer supplied any commands.
      // If consumer explicitly passes toolbarCommands={[]} we preserve the empty array
      // (empty toolbar bar rendered, not hidden) by checking consumerToolbarCommands !== undefined.
      toolbarCommands={
        consumerToolbarCommands !== undefined || mergedToolbarCommands.length > 0
          ? mergedToolbarCommands
          : undefined
      }
      toolbarClassName={toolbarClassName}
      onAction={onAction}
      onSearch={handleSearch}
    />
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template"
npx tsc --noEmit 2>&1 | grep "configured-table" | head -10
```

Expected: no errors.

**Common issue:** `onAction` from `useDAGTable` has type `((actionId: string, row?: GridRow) => Promise<void>) | undefined`. The `DataGridProps.onAction` field matches this type — no cast needed.

---

### Task 2: Verify existing xen tables still work

**Files:**
- Read only: `src/features/xen/configs/eng-search.config.ts`
- Read only: `src/features/xen/configs/eng-expand.config.ts`
- Read only: `src/features/xen/components/xen.tsx`

The existing xen tables use `ConfiguredTable` without toolbar commands — they should continue to work unchanged (no toolbar rendered because `mergedToolbarCommands` will be empty `[]`, and we pass `undefined` when empty).

- [ ] **Step 1: Read eng-search.config.ts**

Verify it has no `toolbarActions` in its DAG config. If it does, that's fine — they will be auto-converted.

- [ ] **Step 2: Read xen.tsx**

Verify `ConfiguredTable` usage. The component should compile without changes since `toolbarCommands` and `toolbarClassName` are optional new props.

- [ ] **Step 3: Run TypeScript check on xen files**

```bash
npx tsc --noEmit 2>&1 | grep "features/xen" | head -10
```

Expected: no errors.

---

## Chunk 2: Final Verification

### Task 3: Run full test suite and build

- [ ] **Step 1: Run all toolbar unit tests**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/
```

Expected: all 22 tests pass.

- [ ] **Step 2: Run table engine tests**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/
```

Expected: all existing tests still pass. No regressions.

- [ ] **Step 3: Run full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -v "src/main.tsx\|src/app/services\|openApiParser" | head -30
```

Expected: no errors in the data-grid or features directories.

- [ ] **Step 4: Run build**

```bash
npm run build 2>&1 | tail -30
```

Expected: build completes successfully.

- [ ] **Step 5: Run lint/format check**

```bash
npm run check 2>&1 | tail -20
```

Expected: no errors introduced by Phase 4 changes.

- [ ] **Step 6: Commit**

```bash
git add src/components/data-grid/table-engine/configured-table.tsx
git commit -m "feat: toolbar phase 4 — ConfiguredTable integration with DAG toolbarActions and server-side search"
```

---

## Usage Examples (for reference, no code changes needed)

### Standalone DataGrid with toolbar

```tsx
import {
  DEFAULT_SEARCH,
  DEFAULT_EXPORT,
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_REFRESH,
  TOOLBAR_DEFAULTS,
} from '@/components/data-grid/toolbar'
import type { ToolbarCommand } from '@/components/data-grid/toolbar'

<DataGrid
  columns={columns}
  data={data}
  toolbarCommands={[
    { ...DEFAULT_SEARCH, enabled: true, placeholder: 'Find records...' },
    { id: 'spacer', type: 'spacer', enabled: true },
    { ...DEFAULT_COLUMN_VISIBILITY, enabled: true },
    { ...DEFAULT_REFRESH, enabled: true },
    { ...DEFAULT_EXPORT, enabled: true },
    // Custom button
    {
      id: 'archive',
      type: 'command',
      enabled: true,
      align: 'right',
      label: 'Archive',
      icon: Archive,
      className: 'text-destructive hover:text-destructive',
      handler: async (ctx) => {
        if (!ctx.selectedRows.length) return
        await ctx.executeApiNode('archive-api')
        ctx.table.resetRowSelection()
      },
    },
  ]}
  onRefresh={refetch}
/>
```

### ConfiguredTable with DAG toolbarActions extended

```tsx
// DAG config has toolbarActions — they auto-convert to enabled commands.
// Consumer adds an extra button by passing toolbarCommands:
<ConfiguredTable
  config={myDagConfig}
  toolbarCommands={[
    // Override the auto-converted 'export' action with custom className
    { id: 'export', type: 'command', enabled: true, label: 'Export', icon: Download, className: 'text-primary', handler: async (ctx) => ctx.executeApiNode('export') },
    // Add a brand new command not in DAG
    { id: 'help', type: 'command', enabled: true, align: 'right', icon: HelpCircle, handler: async () => window.open('/docs') },
  ]}
/>
```

### Server-side search

```tsx
// In standalone DataGrid — consumer owns the search state
const [query, setQuery] = useState('')
const { data, refetch } = useQuery({
  queryKey: ['my-data', query],
  queryFn: () => fetchData({ q: query }),
})

<DataGrid
  columns={columns}
  data={data}
  toolbarCommands={[
    {
      ...DEFAULT_SEARCH,
      enabled: true,
      apiNodeId: 'search-node',   // triggers server-side path
      queryParamName: 'q',
      placeholder: 'Search by name...',
    },
  ]}
  onSearch={(paramName, value) => setQuery(value)}
/>
```

### ConfiguredTable server-side search (automatic)

```tsx
// ConfiguredTable handles searchParams state internally.
// Just add a search command with apiNodeId pointing to any ApiNode id.
// The queryParamName value will be injected as a DAG param.
<ConfiguredTable
  config={myConfig}
  toolbarCommands={[
    {
      ...DEFAULT_SEARCH,
      enabled: true,
      apiNodeId: 'search-api',    // any ApiNode id in the DAG
      queryParamName: 'q',        // injected as params.q into useDAGTable
    },
    { id: 'spacer', type: 'spacer', enabled: true },
    { ...DEFAULT_COLUMN_VISIBILITY, enabled: true },
  ]}
/>
// In the DAG ApiNodeConfig, reference: queryParams: { q: '$:$params.q' }
```
