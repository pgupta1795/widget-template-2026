# DAG Table Engine — Phase 1: Foundation

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the type system, core DAG infrastructure (NodeContext, registries, engine, validator, resolver), and pluggable auth adapters. No React, no HTTP calls yet — pure engine mechanics.

**Architecture:** Typed discriminated-union node system; Kahn's topological sort on edges-only; `NodeContext` threads typed outputs; `IAuthAdapter` strategy pattern with WAFData/Bearer/None implementations delegating to existing `src/services/httpClient`.

**Tech Stack:** TypeScript 5, Vitest 3, Biome

**Spec:** `docs/superpowers/specs/2026-03-14-dag-table-engine-design.md`

**Next phase:** `docs/superpowers/plans/2026-03-14-dag-phase-2-nodes-hook.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/data-grid/table-engine/types/dag.types.ts` | Create |
| `src/components/data-grid/table-engine/types/api.types.ts` | Create |
| `src/components/data-grid/table-engine/types/auth.types.ts` | Create |
| `src/components/data-grid/table-engine/types/table.types.ts` | Create |
| `src/components/data-grid/table-engine/core/dag-validator.ts` | Create |
| `src/components/data-grid/table-engine/core/node-context.ts` | Create |
| `src/components/data-grid/table-engine/core/node-registry.ts` | Create |
| `src/components/data-grid/table-engine/core/auth-registry.ts` | Create |
| `src/components/data-grid/table-engine/core/dependency-resolver.ts` | Create |
| `src/components/data-grid/table-engine/core/dag-engine.ts` | Create |
| `src/components/data-grid/table-engine/adapters/wafdata-auth-adapter.ts` | Create |
| `src/components/data-grid/table-engine/adapters/bearer-auth-adapter.ts` | Create |
| `src/components/data-grid/table-engine/adapters/no-auth-adapter.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/node-context.test.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/registries.test.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/dependency-resolver.test.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/dag-engine.test.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/auth-adapters.test.ts` | Create |

---

## Task 1: Type Definitions

**Files:**
- Create: `src/components/data-grid/table-engine/types/dag.types.ts`
- Create: `src/components/data-grid/table-engine/types/api.types.ts`
- Create: `src/components/data-grid/table-engine/types/auth.types.ts`
- Create: `src/components/data-grid/table-engine/types/table.types.ts`

> Type files have no tests — TypeScript itself is the verification. Run `tsc --noEmit` to confirm.

- [ ] **Step 1: Create `types/dag.types.ts`**

```ts
// src/components/data-grid/table-engine/types/dag.types.ts
import type {
  ApiNodeConfig,
  TransformNodeConfig,
  ColumnNodeConfig,
  RowExpandNodeConfig,
  MergeNodeConfig,
  ActionNodeConfig,
  NodeOutputMap,
} from './table.types'

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[]
export type JsonataExpr = `$:${string}`

export function isJsonataExpr(value: string): value is JsonataExpr {
  return value.startsWith('$:')
}

export function extractExpr(value: JsonataExpr): string {
  return value.slice(2)
}

export type NodeType = 'api' | 'transform' | 'column' | 'rowExpand' | 'merge' | 'action'

export interface NodeConfigMap {
  api:       ApiNodeConfig
  transform: TransformNodeConfig
  column:    ColumnNodeConfig
  rowExpand: RowExpandNodeConfig
  merge:     MergeNodeConfig
  action:    ActionNodeConfig
}

export type { NodeOutputMap }

export type DAGNode =
  | { id: string; type: 'api';       config: ApiNodeConfig }
  | { id: string; type: 'transform'; config: TransformNodeConfig }
  | { id: string; type: 'column';    config: ColumnNodeConfig }
  | { id: string; type: 'rowExpand'; config: RowExpandNodeConfig }
  | { id: string; type: 'merge';     config: MergeNodeConfig }
  | { id: string; type: 'action';    config: ActionNodeConfig }

export interface DAGEdge {
  from: string
  to: string
}

export interface DAGConfig {
  /** ALL nodes including lazy ones not referenced in edges */
  nodes: DAGNode[]
  /** Defines initial execution order only — lazy nodes are NOT listed here */
  edges: DAGEdge[]
  rootNodeId: string
}
```

- [ ] **Step 2: Create `types/api.types.ts`**

```ts
// src/components/data-grid/table-engine/types/api.types.ts
import type { JsonValue } from './dag.types'

export interface AuthRequestOptions {
  url: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  headers?: Record<string, string>
  queryParams?: Record<string, string>
  body?: JsonValue
  formData?: FormData
  responseType?: 'json' | 'text' | 'blob'
}
```

- [ ] **Step 3: Create `types/auth.types.ts`**

```ts
// src/components/data-grid/table-engine/types/auth.types.ts
import type { ServiceResponse } from '@/services'
import type { AuthRequestOptions } from './api.types'

export interface IAuthAdapter {
  readonly name: string
  /**
   * TResponse is caller-asserted. Type correctness is the caller's responsibility;
   * runtime shape is validated via responseTransform in ApiNode.
   */
  request<TResponse>(options: AuthRequestOptions): Promise<ServiceResponse<TResponse>>
}

export type { ServiceResponse }
```

- [ ] **Step 4: Create `types/table.types.ts`**

```ts
// src/components/data-grid/table-engine/types/table.types.ts
import type {
  GridRow,
  GridMode,
  GridDensity,
  GridFeaturesConfig,
} from '@/components/data-grid/types/grid-types'
import type {
  GridColumnDef,
  ColumnType,
  SelectOption,
} from '@/components/data-grid/types/column-types'
import type { JsonValue, JsonataExpr, DAGConfig } from './dag.types'

// Re-export for consumers of table.types
export type { GridRow, GridColumnDef, ColumnType, SelectOption }

// ── Shared ───────────────────────────────────────────────────────────────────

export type DepthRule =
  | { depths: number[] }
  | { minDepth: number }
  | { maxDepth: number }

// ── ApiNode ──────────────────────────────────────────────────────────────────

export interface ApiNodeConfig {
  url: string | JsonataExpr
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  authAdapterId: string
  queryParams?: Record<string, string | JsonataExpr>
  headers?: Record<string, string>
  body?: JsonValue | JsonataExpr
  formParams?: Record<string, string | JsonataExpr>
  fileParams?: Array<{ fieldName: string; sourceKey: string }>
  /** JSONata on ServiceResponse.data → GridRow[] */
  responseTransform?: string
  paginationConfig?: {
    type: 'offset' | 'cursor' | 'page'
    pageSizeParam: string
    pageParam: string
    totalKey?: string
  }
}

export interface ApiNodeOutput {
  rows: GridRow[]
  total?: number
  nextPage?: string | null
}

// ── TransformNode ─────────────────────────────────────────────────────────────

export interface TransformNodeConfig {
  /** Must reference an 'api' or 'merge' node */
  sourceNodeId: string
  /** JSONata expression; input is source rows */
  expression: string
}

// ── ColumnNode ────────────────────────────────────────────────────────────────

export interface ColumnDef {
  field: string
  header: string
  type?: ColumnType
  sortable?: boolean
  filterable?: boolean
  editable?: boolean | DepthRule
  renderType?: 'badge' | 'boolean' | 'date' | 'code' | 'custom'
  /** JSONata per-cell transform; input is the row object */
  valueExpr?: string
  width?: number
  pinned?: 'left' | 'right'
  hidden?: boolean
  selectOptions?: SelectOption[]
  depthRules?: DepthRule[]
}

export interface ColumnNodeConfig {
  columns: ColumnDef[]
  /** References an ActionNode in the same DAG; output appended as action column */
  actionNodeId?: string
}

export interface ColumnNodeOutput {
  columns: GridColumnDef<GridRow>[]
  /** Columns with hidden:true appear as { field: false } */
  visibility: Record<string, boolean>
}

// ── RowExpandNode ─────────────────────────────────────────────────────────────

export interface RowExpandNodeConfig {
  triggerOnExpand: boolean
  /** References a lazy ApiNode in nodes[] — NOT in edges */
  childApiNodeId: string
  /** e.g. '$:$row.id' — evaluated with row context */
  childKeyExpr: JsonataExpr
  /** Query param key to inject, e.g. 'parentId' */
  childQueryParam: string
  infiniteLoad?: boolean
  maxDepth?: number
}

export interface RowExpandOutput {
  expandHandler: (row: GridRow) => Promise<GridRow[]>
}

// ── MergeNode ─────────────────────────────────────────────────────────────────

export type MergeStrategy = 'concat' | 'join' | 'merge'

export interface MergeNodeConfig {
  /** Must reference 'api' or 'transform' nodes */
  sourceNodeIds: string[]
  strategy: MergeStrategy
  /** Required when strategy is 'join' */
  joinKey?: string
}

// ── ActionNode ────────────────────────────────────────────────────────────────

export interface ActionDef {
  id: string
  label: string
  icon?: string
  /** Lazy ApiNode id (NOT in edges) */
  apiNodeId: string
  confirmMessage?: string
  /** Evaluated with $row context; default visible */
  visibilityExpr?: JsonataExpr
  /** Evaluated with $row context; default enabled */
  disabledExpr?: JsonataExpr
}

export interface ActionNodeConfig {
  rowActions?: ActionDef[]
  toolbarActions?: ActionDef[]
  cellActions?: ActionDef[]
}

export interface ActionOutput {
  rowActions: ActionDef[]
  toolbarActions: ActionDef[]
  cellActions: ActionDef[]
}

// ── NodeOutputMap ─────────────────────────────────────────────────────────────

export interface NodeOutputMap {
  api:       ApiNodeOutput
  transform: GridRow[]
  column:    ColumnNodeOutput
  rowExpand: RowExpandOutput
  merge:     GridRow[]
  action:    ActionOutput
}

// ── Features ──────────────────────────────────────────────────────────────────

export interface DAGFeaturesConfig extends GridFeaturesConfig {
  columnOrdering?: { enabled?: boolean }
  columnResizing?: { enabled?: boolean }
  columnVisibility?: { enabled?: boolean }
}

// ── Top-level config ──────────────────────────────────────────────────────────

export interface DAGTableConfig {
  tableId: string
  mode: GridMode
  dag: DAGConfig
  features?: DAGFeaturesConfig
  density?: GridDensity
}

// ── Hook result ───────────────────────────────────────────────────────────────

export interface DAGTableResult {
  data: GridRow[]
  columns: GridColumnDef<GridRow>[]
  columnVisibility: Record<string, boolean>
  isLoading: boolean
  isFetchingNextPage: boolean
  error: import('../core/dag-validator').DAGExecutionError
    | import('../core/dag-validator').DAGValidationError
    | null
  pagination?: {
    pageIndex: number
    pageCount: number
    onPageChange: (page: number) => void
    pageSize: number
  }
  hasNextPage?: boolean
  fetchNextPage?: () => void
  onExpand?: (row: GridRow) => Promise<GridRow[]>
  onAction?: (actionId: string, row?: GridRow) => Promise<void>
}
```

- [ ] **Step 5: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | grep "table-engine/types" | head -20
```

Expected: No errors in the new type files.

- [ ] **Step 6: Commit**

```bash
git add src/components/data-grid/table-engine/types/
git commit -m "feat(table-engine): add DAG type system — dag, api, auth, table types"
```

---

## Task 2: DAGValidator + Error Classes

**Files:**
- Create: `src/components/data-grid/table-engine/core/dag-validator.ts`

> No tests here — validator is integration-tested via DAGEngine tests in Task 5. Error classes are tested via NodeContext tests in Task 3.

- [ ] **Step 1: Create `core/dag-validator.ts`**

```ts
// src/components/data-grid/table-engine/core/dag-validator.ts
import type { ServiceError } from '@/services'
import type { DAGConfig } from '../types/dag.types'

// ── Error classes ─────────────────────────────────────────────────────────────

/** Thrown at config mount time — invalid graph structure */
export class DAGValidationError extends Error {
  constructor(message: string, public readonly nodeId?: string) {
    super(message)
    this.name = 'DAGValidationError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

/** Thrown at execution time — node executor failed */
export class DAGExecutionError extends Error {
  constructor(
    message: string,
    public readonly nodeId: string,
    public readonly cause: ServiceError | Error
  ) {
    super(message)
    this.name = 'DAGExecutionError'
    Object.setPrototypeOf(this, new.target.prototype)
  }
}

// ── Validation ────────────────────────────────────────────────────────────────

export function validateDAG(dag: DAGConfig, authIds: Set<string>): void {
  const nodeIds = new Set(dag.nodes.map(n => n.id))

  // Duplicate node ids
  const seen = new Set<string>()
  for (const n of dag.nodes) {
    if (seen.has(n.id)) throw new DAGValidationError(`Duplicate node id: "${n.id}"`, n.id)
    seen.add(n.id)
  }

  // Edge references must exist in nodes[]
  for (const edge of dag.edges) {
    if (!nodeIds.has(edge.from)) {
      throw new DAGValidationError(`Edge references unknown node: "${edge.from}"`, edge.from)
    }
    if (!nodeIds.has(edge.to)) {
      throw new DAGValidationError(`Edge references unknown node: "${edge.to}"`, edge.to)
    }
  }

  // rootNodeId must exist
  if (!nodeIds.has(dag.rootNodeId)) {
    throw new DAGValidationError(
      `rootNodeId "${dag.rootNodeId}" not found in nodes[]`,
      dag.rootNodeId
    )
  }

  // Per-node validation
  for (const node of dag.nodes) {
    if (node.type === 'api') {
      if (!authIds.has(node.config.authAdapterId)) {
        throw new DAGValidationError(
          `Node "${node.id}" references unknown authAdapterId: "${node.config.authAdapterId}"`,
          node.id
        )
      }
    }

    if (node.type === 'rowExpand') {
      if (!nodeIds.has(node.config.childApiNodeId)) {
        throw new DAGValidationError(
          `RowExpandNode "${node.id}" references unknown childApiNodeId: "${node.config.childApiNodeId}"`,
          node.id
        )
      }
    }

    if (node.type === 'action') {
      const allActions = [
        ...(node.config.rowActions ?? []),
        ...(node.config.toolbarActions ?? []),
        ...(node.config.cellActions ?? []),
      ]
      for (const action of allActions) {
        if (!nodeIds.has(action.apiNodeId)) {
          throw new DAGValidationError(
            `ActionNode "${node.id}" action "${action.id}" references unknown apiNodeId: "${action.apiNodeId}"`,
            node.id
          )
        }
      }
    }
  }
}
```

- [ ] **Step 2: Verify compile**

```bash
npx tsc --noEmit 2>&1 | grep "dag-validator" | head -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/data-grid/table-engine/core/dag-validator.ts
git commit -m "feat(table-engine): add DAGValidationError, DAGExecutionError, validateDAG"
```

---

## Task 3: NodeContext

**Files:**
- Create: `src/components/data-grid/table-engine/core/node-context.ts`
- Create: `src/components/data-grid/table-engine/__tests__/node-context.test.ts`

- [ ] **Step 1: Write failing test**

```ts
// src/components/data-grid/table-engine/__tests__/node-context.test.ts
import { describe, it, expect } from 'vitest'
import { NodeContext } from '../core/node-context'
import { DAGExecutionError } from '../core/dag-validator'
import type { ApiNodeOutput, GridRow } from '../types/table.types'

const fakeApiOutput: ApiNodeOutput = {
  rows: [{ id: '1', name: 'Alice' }],
}

describe('NodeContext', () => {
  it('set then get returns the same output', () => {
    const ctx = new NodeContext()
    ctx.set('node1', 'api', fakeApiOutput)
    expect(ctx.get('node1', 'api')).toBe(fakeApiOutput)
  })

  it('has() returns false for missing node', () => {
    expect(new NodeContext().has('missing')).toBe(false)
  })

  it('has() returns true after set', () => {
    const ctx = new NodeContext()
    ctx.set('n', 'api', fakeApiOutput)
    expect(ctx.has('n')).toBe(true)
  })

  it('get() throws DAGExecutionError for missing node', () => {
    const ctx = new NodeContext()
    expect(() => ctx.get('missing', 'api')).toThrow(DAGExecutionError)
  })

  it('get() error message includes the missing node id', () => {
    const ctx = new NodeContext()
    try {
      ctx.get('node-xyz', 'api')
    } catch (e) {
      expect((e as DAGExecutionError).nodeId).toBe('node-xyz')
    }
  })

  it('withRow() clones context with row binding', () => {
    const ctx = new NodeContext()
    ctx.set('n', 'api', fakeApiOutput)
    const row: GridRow = { id: 'r1', title: 'Part A' }
    const child = ctx.withRow(row)
    expect(child.getRow()).toBe(row)
    // parent unchanged
    expect(ctx.getRow()).toBeUndefined()
    // stored outputs are visible in child
    expect(child.get('n', 'api')).toBe(fakeApiOutput)
  })

  it('withParams() clones context with params', () => {
    const ctx = new NodeContext()
    const child = ctx.withParams({ rootId: 'ABC' })
    expect(child.getParams()).toEqual({ rootId: 'ABC' })
    // parent unchanged
    expect(ctx.getParams()).toEqual({})
  })

  it('withParams() merges with existing params', () => {
    const ctx = new NodeContext().withParams({ a: '1' })
    const child = ctx.withParams({ b: '2' })
    expect(child.getParams()).toEqual({ a: '1', b: '2' })
  })

  it('getAll() returns a read-only map of all stored outputs', () => {
    const ctx = new NodeContext()
    ctx.set('n', 'api', fakeApiOutput)
    const all = ctx.getAll()
    expect(all.size).toBe(1)
    expect(all.has('n')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/node-context.test.ts
```

Expected: FAIL — `Cannot find module '../core/node-context'`.

- [ ] **Step 3: Implement NodeContext**

```ts
// src/components/data-grid/table-engine/core/node-context.ts
import type { NodeType, NodeOutputMap } from '../types/dag.types'
import type { GridRow } from '../types/table.types'
import type { JsonPrimitive } from '../types/dag.types'
import { DAGExecutionError } from './dag-validator'

interface StoredEntry {
  type: NodeType
  output: NodeOutputMap[NodeType]
}

export class NodeContext {
  private readonly store: Map<string, StoredEntry>
  private readonly row: GridRow | undefined
  private readonly params: Record<string, JsonPrimitive>

  constructor(
    store: Map<string, StoredEntry> = new Map(),
    row?: GridRow,
    params: Record<string, JsonPrimitive> = {}
  ) {
    this.store = store
    this.row = row
    this.params = params
  }

  get<T extends NodeType>(nodeId: string, type: T): NodeOutputMap[T] {
    const entry = this.store.get(nodeId)
    if (!entry) {
      throw new DAGExecutionError(
        `NodeContext: node "${nodeId}" has no stored output. ` +
          `Check execution order or call has() before get() for lazy nodes.`,
        nodeId,
        new Error('Missing node output')
      )
    }
    return entry.output as NodeOutputMap[T]
  }

  set<T extends NodeType>(nodeId: string, type: T, output: NodeOutputMap[T]): void {
    this.store.set(nodeId, { type, output })
  }

  has(nodeId: string): boolean {
    return this.store.has(nodeId)
  }

  getAll(): ReadonlyMap<string, StoredEntry> {
    return this.store
  }

  withRow(row: GridRow): NodeContext {
    return new NodeContext(new Map(this.store), row, { ...this.params })
  }

  withParams(params: Record<string, JsonPrimitive>): NodeContext {
    return new NodeContext(new Map(this.store), this.row, { ...this.params, ...params })
  }

  getRow(): GridRow | undefined {
    return this.row
  }

  getParams(): Record<string, JsonPrimitive> {
    return this.params
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/node-context.test.ts
```

Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/core/node-context.ts \
        src/components/data-grid/table-engine/__tests__/node-context.test.ts
git commit -m "feat(table-engine): add NodeContext with typed get/set/withRow/withParams"
```

---

## Task 4: NodeRegistry + AuthAdapterRegistry

**Files:**
- Create: `src/components/data-grid/table-engine/core/node-registry.ts`
- Create: `src/components/data-grid/table-engine/core/auth-registry.ts`
- Create: `src/components/data-grid/table-engine/__tests__/registries.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/components/data-grid/table-engine/__tests__/registries.test.ts
import { describe, it, expect, vi } from 'vitest'
import { NodeRegistry } from '../core/node-registry'
import { AuthAdapterRegistry } from '../core/auth-registry'
import { DAGValidationError } from '../core/dag-validator'
import type { INodeExecutor } from '../core/node-registry'
import type { IAuthAdapter } from '../types/auth.types'

const fakeExecutor = { execute: vi.fn() } as unknown as INodeExecutor<'api'>
const fakeAdapter: IAuthAdapter = { name: 'test', request: vi.fn() }

describe('NodeRegistry', () => {
  it('register then resolve returns the same executor', () => {
    const reg = new NodeRegistry()
    reg.register('api', fakeExecutor)
    expect(reg.resolve('api')).toBe(fakeExecutor)
  })

  it('resolve throws DAGValidationError for unregistered type', () => {
    expect(() => new NodeRegistry().resolve('api')).toThrow(DAGValidationError)
  })

  it('register returns this for fluent chaining', () => {
    const reg = new NodeRegistry()
    expect(reg.register('api', fakeExecutor)).toBe(reg)
  })

  it('overwriting a registered type replaces executor', () => {
    const reg = new NodeRegistry()
    const exec2 = { execute: vi.fn() } as unknown as INodeExecutor<'api'>
    reg.register('api', fakeExecutor).register('api', exec2)
    expect(reg.resolve('api')).toBe(exec2)
  })
})

describe('AuthAdapterRegistry', () => {
  it('register then resolve returns the same adapter', () => {
    const reg = new AuthAdapterRegistry()
    reg.register('test', fakeAdapter)
    expect(reg.resolve('test')).toBe(fakeAdapter)
  })

  it('resolve throws DAGValidationError for unknown id', () => {
    expect(() => new AuthAdapterRegistry().resolve('missing')).toThrow(DAGValidationError)
  })

  it('register returns this for fluent chaining', () => {
    const reg = new AuthAdapterRegistry()
    expect(reg.register('test', fakeAdapter)).toBe(reg)
  })

  it('ids() returns a set of all registered adapter ids', () => {
    const reg = new AuthAdapterRegistry()
    reg.register('wafdata', fakeAdapter).register('none', fakeAdapter)
    expect(reg.ids()).toEqual(new Set(['wafdata', 'none']))
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/registries.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Implement NodeRegistry**

```ts
// src/components/data-grid/table-engine/core/node-registry.ts
import type { NodeType, NodeConfigMap, NodeOutputMap, DAGNode } from '../types/dag.types'
import type { NodeContext } from './node-context'
import { DAGValidationError } from './dag-validator'

export interface INodeExecutor<T extends NodeType> {
  execute(
    config: NodeConfigMap[T],
    context: NodeContext,
    allNodes: DAGNode[]
  ): Promise<NodeOutputMap[T]>
}

export class NodeRegistry {
  private readonly map = new Map<NodeType, INodeExecutor<NodeType>>()

  register<T extends NodeType>(type: T, executor: INodeExecutor<T>): this {
    this.map.set(type, executor as INodeExecutor<NodeType>)
    return this
  }

  resolve<T extends NodeType>(type: T): INodeExecutor<T> {
    const executor = this.map.get(type)
    if (!executor) {
      throw new DAGValidationError(`No executor registered for node type: "${type}"`)
    }
    return executor as INodeExecutor<T>
  }
}
```

- [ ] **Step 4: Implement AuthAdapterRegistry**

```ts
// src/components/data-grid/table-engine/core/auth-registry.ts
import type { IAuthAdapter } from '../types/auth.types'
import { DAGValidationError } from './dag-validator'

export class AuthAdapterRegistry {
  private readonly map = new Map<string, IAuthAdapter>()

  register(id: string, adapter: IAuthAdapter): this {
    this.map.set(id, adapter)
    return this
  }

  resolve(id: string): IAuthAdapter {
    const adapter = this.map.get(id)
    if (!adapter) {
      throw new DAGValidationError(`No auth adapter registered for id: "${id}"`)
    }
    return adapter
  }

  ids(): Set<string> {
    return new Set(this.map.keys())
  }
}
```

- [ ] **Step 5: Run test — verify it passes**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/registries.test.ts
```

Expected: PASS — 8 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/data-grid/table-engine/core/node-registry.ts \
        src/components/data-grid/table-engine/core/auth-registry.ts \
        src/components/data-grid/table-engine/__tests__/registries.test.ts
git commit -m "feat(table-engine): add NodeRegistry and AuthAdapterRegistry with fluent register()"
```

---

## Task 5: DependencyResolver

**Files:**
- Create: `src/components/data-grid/table-engine/core/dependency-resolver.ts`
- Create: `src/components/data-grid/table-engine/__tests__/dependency-resolver.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/components/data-grid/table-engine/__tests__/dependency-resolver.test.ts
import { describe, it, expect } from 'vitest'
import { buildWaves } from '../core/dependency-resolver'
import { DAGValidationError } from '../core/dag-validator'
import type { DAGConfig } from '../types/dag.types'

function dag(nodes: string[], edges: [string, string][], root?: string): DAGConfig {
  return {
    nodes: nodes.map(id => ({
      id,
      type: 'api' as const,
      config: { url: '/', method: 'GET' as const, authAdapterId: 'none' },
    })),
    edges: edges.map(([from, to]) => ({ from, to })),
    rootNodeId: root ?? nodes[nodes.length - 1],
  }
}

describe('buildWaves', () => {
  it('single node with no edges → one wave containing that node', () => {
    const waves = buildWaves(dag(['a'], []))
    expect(waves).toHaveLength(1)
    expect(waves[0].map(n => n.id)).toEqual(['a'])
  })

  it('linear chain a→b→c produces 3 sequential waves', () => {
    const waves = buildWaves(dag(['a', 'b', 'c'], [['a', 'b'], ['b', 'c']]))
    expect(waves).toHaveLength(3)
    expect(waves[0].map(n => n.id)).toEqual(['a'])
    expect(waves[1].map(n => n.id)).toEqual(['b'])
    expect(waves[2].map(n => n.id)).toEqual(['c'])
  })

  it('two independent roots a,b both feed c → wave 0 has 2 nodes', () => {
    const waves = buildWaves(dag(['a', 'b', 'c'], [['a', 'c'], ['b', 'c']]))
    expect(waves[0].map(n => n.id).sort()).toEqual(['a', 'b'])
    expect(waves[1].map(n => n.id)).toEqual(['c'])
  })

  it('lazy nodes (present in nodes[] but not in edges) are excluded from waves', () => {
    const cfg: DAGConfig = {
      nodes: [
        { id: 'active', type: 'api', config: { url: '/', method: 'GET', authAdapterId: 'none' } },
        { id: 'lazy',   type: 'api', config: { url: '/', method: 'GET', authAdapterId: 'none' } },
      ],
      edges: [],
      rootNodeId: 'active',
    }
    const waves = buildWaves(cfg)
    const allIds = waves.flat().map(n => n.id)
    expect(allIds).toContain('active')
    expect(allIds).not.toContain('lazy')
  })

  it('cycle throws DAGValidationError', () => {
    expect(() =>
      buildWaves(dag(['a', 'b'], [['a', 'b'], ['b', 'a']]))
    ).toThrow(DAGValidationError)
  })

  it('edge referencing a node not in nodes[] throws DAGValidationError', () => {
    const cfg: DAGConfig = {
      nodes: [{ id: 'a', type: 'api', config: { url: '/', method: 'GET', authAdapterId: 'none' } }],
      edges: [{ from: 'a', to: 'ghost' }],
      rootNodeId: 'a',
    }
    expect(() => buildWaves(cfg)).toThrow(DAGValidationError)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/dependency-resolver.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement DependencyResolver**

```ts
// src/components/data-grid/table-engine/core/dependency-resolver.ts
import type { DAGConfig, DAGNode } from '../types/dag.types'
import { DAGValidationError } from './dag-validator'

export type Wave = DAGNode[]

/**
 * Topological sort via Kahn's algorithm.
 * Operates ONLY on nodes reachable via edges — lazy nodes (in nodes[] but not in
 * any edge) are excluded. A root-only DAG (no edges) returns a single wave.
 */
export function buildWaves(dag: DAGConfig): Wave[] {
  const nodeMap = new Map<string, DAGNode>(dag.nodes.map(n => [n.id, n]))

  // Collect only the node ids that appear in at least one edge
  const edgeNodeIds = new Set<string>()
  for (const edge of dag.edges) {
    edgeNodeIds.add(edge.from)
    edgeNodeIds.add(edge.to)
  }

  // No edges: root-only, single wave
  if (edgeNodeIds.size === 0) {
    const root = nodeMap.get(dag.rootNodeId)
    if (!root) {
      throw new DAGValidationError(
        `rootNodeId "${dag.rootNodeId}" not found in nodes[]`,
        dag.rootNodeId
      )
    }
    return [[root]]
  }

  // Validate edge references
  for (const id of edgeNodeIds) {
    if (!nodeMap.has(id)) {
      throw new DAGValidationError(
        `Edge references node "${id}" which is not in nodes[]`,
        id
      )
    }
  }

  // Build in-degree map and dependents adjacency for edge-reachable nodes
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()

  for (const id of edgeNodeIds) {
    inDegree.set(id, 0)
    dependents.set(id, [])
  }
  for (const edge of dag.edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1)
    dependents.get(edge.from)!.push(edge.to)
  }

  const waves: Wave[] = []
  const remaining = new Set(inDegree.keys())

  while (remaining.size > 0) {
    const ready: string[] = []
    for (const id of remaining) {
      if ((inDegree.get(id) ?? 0) === 0) ready.push(id)
    }

    if (ready.length === 0) {
      throw new DAGValidationError(
        `Circular dependency detected. Remaining nodes: ${[...remaining].join(', ')}`
      )
    }

    waves.push(ready.map(id => nodeMap.get(id)!))

    for (const id of ready) {
      remaining.delete(id)
      for (const dep of dependents.get(id) ?? []) {
        inDegree.set(dep, (inDegree.get(dep) ?? 0) - 1)
      }
    }
  }

  return waves
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/dependency-resolver.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/core/dependency-resolver.ts \
        src/components/data-grid/table-engine/__tests__/dependency-resolver.test.ts
git commit -m "feat(table-engine): add DependencyResolver — Kahn's edge-based topological sort"
```

---

## Task 6: DAGEngine

**Files:**
- Create: `src/components/data-grid/table-engine/core/dag-engine.ts`
- Create: `src/components/data-grid/table-engine/__tests__/dag-engine.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/components/data-grid/table-engine/__tests__/dag-engine.test.ts
import { describe, it, expect, vi } from 'vitest'
import { DAGEngine } from '../core/dag-engine'
import { NodeRegistry } from '../core/node-registry'
import { AuthAdapterRegistry } from '../core/auth-registry'
import { NodeContext } from '../core/node-context'
import { DAGValidationError } from '../core/dag-validator'
import type { DAGConfig } from '../types/dag.types'
import type { ColumnNodeOutput } from '../types/table.types'

function makeSetup() {
  const auth = new AuthAdapterRegistry()
  auth.register('none', { name: 'none', request: vi.fn() })
  const nodes = new NodeRegistry()
  const engine = new DAGEngine(nodes, auth)
  return { engine, nodes, auth }
}

const colOutput: ColumnNodeOutput = { columns: [], visibility: {} }

describe('DAGEngine', () => {
  it('executes a single root node and returns its output', async () => {
    const { engine, nodes } = makeSetup()
    nodes.register('column', { execute: vi.fn().mockResolvedValue(colOutput) })
    const dag: DAGConfig = {
      nodes: [{ id: 'cols', type: 'column', config: { columns: [] } }],
      edges: [],
      rootNodeId: 'cols',
    }
    const result = await engine.execute(dag, 'column')
    expect(result).toBe(colOutput)
  })

  it('executes linear DAG in topological order', async () => {
    const { engine, nodes } = makeSetup()
    const order: string[] = []
    nodes.register('api', {
      execute: vi.fn().mockImplementation(async () => {
        order.push('api')
        return { rows: [] }
      }),
    })
    nodes.register('column', {
      execute: vi.fn().mockImplementation(async () => {
        order.push('column')
        return colOutput
      }),
    })
    const dag: DAGConfig = {
      nodes: [
        { id: 'api1', type: 'api', config: { url: '/', method: 'GET', authAdapterId: 'none' } },
        { id: 'cols', type: 'column', config: { columns: [] } },
      ],
      edges: [{ from: 'api1', to: 'cols' }],
      rootNodeId: 'cols',
    }
    await engine.execute(dag, 'column')
    expect(order).toEqual(['api', 'column'])
  })

  it('stores each node output in NodeContext so downstream nodes can read it', async () => {
    const { engine, nodes } = makeSetup()
    const apiOutput = { rows: [{ id: '1' }] }
    let capturedCtx: NodeContext | undefined
    nodes.register('api', { execute: vi.fn().mockResolvedValue(apiOutput) })
    nodes.register('column', {
      execute: vi.fn().mockImplementation(async (_cfg, ctx: NodeContext) => {
        capturedCtx = ctx
        return colOutput
      }),
    })
    const dag: DAGConfig = {
      nodes: [
        { id: 'api1', type: 'api', config: { url: '/', method: 'GET', authAdapterId: 'none' } },
        { id: 'cols', type: 'column', config: { columns: [] } },
      ],
      edges: [{ from: 'api1', to: 'cols' }],
      rootNodeId: 'cols',
    }
    await engine.execute(dag, 'column')
    expect(capturedCtx?.has('api1')).toBe(true)
    expect(capturedCtx?.get('api1', 'api')).toBe(apiOutput)
  })

  it('passes allNodes array as third argument to every executor', async () => {
    const { engine, nodes } = makeSetup()
    const executeMock = vi.fn().mockResolvedValue(colOutput)
    nodes.register('column', { execute: executeMock })
    const dag: DAGConfig = {
      nodes: [
        { id: 'cols', type: 'column', config: { columns: [] } },
        { id: 'lazy', type: 'api', config: { url: '/', method: 'GET', authAdapterId: 'none' } },
      ],
      edges: [],
      rootNodeId: 'cols',
    }
    await engine.execute(dag, 'column')
    const [, , allNodes] = executeMock.mock.calls[0]
    expect(allNodes).toHaveLength(2)
    expect(allNodes.map((n: { id: string }) => n.id)).toContain('lazy')
  })

  it('throws DAGValidationError for unknown authAdapterId before executing', async () => {
    const { engine, nodes } = makeSetup()
    nodes.register('api', { execute: vi.fn() })
    const dag: DAGConfig = {
      nodes: [{ id: 'a', type: 'api', config: { url: '/', method: 'GET', authAdapterId: 'bad-id' } }],
      edges: [],
      rootNodeId: 'a',
    }
    await expect(engine.execute(dag, 'api')).rejects.toThrow(DAGValidationError)
  })

  it('accepts an external NodeContext and populates it', async () => {
    const { engine, nodes } = makeSetup()
    nodes.register('column', { execute: vi.fn().mockResolvedValue(colOutput) })
    const ctx = new NodeContext()
    const dag: DAGConfig = {
      nodes: [{ id: 'cols', type: 'column', config: { columns: [] } }],
      edges: [],
      rootNodeId: 'cols',
    }
    await engine.execute(dag, 'column', ctx)
    expect(ctx.has('cols')).toBe(true)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/dag-engine.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement DAGEngine**

```ts
// src/components/data-grid/table-engine/core/dag-engine.ts
import type { DAGConfig, NodeType, NodeOutputMap } from '../types/dag.types'
import type { NodeRegistry } from './node-registry'
import type { AuthAdapterRegistry } from './auth-registry'
import { NodeContext } from './node-context'
import { buildWaves } from './dependency-resolver'
import { validateDAG } from './dag-validator'

export class DAGEngine {
  constructor(
    private readonly nodeRegistry: NodeRegistry,
    private readonly authRegistry: AuthAdapterRegistry
  ) {}

  async execute<T extends NodeType>(
    dag: DAGConfig,
    rootType: T,
    context: NodeContext = new NodeContext()
  ): Promise<NodeOutputMap[T]> {
    // 1. Validate graph structure and auth references before any execution
    validateDAG(dag, this.authRegistry.ids())

    // 2. Build execution waves (lazy nodes excluded)
    const waves = buildWaves(dag)

    // 3. Execute wave by wave; within each wave run in parallel
    for (const wave of waves) {
      await Promise.all(
        wave.map(async (node) => {
          const executor = this.nodeRegistry.resolve(node.type)
          const output = await executor.execute(
            node.config as never,
            context,
            dag.nodes          // full nodes[] including lazy ones
          )
          context.set(node.id, node.type, output as never)
        })
      )
    }

    // 4. Return root node output
    return context.get(dag.rootNodeId, rootType)
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/dag-engine.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/core/dag-engine.ts \
        src/components/data-grid/table-engine/__tests__/dag-engine.test.ts
git commit -m "feat(table-engine): add DAGEngine — wave execution, context threading, allNodes pass-through"
```

---

## Task 7: Auth Adapters

**Files:**
- Create: `src/components/data-grid/table-engine/adapters/wafdata-auth-adapter.ts`
- Create: `src/components/data-grid/table-engine/adapters/bearer-auth-adapter.ts`
- Create: `src/components/data-grid/table-engine/adapters/no-auth-adapter.ts`
- Create: `src/components/data-grid/table-engine/__tests__/auth-adapters.test.ts`

- [ ] **Step 0: Create `src/services/index.ts` barrel (if it doesn't already exist)**

The auth adapters import from `@/services`. Create the barrel so the alias resolves:

```ts
// src/services/index.ts
export { httpClient, createHttpClient } from './http/client'
export type { HttpClient } from './http/client'
export { ServiceError } from './types'
export type { HttpMethod, RequestOptions, ServiceResponse } from './types'
```

> Skip this step if `src/services/index.ts` already exists.

- [ ] **Step 1: Write failing tests**

```ts
// src/components/data-grid/table-engine/__tests__/auth-adapters.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WAFDataAuthAdapter } from '../adapters/wafdata-auth-adapter'
import { BearerAuthAdapter } from '../adapters/bearer-auth-adapter'
import { NoAuthAdapter } from '../adapters/no-auth-adapter'

vi.mock('@/services', () => ({
  httpClient: { execute: vi.fn() },
}))

import { httpClient } from '@/services'
const mockExecute = vi.mocked(httpClient.execute)
const okResponse = { data: {}, status: 200, statusText: 'OK', headers: {}, time: 0, size: 0 }

describe('WAFDataAuthAdapter', () => {
  beforeEach(() => mockExecute.mockReset())

  it('name is "wafdata"', () => {
    expect(new WAFDataAuthAdapter().name).toBe('wafdata')
  })

  it('calls httpClient.execute with positional (method, url, opts)', async () => {
    mockExecute.mockResolvedValue(okResponse)
    await new WAFDataAuthAdapter().request({ url: '/api/test', method: 'GET' })
    expect(mockExecute).toHaveBeenCalledWith('GET', '/api/test', expect.any(Object))
  })

  it('maps queryParams to opts.params', async () => {
    mockExecute.mockResolvedValue(okResponse)
    await new WAFDataAuthAdapter().request({
      url: '/api', method: 'GET',
      queryParams: { '$mask': 'Default' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      'GET', '/api',
      expect.objectContaining({ params: { '$mask': 'Default' } })
    )
  })

  it('maps body to opts.data', async () => {
    mockExecute.mockResolvedValue(okResponse)
    await new WAFDataAuthAdapter().request({
      url: '/api', method: 'POST', body: { key: 'val' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      'POST', '/api',
      expect.objectContaining({ data: { key: 'val' } })
    )
  })
})

describe('BearerAuthAdapter', () => {
  beforeEach(() => mockExecute.mockReset())

  it('name is "bearer"', () => {
    expect(new BearerAuthAdapter('tok').name).toBe('bearer')
  })

  it('injects Authorization: Bearer <token> header', async () => {
    mockExecute.mockResolvedValue(okResponse)
    await new BearerAuthAdapter('mytoken').request({ url: '/x', method: 'GET' })
    expect(mockExecute).toHaveBeenCalledWith(
      'GET', '/x',
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer mytoken' }),
      })
    )
  })

  it('preserves caller-supplied headers alongside Authorization', async () => {
    mockExecute.mockResolvedValue(okResponse)
    await new BearerAuthAdapter('tok').request({
      url: '/x', method: 'GET',
      headers: { 'X-Custom': 'yes' },
    })
    expect(mockExecute).toHaveBeenCalledWith(
      'GET', '/x',
      expect.objectContaining({
        headers: expect.objectContaining({
          'X-Custom': 'yes',
          Authorization: 'Bearer tok',
        }),
      })
    )
  })
})

describe('NoAuthAdapter', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        forEach: (cb: (v: string, k: string) => void) => cb('application/json', 'content-type'),
      },
      json: () => Promise.resolve({ result: 'ok' }),
    } as unknown as Response)
  })

  it('name is "none"', () => {
    expect(new NoAuthAdapter().name).toBe('none')
  })

  it('calls fetch and returns ServiceResponse-shaped result', async () => {
    const result = await new NoAuthAdapter().request({ url: '/open', method: 'GET' })
    expect(result.status).toBe(200)
    expect(result.data).toEqual({ result: 'ok' })
  })

  it('appends queryParams to URL', async () => {
    await new NoAuthAdapter().request({
      url: 'http://localhost/open',
      method: 'GET',
      queryParams: { foo: 'bar' },
    })
    const calledUrl = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    expect(calledUrl).toContain('foo=bar')
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/auth-adapters.test.ts
```

Expected: FAIL — adapter modules not found.

- [ ] **Step 3: Implement WAFDataAuthAdapter**

```ts
// src/components/data-grid/table-engine/adapters/wafdata-auth-adapter.ts
import { httpClient } from '@/services'
import type { RequestOptions } from '@/services'
import type { IAuthAdapter, ServiceResponse } from '../types/auth.types'
import type { AuthRequestOptions } from '../types/api.types'

export class WAFDataAuthAdapter implements IAuthAdapter {
  readonly name = 'wafdata'

  async request<TResponse>(options: AuthRequestOptions): Promise<ServiceResponse<TResponse>> {
    const { url, method, headers, queryParams, body } = options
    const opts: RequestOptions = {}
    if (headers)     opts.headers     = headers
    if (queryParams) opts.queryParams = queryParams

    switch (method) {
      case 'GET':    return httpClient.get<TResponse>(url, opts)
      case 'POST':   return httpClient.post<TResponse>(url, body, opts)
      case 'PUT':    return httpClient.put<TResponse>(url, body, opts)
      case 'PATCH':  return httpClient.patch<TResponse>(url, body, opts)
      case 'DELETE': return httpClient.delete<TResponse>(url, opts)
      default:       return httpClient.get<TResponse>(url, opts)
    }
  }
}
```

- [ ] **Step 4: Implement BearerAuthAdapter**

```ts
// src/components/data-grid/table-engine/adapters/bearer-auth-adapter.ts
import { httpClient } from '@/services'
import type { RequestOptions } from '@/services'
import type { IAuthAdapter, ServiceResponse } from '../types/auth.types'
import type { AuthRequestOptions } from '../types/api.types'

export class BearerAuthAdapter implements IAuthAdapter {
  readonly name = 'bearer'

  constructor(private readonly token: string) {}

  async request<TResponse>(options: AuthRequestOptions): Promise<ServiceResponse<TResponse>> {
    const { url, method, headers, queryParams, body } = options
    const opts: RequestOptions = {
      headers: {
        ...headers,
        Authorization: `Bearer ${this.token}`,
      },
    }
    if (queryParams) opts.queryParams = queryParams

    switch (method) {
      case 'GET':    return httpClient.get<TResponse>(url, opts)
      case 'POST':   return httpClient.post<TResponse>(url, body, opts)
      case 'PUT':    return httpClient.put<TResponse>(url, body, opts)
      case 'PATCH':  return httpClient.patch<TResponse>(url, body, opts)
      case 'DELETE': return httpClient.delete<TResponse>(url, opts)
      default:       return httpClient.get<TResponse>(url, opts)
    }
  }
}
```

- [ ] **Step 5: Implement NoAuthAdapter**

```ts
// src/components/data-grid/table-engine/adapters/no-auth-adapter.ts
import type { IAuthAdapter, ServiceResponse } from '../types/auth.types'
import type { AuthRequestOptions } from '../types/api.types'

export class NoAuthAdapter implements IAuthAdapter {
  readonly name = 'none'

  async request<TResponse>(options: AuthRequestOptions): Promise<ServiceResponse<TResponse>> {
    const url = new URL(
      options.url,
      typeof globalThis !== 'undefined' && 'location' in globalThis
        ? (globalThis as Window).location.origin
        : 'http://localhost'
    )
    if (options.queryParams) {
      for (const [k, v] of Object.entries(options.queryParams)) {
        url.searchParams.set(k, v)
      }
    }

    const start = Date.now()
    const res = await fetch(url.toString(), {
      method: options.method,
      headers: options.headers,
      body: options.body != null ? JSON.stringify(options.body) : undefined,
    })

    const data = await res.json() as TResponse
    const headers: Record<string, string> = {}
    res.headers.forEach((v, k) => { headers[k] = v })
    const text = JSON.stringify(data)

    return {
      data,
      status: res.status,
      statusText: res.statusText,
      headers,
      time: Date.now() - start,
      size: new TextEncoder().encode(text).length,
    }
  }
}
```

- [ ] **Step 6: Run tests — verify all pass**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/auth-adapters.test.ts
```

Expected: PASS — 9 tests.

- [ ] **Step 7: Run all Phase 1 tests together**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/
```

Expected: PASS — all tests in the `__tests__` directory.

- [ ] **Step 8: Commit**

```bash
git add src/components/data-grid/table-engine/adapters/ \
        src/components/data-grid/table-engine/__tests__/auth-adapters.test.ts
git commit -m "feat(table-engine): add WAFDataAuthAdapter, BearerAuthAdapter, NoAuthAdapter"
```

---

## Phase 1 Complete — Verification

- [ ] **Run all Phase 1 tests**

```bash
npx vitest run src/components/data-grid/table-engine/
```

Expected: All tests pass (node-context, registries, dependency-resolver, dag-engine, auth-adapters).

- [ ] **TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "table-engine" | head -20
```

Expected: No errors in the new files.

- [ ] **Biome check**

```bash
npm run check
```

Expected: No lint/format errors.

- [ ] **Final commit if any formatting fixes**

```bash
git add -A && git commit -m "chore(table-engine): phase 1 biome formatting fixes" --allow-empty
```
