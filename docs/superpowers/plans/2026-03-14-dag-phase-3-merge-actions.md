# DAG Table Engine — Phase 3: Merge, Actions, Bootstrap, Cleanup

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add MergeNode (concat/join/merge strategies), ActionNode (pass-through on init, trigger-on-demand), update ColumnNode to render an actions column, complete the bootstrap factory, replace `configured-table.tsx` and `index.ts`. Legacy files were already deleted in Phase 2 Task 6.

**Prerequisite:** Phase 2 (`2026-03-14-dag-phase-2-nodes-hook.md`) must be complete.

**Architecture:** `ActionNodeExecutor` is a pure pass-through on initial wave — it registers action declarations in context. Action execution at trigger-time is handled by `useDAGTable.onAction` which looks up lazy ApiNodes directly from `config.dag.nodes`. `MergeNodeExecutor` reads from any combination of api/transform/merge sources already in context.

**Tech Stack:** TypeScript 5, React 19, TanStack Query v5, Vitest 3, Biome

**Spec:** `docs/superpowers/specs/2026-03-14-dag-table-engine-design.md`

**Previous phase:** `docs/superpowers/plans/2026-03-14-dag-phase-2-nodes-hook.md`
**Next phase:** `docs/superpowers/plans/2026-03-14-dag-phase-4-bom-configs.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/data-grid/table-engine/nodes/merge-node.ts` | Create |
| `src/components/data-grid/table-engine/nodes/action-node.ts` | Create |
| `src/components/data-grid/table-engine/nodes/column-node.ts` | Modify — add action column rendering |
| `src/components/data-grid/table-engine/hooks/use-dag-table.ts` | Modify — add onAction handler |
| `src/components/data-grid/table-engine/bootstrap.ts` | Update — register merge + action |
| `src/components/data-grid/table-engine/configured-table.tsx` | Replace |
| `src/components/data-grid/table-engine/index.ts` | Replace |
| `src/components/data-grid/table-engine/__tests__/merge-node.test.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/action-node.test.ts` | Create |

---

## Task 1: MergeNode

**Files:**
- Create: `src/components/data-grid/table-engine/nodes/merge-node.ts`
- Create: `src/components/data-grid/table-engine/__tests__/merge-node.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/components/data-grid/table-engine/__tests__/merge-node.test.ts
import { describe, it, expect } from 'vitest'
import { MergeNodeExecutor } from '../nodes/merge-node'
import { NodeContext } from '../core/node-context'
import type { MergeNodeConfig } from '../types/table.types'

const executor = new MergeNodeExecutor()

function ctxWithApi(id: string, rows: object[]) {
  const ctx = new NodeContext()
  ctx.set(id, 'api', { rows: rows as import('../types/table.types').GridRow[] })
  return ctx
}

describe('MergeNodeExecutor — concat', () => {
  it('concatenates rows from two api sources in declaration order', async () => {
    const ctx = new NodeContext()
    ctx.set('a', 'api', { rows: [{ id: '1' }, { id: '2' }] })
    ctx.set('b', 'api', { rows: [{ id: '3' }] })
    const config: MergeNodeConfig = { sourceNodeIds: ['a', 'b'], strategy: 'concat' }
    const result = await executor.execute(config, ctx, [])
    expect(result).toHaveLength(3)
    expect(result.map(r => r.id)).toEqual(['1', '2', '3'])
  })

  it('handles one empty source', async () => {
    const ctx = new NodeContext()
    ctx.set('a', 'api', { rows: [{ id: '1' }] })
    ctx.set('b', 'api', { rows: [] })
    const config: MergeNodeConfig = { sourceNodeIds: ['a', 'b'], strategy: 'concat' }
    const result = await executor.execute(config, ctx, [])
    expect(result).toHaveLength(1)
  })

  it('can concat from transform-type source', async () => {
    const ctx = new NodeContext()
    ctx.set('t', 'transform', [{ id: 'x' }])
    ctx.set('a', 'api', { rows: [{ id: 'y' }] })
    const config: MergeNodeConfig = { sourceNodeIds: ['t', 'a'], strategy: 'concat' }
    const result = await executor.execute(config, ctx, [])
    expect(result.map(r => r.id)).toEqual(['x', 'y'])
  })
})

describe('MergeNodeExecutor — join', () => {
  it('left-joins rows on joinKey, spreading matched fields', async () => {
    const ctx = new NodeContext()
    ctx.set('a', 'api', { rows: [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }] })
    ctx.set('b', 'api', { rows: [{ id: '1', dept: 'Eng' }] })
    const config: MergeNodeConfig = { sourceNodeIds: ['a', 'b'], strategy: 'join', joinKey: 'id' }
    const result = await executor.execute(config, ctx, [])
    expect(result[0]).toMatchObject({ id: '1', name: 'Alice', dept: 'Eng' })
    // Unmatched left row included without extra fields
    expect(result[1]).toMatchObject({ id: '2', name: 'Bob' })
    expect(result[1].dept).toBeUndefined()
  })

  it('throws when joinKey is missing from config', async () => {
    const ctx = new NodeContext()
    ctx.set('a', 'api', { rows: [{ id: '1' }] })
    ctx.set('b', 'api', { rows: [{ id: '1' }] })
    const config: MergeNodeConfig = { sourceNodeIds: ['a', 'b'], strategy: 'join' }
    await expect(executor.execute(config, ctx, [])).rejects.toThrow()
  })
})

describe('MergeNodeExecutor — merge', () => {
  it('merges rows pair-wise by index using Object.assign', async () => {
    const ctx = new NodeContext()
    ctx.set('a', 'api', { rows: [{ id: '1', x: 1 }] })
    ctx.set('b', 'api', { rows: [{ id: '1', y: 2 }] })
    const config: MergeNodeConfig = { sourceNodeIds: ['a', 'b'], strategy: 'merge' }
    const result = await executor.execute(config, ctx, [])
    expect(result[0]).toMatchObject({ id: '1', x: 1, y: 2 })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/merge-node.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement MergeNodeExecutor**

```ts
// src/components/data-grid/table-engine/nodes/merge-node.ts
import type { INodeExecutor } from '../core/node-registry'
import type { NodeContext } from '../core/node-context'
import type { DAGNode } from '../types/dag.types'
import type { MergeNodeConfig, GridRow } from '../types/table.types'

/** Extract rows from a node in context regardless of whether it's api/transform/merge. */
function extractRows(context: NodeContext, id: string): GridRow[] {
  if (!context.has(id)) return []
  const entry = context.getAll().get(id)
  if (entry?.type === 'api')       return context.get(id, 'api').rows
  if (entry?.type === 'transform') return context.get(id, 'transform')
  if (entry?.type === 'merge')     return context.get(id, 'merge')
  return []
}

export class MergeNodeExecutor implements INodeExecutor<'merge'> {
  async execute(
    config: MergeNodeConfig,
    context: NodeContext,
    _allNodes: DAGNode[]
  ): Promise<GridRow[]> {
    const sources = config.sourceNodeIds.map(id => extractRows(context, id))

    switch (config.strategy) {
      case 'concat': {
        return sources.flat()
      }

      case 'join': {
        if (!config.joinKey) {
          throw new Error(`MergeNode: "join" strategy requires a joinKey`)
        }
        const [primary, ...rest] = sources
        return primary.map(row => {
          const merged: GridRow = { ...row }
          for (const source of rest) {
            const match = source.find(
              r => r[config.joinKey!] === row[config.joinKey!]
            )
            if (match) Object.assign(merged, match)
          }
          return merged
        })
      }

      case 'merge': {
        const maxLen = Math.max(0, ...sources.map(s => s.length))
        return Array.from({ length: maxLen }, (_, i) => {
          const merged: GridRow = { id: sources[0][i]?.id ?? String(i) }
          for (const source of sources) {
            if (source[i]) Object.assign(merged, source[i])
          }
          return merged
        })
      }

      default: {
        return sources.flat()
      }
    }
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/merge-node.test.ts
```

Expected: PASS — 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/nodes/merge-node.ts \
        src/components/data-grid/table-engine/__tests__/merge-node.test.ts
git commit -m "feat(table-engine): add MergeNodeExecutor — concat/join/merge strategies"
```

---

## Task 2: ActionNode

**Files:**
- Create: `src/components/data-grid/table-engine/nodes/action-node.ts`
- Create: `src/components/data-grid/table-engine/__tests__/action-node.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/components/data-grid/table-engine/__tests__/action-node.test.ts
import { describe, it, expect } from 'vitest'
import { ActionNodeExecutor } from '../nodes/action-node'
import { NodeContext } from '../core/node-context'
import type { ActionNodeConfig } from '../types/table.types'

const executor = new ActionNodeExecutor()

describe('ActionNodeExecutor', () => {
  it('passes rowActions through from config', async () => {
    const config: ActionNodeConfig = {
      rowActions: [
        { id: 'promote', label: 'Promote', apiNodeId: 'promote-api' },
      ],
    }
    const result = await executor.execute(config, new NodeContext(), [])
    expect(result.rowActions).toHaveLength(1)
    expect(result.rowActions[0].id).toBe('promote')
    expect(result.rowActions[0].apiNodeId).toBe('promote-api')
  })

  it('passes toolbarActions through from config', async () => {
    const config: ActionNodeConfig = {
      toolbarActions: [{ id: 'export', label: 'Export', apiNodeId: 'export-api' }],
    }
    const result = await executor.execute(config, new NodeContext(), [])
    expect(result.toolbarActions).toHaveLength(1)
    expect(result.toolbarActions[0].id).toBe('export')
  })

  it('defaults to empty arrays when config has no actions', async () => {
    const result = await executor.execute({}, new NodeContext(), [])
    expect(result.rowActions).toEqual([])
    expect(result.toolbarActions).toEqual([])
    expect(result.cellActions).toEqual([])
  })

  it('all three action lists are independent', async () => {
    const config: ActionNodeConfig = {
      rowActions:     [{ id: 'r', label: 'Row',     apiNodeId: 'r-api' }],
      toolbarActions: [{ id: 't', label: 'Toolbar',  apiNodeId: 't-api' }],
      cellActions:    [{ id: 'c', label: 'Cell',    apiNodeId: 'c-api' }],
    }
    const result = await executor.execute(config, new NodeContext(), [])
    expect(result.rowActions).toHaveLength(1)
    expect(result.toolbarActions).toHaveLength(1)
    expect(result.cellActions).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/action-node.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ActionNodeExecutor**

```ts
// src/components/data-grid/table-engine/nodes/action-node.ts
import type { INodeExecutor } from '../core/node-registry'
import type { NodeContext } from '../core/node-context'
import type { DAGNode } from '../types/dag.types'
import type { ActionNodeConfig, ActionOutput } from '../types/table.types'

/**
 * ActionNodeExecutor is a pure pass-through on the initial wave.
 * It reads the ActionNodeConfig declarations and stores them in NodeContext
 * as ActionOutput — no API calls are made here.
 *
 * Action firing happens in useDAGTable.onAction(), which:
 * 1. Reads ActionOutput from context to find the ActionDef
 * 2. Looks up the lazy ApiNode in dag.nodes[] by actionDef.apiNodeId
 * 3. Executes it directly with a row-scoped context
 */
export class ActionNodeExecutor implements INodeExecutor<'action'> {
  async execute(
    config: ActionNodeConfig,
    _context: NodeContext,
    _allNodes: DAGNode[]
  ): Promise<ActionOutput> {
    return {
      rowActions:     config.rowActions     ?? [],
      toolbarActions: config.toolbarActions ?? [],
      cellActions:    config.cellActions    ?? [],
    }
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/action-node.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/nodes/action-node.ts \
        src/components/data-grid/table-engine/__tests__/action-node.test.ts
git commit -m "feat(table-engine): add ActionNodeExecutor — config pass-through, no API on init"
```

---

## Task 3: Update bootstrap.ts + Add onAction to useDAGTable

**Files:**
- Modify: `src/components/data-grid/table-engine/bootstrap.ts`
- Modify: `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] **Step 1: Update bootstrap.ts to register MergeNode and ActionNode**

Replace the file at `src/components/data-grid/table-engine/bootstrap.ts`:

```ts
// src/components/data-grid/table-engine/bootstrap.ts
import { DAGEngine } from './core/dag-engine'
import { NodeRegistry } from './core/node-registry'
import { AuthAdapterRegistry } from './core/auth-registry'
import { ApiNodeExecutor } from './nodes/api-node'
import { ColumnNodeExecutor } from './nodes/column-node'
import { RowExpandNodeExecutor } from './nodes/row-expand-node'
import { TransformNodeExecutor } from './nodes/transform-node'
import { MergeNodeExecutor } from './nodes/merge-node'
import { ActionNodeExecutor } from './nodes/action-node'
import { WAFDataAuthAdapter } from './adapters/wafdata-auth-adapter'
import { BearerAuthAdapter } from './adapters/bearer-auth-adapter'
import { NoAuthAdapter } from './adapters/no-auth-adapter'

export function createDefaultEngine(bearerToken?: string): DAGEngine {
  const auth = new AuthAdapterRegistry()
    .register('wafdata', new WAFDataAuthAdapter())
    .register('bearer',  new BearerAuthAdapter(bearerToken ?? ''))
    .register('none',    new NoAuthAdapter())

  const nodeReg = new NodeRegistry()
    .register('api',       new ApiNodeExecutor(auth))
    .register('transform', new TransformNodeExecutor())
    .register('column',    new ColumnNodeExecutor())
    .register('rowExpand', new RowExpandNodeExecutor(nodeReg))
    .register('merge',     new MergeNodeExecutor())
    .register('action',    new ActionNodeExecutor())

  return new DAGEngine(nodeReg, auth)
}
```

- [ ] **Step 2: Add `getAuthRegistry()` to DAGEngine**

Open `src/components/data-grid/table-engine/core/dag-engine.ts`. Add a public getter so `onAction` can access the auth registry without casting private fields:

```ts
  getAuthRegistry(): AuthAdapterRegistry {
    return this.authRegistry
  }
```

- [ ] **Step 3: Add onAction to use-dag-table.ts**

Open `src/components/data-grid/table-engine/hooks/use-dag-table.ts`.
Locate the return statement and add `onAction`. Also add the `onAction` implementation before the return:

```ts
// Add these imports at the top of use-dag-table.ts (after existing imports):
import { ApiNodeExecutor } from '../nodes/api-node'
import { useQueryClient } from '@tanstack/react-query'
```

Add `onAction` implementation inside the hook body, after the `onExpand` block:

```ts
  // ── onAction handler ─────────────────────────────────────────────────────
  const queryClient = useQueryClient()

  const onAction = useCallback(async (actionId: string, row?: GridRow) => {
    const ctx = ctxRef.current
    if (!ctx) return

    // 1. Find ActionNode in DAG to locate the ActionDef
    const actionNode = config.dag.nodes.find(n => n.type === 'action')
    if (!actionNode || !ctx.has(actionNode.id)) return

    const actionOutput = ctx.get(actionNode.id, 'action')
    const allActions = [
      ...actionOutput.rowActions,
      ...actionOutput.toolbarActions,
      ...actionOutput.cellActions,
    ]
    const actionDef = allActions.find(a => a.id === actionId)
    if (!actionDef) return

    // 2. Look up lazy ApiNode by actionDef.apiNodeId
    const lazyApiNode = config.dag.nodes.find(
      n => n.id === actionDef.apiNodeId && n.type === 'api'
    )
    if (!lazyApiNode) return

    // 3. Execute the lazy ApiNode with row context
    const rowCtx = row ? ctx.withRow(row) : ctx
    const apiExecutor = new ApiNodeExecutor(engine.getAuthRegistry())
    await apiExecutor.execute(lazyApiNode.config as import('../types/table.types').ApiNodeConfig, rowCtx, config.dag.nodes)

    // 4. Invalidate query cache to trigger re-fetch
    await queryClient.invalidateQueries({ queryKey: [config.tableId] })
  }, [config, engine, queryClient])
```

Update the return statement to include `onAction`:

```ts
  return {
    data: finalRows,
    columns: finalColOutput.columns,
    columnVisibility: finalColOutput.visibility,
    isLoading,
    isFetchingNextPage,
    error,
    pagination,
    hasNextPage:   mode === 'infinite' ? infiniteQuery.hasNextPage  : undefined,
    fetchNextPage: mode === 'infinite' ? infiniteQuery.fetchNextPage : undefined,
    onExpand,
    onAction,
  }
```

- [ ] **Step 4: Run all tests — verify still passing**

```bash
npx vitest run src/components/data-grid/table-engine/
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/bootstrap.ts \
        src/components/data-grid/table-engine/hooks/use-dag-table.ts \
        src/components/data-grid/table-engine/core/dag-engine.ts
git commit -m "feat(table-engine): complete bootstrap (merge+action), add onAction to useDAGTable"
```

---

## Task 4: Replace configured-table.tsx and index.ts

**Files:**
- Replace: `src/components/data-grid/table-engine/configured-table.tsx`
- Replace: `src/components/data-grid/table-engine/index.ts`

- [ ] **Step 1: Replace `configured-table.tsx`**

```tsx
// src/components/data-grid/table-engine/configured-table.tsx
import { useMemo } from 'react'
import { DataGrid } from '@/components/data-grid/data-grid'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { useDAGTable } from './hooks/use-dag-table'
import { createDefaultEngine } from './bootstrap'
import type { DAGTableConfig } from './types/table.types'

export interface ConfiguredTableProps {
  config: DAGTableConfig
  className?: string
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
 */
export function ConfiguredTable({ config, className }: ConfiguredTableProps) {
  // One engine instance per table mount — createDefaultEngine is cheap
  const engine = useMemo(() => createDefaultEngine(), [])

  const {
    data,
    columns,
    columnVisibility,
    isLoading,
    error,
    isFetchingNextPage,
    onExpand,
  } = useDAGTable(config, engine)

  // Strip engine-only feature fields before passing to DataGrid
  const {
    columnOrdering: _co,
    columnResizing:  _cr,
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

  return (
    <DataGrid
      data={data}
      columns={columns}
      mode={config.mode}
      features={gridFeatures}
      density={config.density}
      isLoading={isLoading}
      initialColumnVisibility={columnVisibility}
      isFetchingNextPage={isFetchingNextPage}
      onExpand={onExpand}
      className={className}
    />
  )
}
```

- [ ] **Step 2: Replace `index.ts`**

```ts
// src/components/data-grid/table-engine/index.ts
// Public API barrel — import from here, not from internal paths

// ── Components ────────────────────────────────────────────────────────────────
export { ConfiguredTable } from './configured-table'
export type { ConfiguredTableProps } from './configured-table'

// ── Engine factory ────────────────────────────────────────────────────────────
export { createDefaultEngine } from './bootstrap'

// ── Core classes (for custom engine setups) ───────────────────────────────────
export { DAGEngine }           from './core/dag-engine'
export { NodeRegistry }        from './core/node-registry'
export { AuthAdapterRegistry } from './core/auth-registry'
export { NodeContext }         from './core/node-context'
export { DAGValidationError, DAGExecutionError } from './core/dag-validator'

// ── Hook ──────────────────────────────────────────────────────────────────────
export { useDAGTable } from './hooks/use-dag-table'

// ── Auth adapters (for custom engine setups) ──────────────────────────────────
export { WAFDataAuthAdapter } from './adapters/wafdata-auth-adapter'
export { BearerAuthAdapter }  from './adapters/bearer-auth-adapter'
export { NoAuthAdapter }      from './adapters/no-auth-adapter'

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  DAGTableConfig,
  DAGTableResult,
  DAGFeaturesConfig,
  ColumnDef,
  ColumnNodeConfig,
  ApiNodeConfig,
  RowExpandNodeConfig,
  ActionNodeConfig,
  ActionDef,
  MergeNodeConfig,
  TransformNodeConfig,
  GridRow,
  GridColumnDef,
} from './types/table.types'

export type {
  DAGConfig,
  DAGNode,
  DAGEdge,
  NodeType,
  NodeConfigMap,
  NodeOutputMap,
  JsonataExpr,
  JsonValue,
  JsonPrimitive,
} from './types/dag.types'

export type { IAuthAdapter } from './types/auth.types'
export type { INodeExecutor } from './core/node-registry'
```

> **Note:** `src/components/data-grid/index.ts` was already updated in Phase 2 Task 6 to re-export from `./table-engine`. No changes needed here.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "table-engine" | head -20
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/data-grid/table-engine/configured-table.tsx \
        src/components/data-grid/table-engine/index.ts
git commit -m "feat(table-engine): replace ConfiguredTable and barrel index with DAG-based versions"
```

---

## Phase 3 Complete — Verification

- [ ] **Run all table-engine tests**

```bash
npx vitest run src/components/data-grid/table-engine/
```

Expected: All tests pass.

- [ ] **Run full build**

```bash
npm run build
```

Expected: Build succeeds.
