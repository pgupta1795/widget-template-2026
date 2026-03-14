# DAG-Based Table Engine — Design Spec

**Date:** 2026-03-14
**Branch:** tanstack-table-ui
**Status:** Under Review

---

## Overview

Replace the existing `table-engine/` implementation with a fully typed, DAG-based, plug-and-play Table Engine for 3DExperience BOM tables. Every table is described as a graph of typed nodes. The engine resolves dependencies, executes nodes in topological order, threads outputs through a shared `NodeContext`, and produces a fully-rendered `DataGrid`.

**Goals:**
- Any table, any API call, any auth — 100% config-driven
- Full TypeScript type safety — no `any`, no `unknown` (one documented cast boundary in `jsonata-evaluator.ts`)
- WAFData auth is plug-and-play, delegates to existing `src/services/` layer
- New BOM table type = new config file only, zero engine changes

**Non-goals:**
- Backward compatibility with existing `TableConfig` / `DataSourceConfig` format (clean replacement)
- Modifying `src/services/` internals

---

## Architecture

```
DAGTableConfig
     │
     ▼
useDAGTable(config, engine)          ← React hook, TanStack Query-backed
     │
     ├── DAGEngine.execute(dag)
     │     ├── 1. validateDAG()       ← throws DAGValidationError
     │     ├── 2. buildWaves()        ← Kahn's topological sort, edges-only
     │     ├── 3. execute waves       ← parallel within wave, sequential between
     │     ├── 4. NodeContext         ← typed output store
     │     └── 5. return root output  ← ColumnNodeOutput drives DataGrid
     │
     └── ConfiguredTable → DataGrid
```

**Boundaries:**
- `table-engine/core/` — engine mechanics only, no React, no HTTP
- `table-engine/nodes/` — each node type is an independent executor
- `table-engine/adapters/` — auth is swappable, delegates to `src/services/`
- `configured-table.tsx` — only React surface, public API unchanged
- `features/xen/configs/` — BOM configs are pure data, zero engine code

---

## Folder Structure

```
src/components/data-grid/table-engine/
├── types/
│   ├── dag.types.ts            ← DAGTableConfig, DAGConfig, DAGNode, DAGEdge, JsonataExpr
│   ├── api.types.ts            ← ApiNodeConfig, AuthRequestOptions
│   ├── auth.types.ts           ← IAuthAdapter, ServiceResponse re-export
│   └── table.types.ts          ← All NodeConfig + NodeOutput types, NodeConfigMap, NodeOutputMap,
│                                  DAGFeaturesConfig, DAGTableResult, ActionDef, ColumnDef
├── core/
│   ├── node-context.ts         ← NodeContext (typed get/set, withRow, withParams)
│   ├── node-registry.ts        ← NodeRegistry<T extends NodeType>
│   ├── auth-registry.ts        ← AuthAdapterRegistry
│   ├── dag-engine.ts           ← DAGEngine orchestrator
│   ├── dependency-resolver.ts  ← Kahn's algorithm (ported from dag-resolver.ts)
│   └── dag-validator.ts        ← DAGValidationError, DAGExecutionError, validateDAG()
├── nodes/
│   ├── api-node.ts             ← ApiNodeExecutor
│   ├── transform-node.ts       ← TransformNodeExecutor
│   ├── column-node.ts          ← ColumnNodeExecutor (absorbs column-builder.ts)
│   ├── row-expand-node.ts      ← RowExpandNodeExecutor
│   ├── merge-node.ts           ← MergeNodeExecutor
│   └── action-node.ts          ← ActionNodeExecutor
├── adapters/
│   ├── i-auth-adapter.ts       ← IAuthAdapter interface
│   ├── wafdata-auth-adapter.ts ← delegates to httpClient from src/services/
│   ├── bearer-auth-adapter.ts  ← delegates to httpClient with Bearer header
│   └── no-auth-adapter.ts      ← plain fetch, no auth
├── hooks/
│   └── use-dag-table.ts        ← useDAGTable hook (TanStack Query-backed)
├── jsonata-evaluator.ts        ← evaluateExpr() — sole JSONata + cast boundary
├── bootstrap.ts                ← createDefaultEngine() pre-wired factory
├── configured-table.tsx        ← React surface
└── index.ts                    ← barrel export

src/features/xen/
├── configs/
│   ├── ebom.config.ts
│   └── mbom.config.ts
└── components/
    └── xen.tsx
```

**Files deleted in Phase 1:**
`api-executor.ts`, `dag-resolver.ts`, `use-table-engine.ts`, `config-validator.ts`,
`jsonata-evaluator.ts`, `column-builder.ts`, `types.ts`

---

## Type System

### JSON-safe value types (replaces `any`/`unknown` in payloads)

```ts
type JsonPrimitive = string | number | boolean | null
type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[]
```

### JSONata expression marker

```ts
// Branded template literal — prefixed fields are evaluated at runtime
type JsonataExpr = `$:${string}`

function isJsonataExpr(value: string): value is JsonataExpr {
  return value.startsWith('$:')
}
function extractExpr(value: JsonataExpr): string {
  return value.slice(2)  // removes '$:' prefix, remainder is JSONata expression
}
```

**URL interpolation:** A `url` field may be a plain string or a `JsonataExpr`. When it is a
`JsonataExpr`, the entire expression after `$:` is evaluated as JSONata against `NodeContext`.
String concatenation within the expression (e.g. `"/resources/" & $params.id & "/children"`)
produces the final URL. This is the same mechanism as the existing `api-executor.ts`
`buildRequestUrl()` — the whole URL template is a JSONata expression, not a string with `$:`
substitution markers embedded mid-string.

**JSONata cast boundary (single documented exception to no-`any`):**
JSONata's `evaluate()` returns `Promise<unknown>` per the library's type definitions.
`jsonata-evaluator.ts` is the only file permitted to use `as` casts, narrowing the JSONata
output to the caller-expected type. This file is the sole `unknown`-to-typed boundary.
All other files receive typed values. The cast is documented at each call site.

### Node type map

```ts
type NodeType = 'api' | 'transform' | 'column' | 'rowExpand' | 'merge' | 'action'

interface NodeConfigMap {
  api:       ApiNodeConfig
  transform: TransformNodeConfig
  column:    ColumnNodeConfig
  rowExpand: RowExpandNodeConfig
  merge:     MergeNodeConfig
  action:    ActionNodeConfig
}

interface NodeOutputMap {
  api:       ApiNodeOutput       // { rows: GridRow[]; total?: number; nextPage?: string | null }
  transform: GridRow[]
  column:    ColumnNodeOutput    // { columns: GridColumnDef<GridRow>[]; visibility: Record<string, boolean> }
  rowExpand: RowExpandOutput     // { expandHandler: (row: GridRow) => Promise<GridRow[]> }
  merge:     GridRow[]
  action:    ActionOutput        // { rowActions: ActionDef[]; toolbarActions: ActionDef[]; cellActions: ActionDef[] }
}
```

### DAG config types

**Dependency declaration uses edges only.** `DAGNode` has no `dependsOn` field.
All dependency information lives in `DAGConfig.edges`. This is the single source of truth for
execution order. `validateDAG` checks edge targets exist in `nodes[]`.

```ts
// Each variant is fully typed — no union widening to unknown/any
type DAGNode =
  | { id: string; type: 'api';       config: ApiNodeConfig }
  | { id: string; type: 'transform'; config: TransformNodeConfig }
  | { id: string; type: 'column';    config: ColumnNodeConfig }
  | { id: string; type: 'rowExpand'; config: RowExpandNodeConfig }
  | { id: string; type: 'merge';     config: MergeNodeConfig }
  | { id: string; type: 'action';    config: ActionNodeConfig }

interface DAGEdge { from: string; to: string }

interface DAGConfig {
  nodes: DAGNode[]      // ALL nodes, including lazy ones not in edges
  edges: DAGEdge[]      // defines execution order for initial load only
  rootNodeId: string    // must be reachable via edges
}
```

**Lazy nodes:** Nodes referenced by `RowExpandNodeConfig.childApiNodeId` or
`ActionNodeConfig` row/toolbar/cell `apiNodeId` are registered in `nodes[]` but NOT included
in `edges`. They are never executed in the initial wave. `DependencyResolver.buildWaves()`
only processes nodes reachable from `rootNodeId` via edges. `DAGValidator` validates that
all `childApiNodeId` and action `apiNodeId` references exist in `nodes[]`.

```ts
interface DAGTableConfig {
  tableId: string
  mode: GridMode
  dag: DAGConfig
  features?: DAGFeaturesConfig   // extends GridFeaturesConfig with engine-only fields
  density?: GridDensity
}
```

### DAGFeaturesConfig

Extends `GridFeaturesConfig` with engine-specific feature flags previously on `TableFeaturesConfig`:

```ts
interface DAGFeaturesConfig extends GridFeaturesConfig {
  columnOrdering?: { enabled?: boolean }
  columnResizing?: { enabled?: boolean }
  columnVisibility?: { enabled?: boolean }
}
```

**Stripping before DataGrid:** `DataGrid.features` is typed as `GridFeaturesConfig`.
`ConfiguredTable` must destructure the three engine-only fields before passing features
to `DataGrid` to avoid passing unknown props:

```ts
const { columnOrdering, columnResizing, columnVisibility: colVisFeature, ...gridFeatures } =
  config.features ?? {}
// gridFeatures is now GridFeaturesConfig — safe to pass to DataGrid
// colVisFeature drives initialColumnVisibility logic in useDAGTable
```

`columnOrdering` and `columnResizing` are consumed by `ColumnNodeExecutor` when building
`GridColumnDef` options. `columnVisibility` controls whether the visibility toggle UI
is shown and populates `columnVisibility` in `DAGTableResult`.

### Error taxonomy

```ts
// Thrown at config mount time — invalid graph structure
class DAGValidationError extends Error {
  constructor(message: string, public readonly nodeId?: string) { super(message) }
}

// Thrown at execution time — node executor failed
class DAGExecutionError extends Error {
  constructor(
    message: string,
    public readonly nodeId: string,
    public readonly cause: ServiceError | Error
  ) { super(message) }
}
```

`ServiceError` from `src/services/types.ts` propagates from the adapter layer.
`DAGExecutionError` wraps it, preserving `.cause` for consumers to inspect
`isCsrfExpiry`, `isUnauthorized`, `isTimeout` getters.

### Shared types re-exports

`SelectOption` and `DepthRule` are re-exported from `src/components/data-grid/types/column-types.ts`
in `table.types.ts`. They are not re-declared. This preserves existing type identity across the
codebase after the old `types.ts` is deleted.

---

## Core Engine

### NodeContext

Typed shared state bag. Each node writes output; downstream nodes read by nodeId + type.
`withRow()` clones context for row-scoped evaluations (expand, action triggers).

```ts
class NodeContext {
  // Throws DAGExecutionError if nodeId not found or type mismatches stored type
  get<T extends NodeType>(nodeId: string, type: T): NodeOutputMap[T]
  set<T extends NodeType>(nodeId: string, type: T, output: NodeOutputMap[T]): void
  has(nodeId: string): boolean
  getAll(): ReadonlyMap<string, NodeOutputMap[NodeType]>
  withRow(row: GridRow): NodeContext         // shallow clone + row binding
  withParams(params: Record<string, JsonPrimitive>): NodeContext
  getRow(): GridRow | undefined
  getParams(): Record<string, JsonPrimitive>
}
```

`get()` contract: throws `DAGExecutionError` with `nodeId` if the node has not yet stored
output (i.e. execution order bug) or if the stored type does not match `T`. The topological
sort guarantees ordering correctness for initial-wave nodes; lazy nodes must call `has()`
before `get()`.

### NodeRegistry

```ts
class NodeRegistry {
  register<T extends NodeType>(type: T, executor: INodeExecutor<T>): this
  resolve<T extends NodeType>(type: T): INodeExecutor<T>  // throws if type not registered
}
```

### AuthAdapterRegistry

```ts
class AuthAdapterRegistry {
  register(id: string, adapter: IAuthAdapter): this
  resolve(id: string): IAuthAdapter  // throws DAGValidationError if id not registered
}
```

### DAGEngine

```ts
class DAGEngine {
  constructor(
    private readonly nodes: NodeRegistry,
    private readonly auth: AuthAdapterRegistry
  )

  async execute<T extends NodeType>(
    dag: DAGConfig,
    rootType: T,
    context?: NodeContext
  ): Promise<NodeOutputMap[T]>
}
```

Execution flow:
1. `validateDAG(dag, auth)` — throws `DAGValidationError` on: duplicate node ids, edge
   references to unknown node ids, circular dependencies, unknown `authAdapterId` values,
   unknown `childApiNodeId` / action `apiNodeId` references, `rootNodeId` not reachable
2. `buildWaves(dag)` — topological sort via Kahn's algorithm on `edges` only → `Wave[]`
3. For each wave: `Promise.all(wave.map(node => executor.execute(config, context)))`
4. Each result stored: `context.set(node.id, node.type, result)`
5. Return `context.get(dag.rootNodeId, rootType)`

### DependencyResolver

Ported from existing `dag-resolver.ts`. Kahn's algorithm operates on `DAGConfig.edges` only.
Lazy nodes (not in edges) are never processed by `buildWaves`.

```ts
type Wave = DAGNode[]
function buildWaves(dag: DAGConfig): Wave[]
```

---

## Node Specifications

### ApiNode

```ts
interface ApiNodeConfig {
  url: string | JsonataExpr
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  authAdapterId: string
  queryParams?: Record<string, string | JsonataExpr>
  headers?: Record<string, string>
  body?: JsonValue | JsonataExpr
  formParams?: Record<string, string | JsonataExpr>
  fileParams?: Array<{ fieldName: string; sourceKey: string }>
  responseTransform?: string    // JSONata on ServiceResponse.data → GridRow[]
  paginationConfig?: {
    type: 'offset' | 'cursor' | 'page'
    pageSizeParam: string
    pageParam: string
    totalKey?: string
  }
}

interface ApiNodeOutput {
  rows: GridRow[]
  total?: number
  nextPage?: string | null
}
```

**Execution:**
1. Resolve all `JsonataExpr` fields via `jsonata-evaluator.ts` against `context`
2. Build `AuthRequestOptions` from resolved values
3. Call `authRegistry.resolve(config.authAdapterId).request<ServiceResponse<JsonValue>>(options)`
   — `TResponse` is `JsonValue` here; the response is structurally valid JSON but not yet
   narrowed to `GridRow[]`. This is the intentional generic-as-assertion layer.
4. Apply `config.responseTransform` (JSONata) on `response.data` → cast to `GridRow[]`
   via `jsonata-evaluator.ts` (the documented cast boundary)
5. Return `ApiNodeOutput`

**`formData` support:** When `formParams` is present, build a `FormData` object and pass
it via `AuthRequestOptions.formData`. The adapter sets `Content-Type: multipart/form-data`.
When `fileParams` is present, source files are retrieved from `context.getParams()` by
`sourceKey` and appended to the `FormData`.

### TransformNode

```ts
interface TransformNodeConfig {
  sourceNodeId: string    // must reference an 'api' or 'merge' node
  expression: string      // JSONata expression; input is ApiNodeOutput.rows or GridRow[]
}
```

Output: `GridRow[]`. Pure data transformation, no HTTP.
Reads source via `context.get(sourceNodeId, 'api').rows` or `context.get(sourceNodeId, 'merge')`.
Calls `jsonata-evaluator.ts` → cast to `GridRow[]`.

### ColumnNode

```ts
// Re-exports SelectOption, DepthRule from src/components/data-grid/types/column-types.ts
interface ColumnDef {
  field: string
  header: string
  type?: ColumnType
  sortable?: boolean
  filterable?: boolean
  editable?: boolean
  renderType?: 'badge' | 'boolean' | 'date' | 'code' | 'custom'
  valueExpr?: string          // JSONata per-cell transform; input is the row object
  width?: number
  pinned?: 'left' | 'right'
  hidden?: boolean
  selectOptions?: SelectOption[]    // re-exported from column-types.ts
  depthRules?: DepthRule[]          // re-exported from column-types.ts
}

interface ColumnNodeConfig {
  columns: ColumnDef[]
  actionNodeId?: string       // references ActionNode in same DAG; output appended as action column
  // lazyColumnGroups deferred to Phase 3
}

interface ColumnNodeOutput {
  columns: GridColumnDef<GridRow>[]
  visibility: Record<string, boolean>
}
```

Absorbs existing `column-builder.ts` factory registry (string, number, date, multi-value,
select, boolean, code). Maps `ColumnDef[]` → `GridColumnDef<GridRow>[]`. If `actionNodeId`
is set, reads `context.get(actionNodeId, 'action')` and appends an actions column.

### RowExpandNode

```ts
interface RowExpandNodeConfig {
  triggerOnExpand: boolean
  childApiNodeId: string      // references a lazy ApiNode in DAGConfig.nodes (NOT in edges)
  childKeyExpr: JsonataExpr   // e.g. '$:$row.id' — evaluated with row context
  childQueryParam: string     // queryParam key to inject; e.g. 'parentId'
  infiniteLoad?: boolean
  maxDepth?: number
}

interface RowExpandOutput {
  expandHandler: (row: GridRow) => Promise<GridRow[]>
}
```

**Execution:** `RowExpandNodeExecutor` receives the `NodeRegistry` via constructor DI.
It does NOT call `DAGEngine.execute()` recursively — it calls `ApiNodeExecutor.execute()`
directly on the child node config with a row-scoped context clone.

**Nodes array threading:** `DAGEngine.execute()` passes the full `DAGConfig.nodes` array into
each node's `execute()` call via an extended second argument. The `INodeExecutor.execute()`
signature is updated to include the nodes list:

```ts
interface INodeExecutor<T extends NodeType> {
  execute(
    config: NodeConfigMap[T],
    context: NodeContext,
    allNodes: DAGNode[]    // full nodes list from DAGConfig; used by lazy executors
  ): Promise<NodeOutputMap[T]>
}
```

Most executors ignore `allNodes`. `RowExpandNodeExecutor` and `ActionNodeExecutor` use it
to look up lazy node configs by id:

```ts
class RowExpandNodeExecutor implements INodeExecutor<'rowExpand'> {
  constructor(private readonly registry: NodeRegistry) {}

  async execute(
    config: RowExpandNodeConfig,
    context: NodeContext,
    allNodes: DAGNode[]
  ): Promise<RowExpandOutput> {
    const expandHandler = async (row: GridRow): Promise<GridRow[]> => {
      const rowContext = context.withRow(row)
      const keyValue = await evaluateExpr(config.childKeyExpr, rowContext) as JsonPrimitive
      const childContext = rowContext.withParams({ [config.childQueryParam]: keyValue })

      // Look up child ApiNode config from allNodes by childApiNodeId
      const childNode = allNodes.find(n => n.id === config.childApiNodeId && n.type === 'api')
      if (!childNode) throw new DAGExecutionError(`Lazy node not found: ${config.childApiNodeId}`, config.childApiNodeId, new Error('Node not registered'))
      const apiExecutor = this.registry.resolve('api')
      const result = await apiExecutor.execute(childNode.config, childContext, allNodes)
      return result.rows
    }
    return { expandHandler }
  }
}
```

**`onAction` handler in `useDAGTable`:** Since `useDAGTable` already holds the full
`DAGTableConfig`, it looks up lazy action `apiNodeId` configs directly from
`config.dag.nodes` — it does not call `ActionNodeExecutor` for lazy API execution.
The `ActionNodeExecutor` only handles the initial-wave pass-through; `useDAGTable`
handles the trigger lifecycle directly using the same lazy-node lookup pattern.

**Wiring to DataGrid:** `useDAGTable` reads `RowExpandOutput.expandHandler` from context
and passes it as `onExpand` to `DataGrid`.

### MergeNode

```ts
type MergeStrategy = 'concat' | 'join' | 'merge'

interface MergeNodeConfig {
  sourceNodeIds: string[]    // must reference 'api' or 'transform' nodes
  strategy: MergeStrategy
  joinKey?: string           // required for strategy: 'join'
}
```

**Strategies:**
- `concat` — `[...source1.rows, ...source2.rows, ...]` in declaration order. Output: `GridRow[]`.
- `join` — left join: for each row in `source1.rows`, find matching row in subsequent sources
  where `row[joinKey] === candidate[joinKey]`. Matched fields are spread onto the left row.
  Unmatched left rows are included; unmatched right rows are dropped. Output: `GridRow[]`.
- `merge` — `Object.assign({}, ...sources.map(s => s.rows[0]))` for single-object sources,
  or `concat` behavior for array sources. Primarily for merging metadata objects. Output: `GridRow[]`.

All source nodes must be 'api' or 'transform' type. Resolved via `context.get(id, 'api').rows`
or `context.get(id, 'transform')`.

### ActionNode

```ts
interface ActionDef {
  id: string
  label: string
  icon?: string                  // lucide-react icon name
  apiNodeId: string              // lazy ApiNode in same DAG (NOT in edges)
  confirmMessage?: string        // if set, show confirmation dialog before calling
  visibilityExpr?: JsonataExpr   // evaluated with $row context; default: visible
  disabledExpr?: JsonataExpr     // evaluated with $row context; default: enabled
}

interface ActionNodeConfig {
  rowActions?: ActionDef[]       // shown per-row in action column
  toolbarActions?: ActionDef[]   // shown in table toolbar
  cellActions?: ActionDef[]      // shown on cell hover
}

interface ActionOutput {
  rowActions: ActionDef[]
  toolbarActions: ActionDef[]
  cellActions: ActionDef[]
}
```

**Execution (initial wave):** `ActionNodeExecutor.execute()` returns the `ActionOutput`
directly from config — it does NOT call any API. It is a pure pass-through of the config
declarations into `NodeContext` for `ColumnNode` to consume.

**Execution (on trigger):** Action firing is handled by `useDAGTable`, not the engine.
When a user triggers an action, `useDAGTable.onAction(actionId, row?)` is called:
1. Look up `ActionDef` by `actionId` from `ActionOutput`
2. Evaluate `disabledExpr` / `visibilityExpr` with row context; abort if disabled
3. If `confirmMessage` set, await user confirmation
4. Get lazy `ApiNode` config from `dag.nodes` by `actionDef.apiNodeId`
5. Execute via `ApiNodeExecutor.execute(config, context.withRow(row))`
6. On success: invalidate TanStack Query cache for `config.tableId` to trigger re-fetch
7. Surface `DAGExecutionError` to the caller if the action API call fails

`visibilityExpr` and `disabledExpr` are evaluated against a `NodeContext.withRow(row)` clone.

---

## Auth Adapters

```ts
interface AuthRequestOptions {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  body?: JsonValue
  formData?: FormData
  responseType?: 'json' | 'text' | 'blob'
}

interface IAuthAdapter {
  readonly name: string
  // TResponse is caller-asserted, not statically guaranteed.
  // The underlying httpClient returns ServiceResponse<T> where T is passed through.
  // Type correctness is the caller's responsibility; runtime shape is validated via responseTransform.
  request<TResponse>(options: AuthRequestOptions): Promise<ServiceResponse<TResponse>>
}
```

**WAFDataAuthAdapter** — delegates to `httpClient.execute()` from `src/services/`.
Inherits CSRF auto-management, retry on failure, security headers, platform URL resolution.
This is the default for all 3DX configs (`authAdapterId: 'wafdata'`).

The actual `httpClient.execute` signature is `execute<T>(method: HttpMethod, url: string, opts?: RequestOptions)`.
The adapter maps `AuthRequestOptions` to this positional signature:

```ts
class WAFDataAuthAdapter implements IAuthAdapter {
  readonly name = 'wafdata'
  request<TResponse>(options: AuthRequestOptions): Promise<ServiceResponse<TResponse>> {
    return httpClient.execute<TResponse>(
      options.method,
      options.url,
      {
        headers: options.headers,
        params: options.queryParams,
        data: options.body ?? options.formData,
        responseType: options.responseType ?? 'json',
      }
    )
  }
}
```

**BearerAuthAdapter** — delegates to `httpClient` with `Authorization: Bearer <token>` injected.

**NoAuthAdapter** — plain `fetch` call, returns `ServiceResponse`-shaped result. For public
endpoints or testing. Does not use `httpClient`.

---

## useDAGTable Hook

The React hook that drives `ConfiguredTable`. Replaces `useTableEngine`.
Lives in `table-engine/hooks/use-dag-table.ts`.

```ts
interface DAGTableResult {
  // Data
  data: GridRow[]
  columns: GridColumnDef<GridRow>[]
  columnVisibility: Record<string, boolean>

  // State
  isLoading: boolean
  isFetchingNextPage: boolean    // infinite mode only
  error: DAGExecutionError | DAGValidationError | null

  // Paginated mode
  pagination?: {
    pageIndex: number
    pageCount: number
    onPageChange: (page: number) => void
    pageSize: number
  }

  // Infinite mode
  hasNextPage?: boolean
  fetchNextPage?: () => void

  // Tree mode
  onExpand?: (row: GridRow) => Promise<GridRow[]>

  // Actions (Phase 3)
  onAction?: (actionId: string, row?: GridRow) => Promise<void>
}

function useDAGTable(config: DAGTableConfig, engine: DAGEngine): DAGTableResult
```

**Mode-specific query strategy:**

| Mode | Query strategy | Notes |
|------|---------------|-------|
| `flat` | `useQuery` | Single engine.execute(); all rows in memory |
| `paginated` | `useQuery` with `pageIndex` state | Re-executes on page change |
| `infinite` | `useInfiniteQuery` | `paginationConfig.nextPage` drives cursor; `fetchNextPage` on scroll |
| `tree` | `useQuery` for root rows | `onExpand` calls `RowExpandOutput.expandHandler` directly |

**Query key:** `[config.tableId, config.mode, pageIndex?]` — enables TanStack Query caching
and invalidation after actions.

**Error handling:**
- `DAGValidationError` from `validateDAG()` is caught once on mount; surfaces as `error`.
  No query is attempted on validation failure.
- `DAGExecutionError` from node execution surfaces as `error` via TanStack Query's `onError`.
- `ServiceError.isCsrfExpiry` is handled by `httpClient` automatically (retry) — does not
  surface as an error unless retries are exhausted.

**`RowExpandOutput` wiring:**
After initial `execute()`, `useDAGTable` checks if the DAG contains a `rowExpand` node.
If present, reads `context.get(rowExpandNodeId, 'rowExpand').expandHandler` and exposes it
as `onExpand` in the result. `ConfiguredTable` passes this to `DataGrid` as `onExpand`.

---

## Bootstrap

```ts
// table-engine/bootstrap.ts
export function createDefaultEngine(): DAGEngine {
  const auth = new AuthAdapterRegistry()
    .register('wafdata', new WAFDataAuthAdapter())
    .register('bearer', new BearerAuthAdapter())
    .register('none', new NoAuthAdapter())

  const nodes = new NodeRegistry()
    .register('api',       new ApiNodeExecutor(auth))
    .register('transform', new TransformNodeExecutor())
    .register('column',    new ColumnNodeExecutor())
    .register('rowExpand', new RowExpandNodeExecutor(nodes))  // receives NodeRegistry
    .register('merge',     new MergeNodeExecutor())
    .register('action',    new ActionNodeExecutor())

  return new DAGEngine(nodes, auth)
}
```

Note: `RowExpandNodeExecutor` receives `NodeRegistry` via constructor. All executors receive
`allNodes: DAGNode[]` as a third parameter on `execute()` — passed by `DAGEngine.execute()`
at runtime from `dag.nodes`. This supports multiple DAG configs per engine instance.
`useDAGTable` handles the `onAction` trigger directly from `config.dag.nodes` (no executor needed).

---

## ConfiguredTable

```tsx
// table-engine/configured-table.tsx
export function ConfiguredTable({ config }: { config: DAGTableConfig }) {
  const engine = useMemo(() => createDefaultEngine(), [])
  const {
    data, columns, columnVisibility,
    isLoading, error,
    pagination, hasNextPage, fetchNextPage,
    onExpand, onAction,
  } = useDAGTable(config, engine)

  if (error) return <DAGErrorAlert error={error} />

  return (
    <DataGrid
      data={data}
      columns={columns}
      mode={config.mode}
      isLoading={isLoading}
      features={config.features}
      density={config.density}
      initialColumnVisibility={columnVisibility}
      pagination={pagination}
      hasNextPage={hasNextPage}
      fetchNextPage={fetchNextPage}
      onExpand={onExpand}
    />
  )
}
```

---

## Example: eBOM Config

```ts
// features/xen/configs/ebom.config.ts
export const ebomConfig: DAGTableConfig = {
  tableId: 'ebom',
  mode: 'tree',
  dag: {
    nodes: [
      // Initial load nodes (included in edges)
      {
        id: 'root-api',
        type: 'api',
        config: {
          url: '$:"/resources/v1/engineeringItem/" & $params.rootId & "/children"',
          method: 'GET',
          queryParams: { '$mask': 'dskern:Mask.Default' },
          authAdapterId: 'wafdata',
          responseTransform: `member.{"id":id,"title":dataelements.title,"hasChildren":(usage>0)}`,
        },
      },
      {
        id: 'row-expand',
        type: 'rowExpand',
        config: {
          triggerOnExpand: true,
          childApiNodeId: 'child-api',   // lazy — NOT in edges
          childKeyExpr: '$:$row.id',
          childQueryParam: 'parentId',
          maxDepth: 10,
        },
      },
      {
        id: 'actions',
        type: 'action',
        config: {
          rowActions: [
            { id: 'promote', label: 'Promote', apiNodeId: 'promote-api' },
          ],
        },
      },
      {
        id: 'columns',
        type: 'column',
        config: {
          actionNodeId: 'actions',
          columns: [
            { field: 'title',    header: 'Title',    sortable: true, filterable: true },
            { field: 'revision', header: 'Rev' },
            { field: 'maturity', header: 'State',    renderType: 'badge' },
          ],
        },
      },

      // Lazy nodes — registered in nodes[] but NOT in edges
      {
        id: 'child-api',
        type: 'api',
        config: {
          url: '$:"/resources/v1/engineeringItem/" & $params.parentId & "/children"',
          method: 'GET',
          authAdapterId: 'wafdata',
          responseTransform: `member.{"id":id,"title":dataelements.title}`,
        },
      },
      {
        id: 'promote-api',
        type: 'api',
        config: {
          url: '$:"/resources/v1/lifecycle/" & $row.id & "/promote"',
          method: 'PUT',
          authAdapterId: 'wafdata',
          body: { comment: 'Promoted via BOM' },
        },
      },
    ],
    // edges define initial execution order only
    edges: [
      { from: 'root-api',   to: 'row-expand' },
      { from: 'root-api',   to: 'actions' },
      { from: 'row-expand', to: 'columns' },
      { from: 'actions',    to: 'columns' },
    ],
    rootNodeId: 'columns',
  },
}
```

---

## Implementation Phases

### Phase 1 — Core Engine + Auth + Basic Rendering
- `table-engine/types/` — all type definitions (dag, api, auth, table)
- `table-engine/core/` — NodeContext, NodeRegistry, AuthAdapterRegistry, DAGEngine, DependencyResolver, DAGValidator
- `table-engine/adapters/` — IAuthAdapter, WAFDataAuthAdapter, BearerAuthAdapter, NoAuthAdapter
- `table-engine/nodes/api-node.ts` — full ApiNodeConfig including body/formParams/fileParams
- `table-engine/nodes/column-node.ts` — absorbs column-builder.ts, no lazy columns yet
- `table-engine/hooks/use-dag-table.ts` — flat and paginated modes only
- `table-engine/jsonata-evaluator.ts`, `bootstrap.ts`, `configured-table.tsx`, `index.ts`
- Delete all 7 existing table-engine files
- **Deliverable:** Flat table from a single API call renders correctly

### Phase 2 — Tree, Infinite, Transform
- `table-engine/nodes/row-expand-node.ts` — lazy child execution, maxDepth
- `table-engine/nodes/transform-node.ts`
- Extend `use-dag-table.ts` for `tree` and `infinite` modes
- **Deliverable:** Tree table with lazy row expansion; infinite scroll load

### Phase 3 — Merge + Actions + Lazy Columns
- `table-engine/nodes/merge-node.ts` — concat/join/merge strategies
- `table-engine/nodes/action-node.ts` — pass-through on init, trigger via `useDAGTable.onAction`
- Action column rendering in `column-node.ts`
- `LazyColumnGroup` support in `column-node.ts`
- **Deliverable:** Row actions trigger API calls; multi-source merging; lazy column groups

### Phase 4 — 3DX BOM Configs
- `features/xen/configs/ebom.config.ts`
- `features/xen/configs/mbom.config.ts`
- `features/xen/components/xen.tsx`
- **Deliverable:** eBOM and mBOM tables render in the xen feature

---

## Design Patterns Used

| Pattern | Where |
|---------|-------|
| Strategy | `IAuthAdapter` — swap WAFData/Bearer/None |
| Registry | `NodeRegistry`, `AuthAdapterRegistry` — open for extension |
| DAG + Topological Sort | `DAGEngine` + `DependencyResolver` |
| Adapter | `WAFDataAuthAdapter` wraps 3DX API to standard interface |
| Builder | Fluent `.register()` chaining |
| Context | `NodeContext` threads data between nodes |
| Dependency Injection | `DAGEngine` constructor takes registries; lazy executors take `NodeRegistry` |
| Config > Code | New BOM type = new config file, zero engine changes |
| Lazy evaluation | Lazy nodes registered but excluded from initial wave; executed on demand |
