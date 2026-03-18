# RowEnrich + ColumnHydrate — Design Spec

**Date:** 2026-03-18
**Branch:** tanstack-table-ui
**Status:** Approved

---

## Overview

Extend the existing DAG Table Engine with two new node types — `rowEnrich` and `columnHydrate` — that enable chained, lazy, parallel API calls after the root data loads.

**Goals:**
- Enrich every root row with supplemental API data in parallel (`rowEnrich`)
- Hydrate per-column cell data from independent API calls (`columnHydrate`)
- Progressive rendering: root rows display immediately; enriched/hydrated cells fill in as queries resolve
- Optional lazy mode per node and per column — controlled entirely via `DAGTableConfig`
- Optional query invalidation on success — configurable in the node config
- JSONata transform at merge time — reuses existing `evaluateExpr` from `jsonata-evaluator.ts`
- Toolbar-driven trigger for lazy enrichment — via `ToolbarContext.triggerEnrich/triggerHydrate`
- No test files
- No dead code — remove the two commented-out `queryClient.invalidateQueries` lines in `use-dag-table.ts`

**Non-goals:**
- Changing how `DAGEngine.execute()` works
- Modifying `src/services/` internals
- Adding any test files

---

## Architecture

```
DAGEngine.execute() — initial wave
    ├── root-api          → ApiNodeOutput { rows }
    ├── row-enrich        → RowEnrichNodeOutput { descriptors, childApiNodeId, ... }
    ├── column-hydrate    → ColumnHydrateNodeOutput { descriptors, columnEntries, ... }
    └── column            → ColumnNodeOutput { columns, visibility }
                                        ↓
useDAGTable (TanStack Query layer)
    ├── flatQuery (existing)             → finalRows, colOutput
    ├── useQueries — rowEnrich           → per-row enriched data (progressive)
    ├── useQueries — columnHydrate       → per-{row×column} hydrated data (progressive)
    └── useMemo chain                    → enrichedRows → hydratedRows → data
                                        ↓
ConfiguredTable → DataGrid → ToolbarContext
    (isEnriching, isHydrating, triggerEnrich, triggerHydrate)
```

The executor pattern follows `RowExpandNodeExecutor` exactly: executors run in the initial wave and return **descriptors** (plain data, no NodeContext). `useDAGTable` owns all TanStack Query lifecycle for per-row and per-column calls.

---

## Type System

### `dag.types.ts` additions

```ts
// NodeType
type NodeType =
  | 'api' | 'transform' | 'column' | 'rowExpand' | 'merge' | 'action'
  | 'rowEnrich'      // new
  | 'columnHydrate'  // new

// NodeConfigMap additions
interface NodeConfigMap {
  // ... existing entries ...
  rowEnrich:     RowEnrichNodeConfig
  columnHydrate: ColumnHydrateNodeConfig
}

// DAGNode union additions
type DAGNode =
  // ... existing variants ...
  | { id: string; type: 'rowEnrich';     config: RowEnrichNodeConfig }
  | { id: string; type: 'columnHydrate'; config: ColumnHydrateNodeConfig }
```

### `table.types.ts` additions

```ts
// ── RowEnrichNode ──────────────────────────────────────────────────────────────

interface RowEnrichDescriptor {
  rowKey: string
  rowData: GridRow   // plain data — no NodeContext stored
}

interface RowEnrichNodeConfig {
  /** Must reference an 'api', 'transform', or 'merge' node */
  sourceNodeId: string
  /** Lazy ApiNode in nodes[] — NOT in edges. Same convention as RowExpandNodeConfig.childApiNodeId */
  childApiNodeId: string
  /** Default: 'id' */
  rowKeyField?: string
  /** false (default) = fires immediately after root load; true = waits for triggerEnrich() */
  lazy?: boolean
  /**
   * JSONata applied to the first row of the childApi response before merging into the root row.
   * Input: first GridRow from childApi. Output: object spread onto the root row.
   * Evaluated via evaluateExpr (jsonata-evaluator.ts). When absent, first row is spread directly.
   */
  mergeTransform?: string
  /**
   * TanStack Query keys to invalidate after ALL row enrich queries succeed.
   * e.g. ['eng-expand'] re-fetches the root table after enrichment completes.
   */
  invalidateQueryKeys?: string[]
}

interface RowEnrichNodeOutput {
  descriptors: RowEnrichDescriptor[]
  childApiNodeId: string
  rowKeyField: string
  lazy: boolean
  mergeTransform?: string
  invalidateQueryKeys?: string[]
}

// ── ColumnHydrateNode ─────────────────────────────────────────────────────────

interface ColumnHydrateDescriptor {
  rowKey: string
  rowData: GridRow
  columnId: string
}

interface ColumnHydrateEntry {
  /** Must match a ColumnDef.field in the ColumnNode of the same DAG */
  columnId: string
  /** Lazy ApiNode in nodes[] — NOT in edges. Same convention as RowEnrichNodeConfig */
  childApiNodeId: string
  /** Per-column lazy gate. false (default) = fires with root load */
  lazy?: boolean
  /**
   * JSONata applied to the first row of the childApi response.
   * Output is merged as { [columnId]: transformedValue } onto the root row.
   * When absent, merged as { [columnId]: result.rows[0] }.
   */
  mergeTransform?: string
  /** TanStack Query keys to invalidate after this column's queries all succeed */
  invalidateQueryKeys?: string[]
}

interface ColumnHydrateNodeConfig {
  /** Must reference an 'api', 'transform', or 'merge' node */
  sourceNodeId: string
  /** Default: 'id' */
  rowKeyField?: string
  columns: ColumnHydrateEntry[]
}

interface ColumnHydrateNodeOutput {
  descriptors: ColumnHydrateDescriptor[]
  /** Preserved from config for lazy lookups and mergeTransform access in useDAGTable */
  columnEntries: ColumnHydrateEntry[]
  rowKeyField: string
}
```

### `NodeOutputMap` additions

```ts
interface NodeOutputMap {
  // ... existing entries ...
  rowEnrich:     RowEnrichNodeOutput
  columnHydrate: ColumnHydrateNodeOutput
}
```

### `DAGTableResult` additions

```ts
interface DAGTableResult {
  // ... existing fields ...
  isEnriching: boolean
  isHydrating: boolean
  /** Only present when rowEnrich node has lazy: true */
  triggerEnrich?: () => void
  /** Only present when any ColumnHydrateEntry has lazy: true */
  triggerHydrate?: (columnId: string) => void
}
```

### `ToolbarContext` additions

```ts
interface ToolbarContext {
  // ... existing fields ...
  isEnriching: boolean
  isHydrating: boolean
  triggerEnrich?: () => void
  triggerHydrate?: (columnId: string) => void
}
```

---

## Shared Helper — `nodes/shared-row-reader.ts`

```ts
/**
 * Reads GridRow[] from context for a given source node.
 * Supports: 'api' → .rows, 'transform' → GridRow[], 'merge' → GridRow[]
 * Returns [] when context.has(sourceNodeId) is false — matches the existing
 * graceful-absence pattern in TransformNodeExecutor and MergeNodeExecutor.
 * Replaces the inline pattern duplicated in those two files.
 */
export function readSourceRows(
  context: NodeContext,
  sourceNodeId: string
): GridRow[]
```

Called by `RowEnrichNodeExecutor`, `ColumnHydrateNodeExecutor`, and — after refactor — the existing `TransformNodeExecutor` and `MergeNodeExecutor`. Does not need `allNodes` — reads only from `context`.

---

## Node Executors

### `RowEnrichNodeExecutor` (`nodes/row-enrich-node.ts`)

Execution:
1. Find `childApiNodeId` in `allNodes` — throw `DAGExecutionError` if missing (mirrors `RowExpandNodeExecutor`)
2. `readSourceRows(context, config.sourceNodeId)` → `GridRow[]`
3. Map rows → `RowEnrichDescriptor[]`: `{ rowKey: String(row[rowKeyField]), rowData: row }`
4. Return `RowEnrichNodeOutput`

No HTTP calls. No async work. Pure descriptor construction. Constructor takes no parameters — no `NodeRegistry` needed.

### `ColumnHydrateNodeExecutor` (`nodes/column-hydrate-node.ts`)

Execution:
1. For each `col` in `config.columns`: find `col.childApiNodeId` in `allNodes` — throw `DAGExecutionError` if any missing
2. `readSourceRows(context, config.sourceNodeId)` → `GridRow[]`
3. `config.columns.flatMap(col => rows.map(row => { rowKey, rowData, columnId }))` → `ColumnHydrateDescriptor[]`
4. Return `ColumnHydrateNodeOutput`

No HTTP calls. No async work. Constructor takes no parameters — no `NodeRegistry` needed.

---

## DAG Validator (`core/dag-validator.ts`)

Two new validation blocks added to the existing `validateDAG` function, consistent with the `rowExpand` and `action` blocks:

```ts
if (node.type === 'rowEnrich') {
  if (!nodeIds.has(node.config.sourceNodeId))
    throw new DAGValidationError(`RowEnrichNode "${node.id}" references unknown sourceNodeId: "${node.config.sourceNodeId}"`, node.id)
  if (!nodeIds.has(node.config.childApiNodeId))
    throw new DAGValidationError(`RowEnrichNode "${node.id}" references unknown childApiNodeId: "${node.config.childApiNodeId}"`, node.id)
}

if (node.type === 'columnHydrate') {
  if (!nodeIds.has(node.config.sourceNodeId))
    throw new DAGValidationError(`ColumnHydrateNode "${node.id}" references unknown sourceNodeId: "${node.config.sourceNodeId}"`, node.id)
  for (const col of node.config.columns) {
    if (!nodeIds.has(col.childApiNodeId))
      throw new DAGValidationError(`ColumnHydrateNode "${node.id}" column "${col.columnId}" references unknown childApiNodeId: "${col.childApiNodeId}"`, node.id)
  }
}
```

---

## Bootstrap (`bootstrap.ts`)

```ts
nodeReg.register('rowEnrich',     new RowEnrichNodeExecutor())
nodeReg.register('columnHydrate', new ColumnHydrateNodeExecutor())
```

Both executors are registered on separate lines after the chain (same style as `rowExpand`). Unlike `RowExpandNodeExecutor`, they do not resolve any node executor at runtime and therefore do not need `NodeRegistry` injected — passing it would be an unused parameter that Biome's `noUnusedParameters` rule would flag as an error.

---

## `useDAGTable` Integration (`hooks/use-dag-table.ts`)

### `flatQuery.data` extended

Inside the `flatQuery` `queryFn`, after `engine.execute(dag, 'column', ctx)`, derive the new outputs from the context using node IDs looked up from `dag.nodes`:

```ts
const reNode = dag.nodes.find(n => n.type === 'rowEnrich')
const chNode = dag.nodes.find(n => n.type === 'columnHydrate')

const rowEnrichOutput  = reNode && ctx.has(reNode.id)
  ? ctx.get(reNode.id, 'rowEnrich')
  : null
const colHydrateOutput = chNode && ctx.has(chNode.id)
  ? ctx.get(chNode.id, 'columnHydrate')
  : null

return { rows, colOutput, ctx, rowEnrichOutput, colHydrateOutput }
```

### Lazy gates — from static DAG config (safe `useState` init)

```ts
const rowEnrichNode  = dag.nodes.find(n => n.type === 'rowEnrich')
const colHydrateNode = dag.nodes.find(n => n.type === 'columnHydrate')

const [enrichEnabled, setEnrichEnabled] = useState(
  !(rowEnrichNode?.config.lazy ?? false)
)
const [hydratedColumnIds, setHydratedColumnIds] = useState<Set<string>>(
  () => new Set(
    (colHydrateNode?.config.columns ?? []).filter(c => !c.lazy).map(c => c.columnId)
  )
)
```

### `useQueries` — row enrichment

TanStack Query v5 best practices: stable keys, `staleTime`, `mergeTransform` applied inside `queryFn` (async-safe, result cached as-transformed):

```ts
const apiExecutor = useMemo(() => new ApiNodeExecutor(engine.getAuthRegistry()), [engine])

const rowEnrichOutput = flatQuery.data?.rowEnrichOutput ?? null
const baseCtx         = flatQuery.data?.ctx ?? null

const rowEnrichQueries = useQueries({
  queries: (rowEnrichOutput?.descriptors ?? []).map(desc => ({
    queryKey: [tableId, 'rowEnrich', desc.rowKey, rowEnrichOutput!.childApiNodeId],
    queryFn: async () => {
      const childNode = dag.nodes.find(n => n.id === rowEnrichOutput!.childApiNodeId && n.type === 'api')
      const result = await apiExecutor.execute(
        childNode!.config as ApiNodeConfig,
        baseCtx!.withRow(desc.rowData),
        dag.nodes
      )
      if (rowEnrichOutput!.mergeTransform) {
        // evaluateExpr signature: (expression, context, inputDoc) — context is required second arg
        return evaluateExpr<GridRow>(
          rowEnrichOutput!.mergeTransform,
          baseCtx!.withRow(desc.rowData),
          result.rows[0] ?? {}
        )
      }
      return result.rows[0] ?? {}
    },
    enabled: enrichEnabled && !!baseCtx,
    staleTime: 30_000,
  })),
})
```

### `useQueries` — column hydration

Per-descriptor, enabled via `hydratedColumnIds`:

```ts
const colHydrateOutput = flatQuery.data?.colHydrateOutput ?? null

const colHydrateQueries = useQueries({
  queries: (colHydrateOutput?.descriptors ?? []).map(desc => {
    const colEntry = colHydrateOutput!.columnEntries.find(c => c.columnId === desc.columnId)!
    return {
      queryKey: [tableId, 'columnHydrate', desc.rowKey, desc.columnId],
      queryFn: async () => {
        const childNode = dag.nodes.find(n => n.id === colEntry.childApiNodeId && n.type === 'api')
        const result = await apiExecutor.execute(
          childNode!.config as ApiNodeConfig,
          baseCtx!.withRow(desc.rowData),
          dag.nodes
        )
        if (colEntry.mergeTransform) {
          // evaluateExpr signature: (expression, context, inputDoc) — context is required second arg
          const transformed = await evaluateExpr<unknown>(
            colEntry.mergeTransform,
            baseCtx!.withRow(desc.rowData),
            result.rows[0] ?? {}
          )
          return { [desc.columnId]: transformed }
        }
        return { [desc.columnId]: result.rows[0] }
      },
      enabled: hydratedColumnIds.has(desc.columnId) && !!baseCtx,
      staleTime: 30_000,
    }
  }),
})
```

### `invalidateQueryKeys` — TQ v5 pattern (`useEffect`, not `onSuccess`)

```ts
// Row enrich invalidation
useEffect(() => {
  if (!rowEnrichOutput?.invalidateQueryKeys?.length) return
  if (rowEnrichQueries.length > 0 && rowEnrichQueries.every(q => q.isSuccess)) {
    for (const key of rowEnrichOutput.invalidateQueryKeys) {
      queryClient.invalidateQueries({ queryKey: [key] })
    }
  }
}, [rowEnrichQueries, rowEnrichOutput, queryClient])

// Column hydrate invalidation — per-column entry
useEffect(() => {
  if (!colHydrateOutput) return
  for (const colEntry of colHydrateOutput.columnEntries) {
    if (!colEntry.invalidateQueryKeys?.length) continue
    const colQueries = colHydrateQueries.filter(
      (_, i) => colHydrateOutput.descriptors[i]?.columnId === colEntry.columnId
    )
    if (colQueries.length > 0 && colQueries.every(q => q.isSuccess)) {
      for (const key of colEntry.invalidateQueryKeys) {
        queryClient.invalidateQueries({ queryKey: [key] })
      }
    }
  }
}, [colHydrateQueries, colHydrateOutput, queryClient])
```

### Progressive merge — two chained `useMemo`s

```ts
// Step 1: merge enrich results into finalRows
const enrichedRows = useMemo<GridRow[]>(() => {
  if (!rowEnrichOutput || rowEnrichQueries.length === 0) return finalRows
  const enrichMap = new Map<string, GridRow>()
  for (let i = 0; i < rowEnrichOutput.descriptors.length; i++) {
    const data = rowEnrichQueries[i]?.data as GridRow | undefined
    if (data) enrichMap.set(rowEnrichOutput.descriptors[i].rowKey, data)
  }
  return finalRows.map(row => {
    const key = String(row[rowEnrichOutput.rowKeyField])
    const patch = enrichMap.get(key)
    return patch ? { ...row, ...patch } : row
  })
}, [finalRows, rowEnrichOutput, rowEnrichQueries])

// Step 2: merge hydrate results into enrichedRows
const hydratedRows = useMemo<GridRow[]>(() => {
  if (!colHydrateOutput || colHydrateQueries.length === 0) return enrichedRows
  // Map: rowKey → { columnId → value }
  const hydrateMap = new Map<string, GridRow>()
  for (let i = 0; i < colHydrateOutput.descriptors.length; i++) {
    const { rowKey } = colHydrateOutput.descriptors[i]
    const data = colHydrateQueries[i]?.data as GridRow | undefined
    if (data) hydrateMap.set(rowKey, { ...(hydrateMap.get(rowKey) ?? {}), ...data })
  }
  return enrichedRows.map(row => {
    const key = String(row[colHydrateOutput.rowKeyField])
    const patch = hydrateMap.get(key)
    return patch ? { ...row, ...patch } : row
  })
}, [enrichedRows, colHydrateOutput, colHydrateQueries])
// hydratedRows is returned as `data`
```

### Loading states

```ts
const isEnriching = rowEnrichQueries.some(q => q.isPending || q.isFetching)
const isHydrating = colHydrateQueries.some(q => q.isPending || q.isFetching)
```

### Triggers

Always call `useCallback` unconditionally (Rules of Hooks), then gate the exposed value on the config flag:

```ts
// Always declared — never conditional (Rules of Hooks)
const triggerEnrichFn = useCallback(() => setEnrichEnabled(true), [])
const triggerHydrateFn = useCallback(
  (colId: string) => setHydratedColumnIds(prev => new Set([...prev, colId])),
  []
)

// Exposed only when lazy config is present — derived from static DAG config
const triggerEnrich  = rowEnrichNode?.config.lazy ? triggerEnrichFn : undefined
const triggerHydrate = colHydrateNode?.config.columns.some(c => c.lazy)
  ? triggerHydrateFn
  : undefined
```

### Dead code removal

Remove the two commented-out `queryClient.invalidateQueries` lines in `executeNode` and `onAction`. The `useQueryClient` import is now actively used by the `invalidateQueryKeys` feature.

---

## `ConfiguredTable` wiring (`configured-table.tsx`)

Destructure new fields from `useDAGTable` and pass to `DataGrid`:

```ts
const {
  // ... existing ...
  isEnriching, isHydrating, triggerEnrich, triggerHydrate,
} = useDAGTable(config, engine, { ...params, ...searchParams })

// Pass to DataGrid:
// isEnriching={isEnriching}
// isHydrating={isHydrating}
// onTriggerEnrich={triggerEnrich}
// onTriggerHydrate={triggerHydrate}
```

`DataGrid` injects these into `ToolbarContext` alongside existing fields. No new `ConfiguredTableProps` fields required — entirely driven by `DAGTableConfig`.

---

## DAG Wiring Rules

| Node type | In `edges`? | Fires when |
|---|---|---|
| `rowEnrich` | Yes — after source node | `useDAGTable` `useQueries` (eager or lazy) |
| `columnHydrate` | Yes — after source node | `useDAGTable` `useQueries` per-column |
| `childApiNodeId` targets | No — lazy, nodes[] only | Inside `queryFn` on demand |

Typical edge pattern:
```ts
edges: [
  { from: 'root-api',       to: 'row-enrich' },
  { from: 'root-api',       to: 'column-hydrate' },
  { from: 'row-enrich',     to: 'columns' },
  { from: 'column-hydrate', to: 'columns' },
]
```

---

## Example Config

```ts
export const engEnrichedConfig: DAGTableConfig = {
  tableId: 'eng-enriched',
  mode: 'flat',
  dag: {
    nodes: [
      // ── Initial-wave nodes ───────────────────────────────────────────────
      {
        id: 'root-api',
        type: 'api',
        config: {
          url: '$:"/resources/v1/modeler/dseng/dseng:EngItem"',
          method: 'GET',
          authAdapterId: 'wafdata',
          responseTransform: `member.{ "id": id, "name": dataelements.PLMEntity.V_Name }`,
        },
      },
      {
        id: 'row-enrich',
        type: 'rowEnrich',
        config: {
          sourceNodeId: 'root-api',
          childApiNodeId: 'enrich-api',
          rowKeyField: 'id',
          lazy: false,
          mergeTransform: `{ "owner": owner.login, "state": maturity.state }`,
          invalidateQueryKeys: [],
        },
      },
      {
        id: 'column-hydrate',
        type: 'columnHydrate',
        config: {
          sourceNodeId: 'root-api',
          rowKeyField: 'id',
          columns: [
            {
              columnId: 'status',
              childApiNodeId: 'status-api',
              lazy: true,   // only fires when ctx.triggerHydrate('status') is called
              mergeTransform: `value`,
            },
          ],
        },
      },
      {
        id: 'columns',
        type: 'column',
        config: {
          columns: [
            { field: 'name',   header: 'Name',   sortable: true },
            { field: 'owner',  header: 'Owner' },
            { field: 'state',  header: 'State',  renderType: 'badge' },
            { field: 'status', header: 'Status', renderType: 'badge' },
          ],
        },
      },

      // ── Lazy nodes (NOT in edges) ─────────────────────────────────────────
      {
        id: 'enrich-api',
        type: 'api',
        config: {
          url: '$:"/resources/v1/modeler/dseng/dseng:EngItem/" & $row.id',
          method: 'GET',
          authAdapterId: 'wafdata',
          responseTransform: `$`,
        },
      },
      {
        id: 'status-api',
        type: 'api',
        config: {
          url: '$:"/resources/v1/lifecycle/" & $row.id & "/status"',
          method: 'GET',
          authAdapterId: 'wafdata',
          responseTransform: `{ "value": state }`,
        },
      },
    ],

    edges: [
      { from: 'root-api',       to: 'row-enrich' },
      { from: 'root-api',       to: 'column-hydrate' },
      { from: 'row-enrich',     to: 'columns' },
      { from: 'column-hydrate', to: 'columns' },
    ],

    rootNodeId: 'columns',
  },

  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
    columnResizing: { enabled: true },
  },

  // Toolbar button to trigger lazy status hydration
  toolbarCommands: [
    {
      id: 'load-status',
      type: 'command',
      enabled: true,
      label: 'Load Status',
      icon: 'RefreshCw',
      handler: async (ctx) => {
        ctx.triggerHydrate?.('status')
      },
    },
  ],
}
```

---

## File Map

| File | Action |
|------|--------|
| `types/dag.types.ts` | Extend `NodeType`, `NodeConfigMap`, `DAGNode` union |
| `types/table.types.ts` | Add `RowEnrichDescriptor`, `RowEnrichNodeConfig`, `RowEnrichNodeOutput`, `ColumnHydrateEntry`, `ColumnHydrateDescriptor`, `ColumnHydrateNodeConfig`, `ColumnHydrateNodeOutput`; extend `NodeOutputMap`, `DAGTableResult` |
| `nodes/shared-row-reader.ts` | **New** — `readSourceRows` helper |
| `nodes/row-enrich-node.ts` | **New** — `RowEnrichNodeExecutor` |
| `nodes/column-hydrate-node.ts` | **New** — `ColumnHydrateNodeExecutor` |
| `nodes/transform-node.ts` | Refactor to use `readSourceRows` (dead code cleanup) |
| `nodes/merge-node.ts` | Refactor to use `readSourceRows` (dead code cleanup) |
| `core/dag-validator.ts` | Add `rowEnrich` + `columnHydrate` validation blocks |
| `bootstrap.ts` | Register `rowEnrich` + `columnHydrate` |
| `hooks/use-dag-table.ts` | `useQueries`, progressive merge, `invalidateQueryKeys` effects, dead code removal |
| `toolbar/toolbar.types.ts` | Add `isEnriching`, `isHydrating`, `triggerEnrich`, `triggerHydrate` to `ToolbarContext` |
| `configured-table.tsx` | Destructure + pass new fields to `DataGrid` |
| `index.ts` | Export new types |
| `features/xen/configs/eng-enriched.config.ts` | **New** — example config demonstrating `rowEnrich` + `columnHydrate` |

---

## Implementation Phases

### Phase 1 — Type System
- `types/dag.types.ts`: extend `NodeType`, `NodeConfigMap`, `DAGNode`
- `types/table.types.ts`: add all new config/descriptor/output types; extend `NodeOutputMap`, `DAGTableResult`
- **Deliverable:** All types compile; no behaviour change yet

### Phase 2 — Executors + Validator + Bootstrap
- `nodes/shared-row-reader.ts`: new helper
- `nodes/row-enrich-node.ts`: `RowEnrichNodeExecutor`
- `nodes/column-hydrate-node.ts`: `ColumnHydrateNodeExecutor`
- `nodes/transform-node.ts`: refactor to `readSourceRows`
- `nodes/merge-node.ts`: refactor to `readSourceRows`
- `core/dag-validator.ts`: add validation blocks
- `bootstrap.ts`: register new executors
- **Deliverable:** Engine validates and executes DAGs containing `rowEnrich`/`columnHydrate` nodes; descriptors produced correctly

### Phase 3 — `useDAGTable` Integration
- Extend `flatQuery.data` to carry `rowEnrichOutput`, `colHydrateOutput`
- Add lazy gate `useState`s
- Add `useQueries` for row enrichment (with `mergeTransform` in `queryFn`)
- Add `useQueries` for column hydration (with per-column `mergeTransform`)
- Add `useEffect`s for `invalidateQueryKeys`
- Add `useMemo` chain: `enrichedRows` → `hydratedRows`
- Add `isEnriching`, `isHydrating`, `triggerEnrich`, `triggerHydrate` to return
- Remove two commented-out dead `queryClient.invalidateQueries` lines
- **Deliverable:** Progressive enrichment and hydration works end-to-end; lazy mode works via triggers

### Phase 4 — Toolbar Wiring + Barrel + Example Config
- `toolbar/toolbar.types.ts`: extend `ToolbarContext`
- `configured-table.tsx`: destructure + wire new fields
- `index.ts`: export new types
- Add example config `features/xen/configs/eng-enriched.config.ts`
- **Deliverable:** Toolbar commands can call `ctx.triggerEnrich()` / `ctx.triggerHydrate(columnId)` and observe `ctx.isEnriching` / `ctx.isHydrating`

---

## Design Patterns

| Pattern | Where |
|---------|-------|
| Descriptor-pattern (same as `rowExpand`) | `RowEnrichNodeExecutor`, `ColumnHydrateNodeExecutor` — pure descriptor construction, no HTTP |
| `childApiNodeId` convention | Reused from `RowExpandNodeConfig` — lazy ApiNode in `nodes[]`, NOT in `edges` |
| `readSourceRows` helper | Replaces duplication in `TransformNodeExecutor` + `MergeNodeExecutor` |
| TQ v5 `useEffect` invalidation | `invalidateQueryKeys` — replaces removed `onSuccess` callback |
| Progressive merge chain | Two `useMemo`s: `finalRows → enrichedRows → hydratedRows` |
| Static `useState` lazy gates | Initialised from DAG config (not async data) — safe and stable |
| `ToolbarContext` as config surface | `triggerEnrich/Hydrate` available in every toolbar command handler |
| `evaluateExpr` reuse | `mergeTransform` runs inside `queryFn` — async-safe, result cached as-transformed |
