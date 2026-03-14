# DAG Table Engine — Phase 2: Nodes + Hook

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the JSONata evaluator, ApiNode, ColumnNode, RowExpandNode, TransformNode, and `useDAGTable` hook supporting all four modes (flat, paginated, tree, infinite). At the end of this phase a flat table renders from a single API call.

**Prerequisite:** Phase 1 (`2026-03-14-dag-phase-1-foundation.md`) must be complete.

**Architecture:** Each node executor is an independent class receiving only what it needs via constructor DI. `useDAGTable` wraps `DAGEngine.execute()` in TanStack Query; rows and columns are extracted from a shared `NodeContext` after execution.

**Tech Stack:** TypeScript 5, React 19, TanStack Query v5, JSONata, Vitest 3, Biome

**Spec:** `docs/superpowers/specs/2026-03-14-dag-table-engine-design.md`

**Previous phase:** `docs/superpowers/plans/2026-03-14-dag-phase-1-foundation.md`
**Next phase:** `docs/superpowers/plans/2026-03-14-dag-phase-3-merge-actions.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/data-grid/table-engine/jsonata-evaluator.ts` | Replace existing |
| `src/components/data-grid/table-engine/nodes/api-node.ts` | Create |
| `src/components/data-grid/table-engine/nodes/column-node.ts` | Create |
| `src/components/data-grid/table-engine/nodes/row-expand-node.ts` | Create |
| `src/components/data-grid/table-engine/nodes/transform-node.ts` | Create |
| `src/components/data-grid/table-engine/bootstrap.ts` | Create (partial — extended in Phase 3) |
| `src/components/data-grid/table-engine/hooks/use-dag-table.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/jsonata-evaluator.test.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/api-node.test.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/column-node.test.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/row-expand-node.test.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/transform-node.test.ts` | Create |
| `src/components/data-grid/table-engine/__tests__/use-dag-table.test.ts` | Create |

---

## Task 1: JSONata Evaluator

**Files:**
- Replace: `src/components/data-grid/table-engine/jsonata-evaluator.ts`
- Create: `src/components/data-grid/table-engine/__tests__/jsonata-evaluator.test.ts`

> This replaces the existing file. The new API is `evaluateExpr(expression, context, inputDoc)` — it reads `$row` and `$params` from the `NodeContext` automatically.

- [ ] **Step 1: Write failing tests**

```ts
// src/components/data-grid/table-engine/__tests__/jsonata-evaluator.test.ts
import { describe, it, expect } from 'vitest'
import { evaluateExpr, evaluateDepthRule } from '../jsonata-evaluator'
import { NodeContext } from '../core/node-context'

describe('evaluateExpr', () => {
  it('evaluates a simple arithmetic expression against inputDoc', async () => {
    const ctx = new NodeContext()
    const result = await evaluateExpr<number>('value * 2', ctx, { value: 5 })
    expect(result).toBe(10)
  })

  it('binds $params from NodeContext', async () => {
    const ctx = new NodeContext().withParams({ rootId: 'X42' })
    const result = await evaluateExpr<string>('$params.rootId', ctx, {})
    expect(result).toBe('X42')
  })

  it('binds $row from NodeContext', async () => {
    const ctx = new NodeContext().withRow({ id: 'r1', title: 'Part A' })
    const result = await evaluateExpr<string>('$row.title', ctx, {})
    expect(result).toBe('Part A')
  })

  it('returns undefined for empty string expression', async () => {
    const ctx = new NodeContext()
    expect(await evaluateExpr<undefined>('', ctx, {})).toBeUndefined()
  })

  it('returns undefined for whitespace-only expression', async () => {
    const ctx = new NodeContext()
    expect(await evaluateExpr<undefined>('   ', ctx, {})).toBeUndefined()
  })

  it('throws a descriptive error for invalid JSONata syntax', async () => {
    const ctx = new NodeContext()
    await expect(evaluateExpr('!!!', ctx, {})).rejects.toThrow('JSONata expression failed')
  })

  it('evaluates an array transform on inputDoc array', async () => {
    const ctx = new NodeContext()
    const input = [{ id: '1', qty: 2, price: 5 }, { id: '2', qty: 1, price: 10 }]
    const result = await evaluateExpr<{ id: string; total: number }[]>(
      '$.*.({"id": id, "total": qty * price})',
      ctx,
      input
    )
    expect(result).toEqual([{ id: '1', total: 10 }, { id: '2', total: 10 }])
  })

  it('builds a dynamic URL string using & operator', async () => {
    const ctx = new NodeContext().withParams({ parentId: 'P99' })
    const result = await evaluateExpr<string>(
      '"/resources/v1/item/" & $params.parentId & "/children"',
      ctx,
      {}
    )
    expect(result).toBe('/resources/v1/item/P99/children')
  })
})

describe('evaluateDepthRule', () => {
  it('{ depths: [1,2] } matches depth 1', () => {
    expect(evaluateDepthRule({ depths: [1, 2] }, 1)).toBe(true)
  })

  it('{ depths: [1,2] } does not match depth 3', () => {
    expect(evaluateDepthRule({ depths: [1, 2] }, 3)).toBe(false)
  })

  it('{ minDepth: 2 } matches depth 3', () => {
    expect(evaluateDepthRule({ minDepth: 2 }, 3)).toBe(true)
  })

  it('{ minDepth: 2 } does not match depth 1', () => {
    expect(evaluateDepthRule({ minDepth: 2 }, 1)).toBe(false)
  })

  it('{ maxDepth: 2 } matches depth 2', () => {
    expect(evaluateDepthRule({ maxDepth: 2 }, 2)).toBe(true)
  })

  it('{ maxDepth: 2 } does not match depth 3', () => {
    expect(evaluateDepthRule({ maxDepth: 2 }, 3)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/jsonata-evaluator.test.ts
```

Expected: FAIL — `evaluateExpr` not found with new signature.

- [ ] **Step 3: Replace `jsonata-evaluator.ts`**

```ts
// src/components/data-grid/table-engine/jsonata-evaluator.ts
/**
 * SOLE CAST BOUNDARY: jsonata.evaluate() returns Promise<unknown>.
 * All 'as T' casts in this file are intentional and documented.
 * No other file in the engine is permitted to use 'as' casts on API response data.
 */
import jsonata from 'jsonata'
import type { NodeContext } from './core/node-context'
import type { DepthRule } from './types/table.types'

/**
 * Evaluate a JSONata expression.
 *
 * Bindings available in expressions:
 *   $row    — from context.getRow() (empty object if no row)
 *   $params — from context.getParams()
 *
 * @param expression - JSONata string. Empty/whitespace returns undefined.
 * @param context    - NodeContext carrying $row / $params bindings.
 * @param inputDoc   - Primary input document (e.g. raw API response data).
 *                     Accessible as $, $.field, etc. in expressions.
 * @returns Result cast to T (documented cast boundary — caller asserts type).
 */
export async function evaluateExpr<T>(
  expression: string,
  context: NodeContext,
  inputDoc: unknown = {}
): Promise<T | undefined> {
  if (!expression.trim()) return undefined

  try {
    const expr = jsonata(expression)
    // Cast boundary: expr.evaluate returns Promise<unknown>
    const result = await expr.evaluate(inputDoc, {
      row:    context.getRow() ?? {},
      params: context.getParams(),
    })
    return result as T
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    throw new Error(`JSONata expression failed: ${msg}\nExpression: ${expression}`)
  }
}

/**
 * Synchronous depth-rule evaluation — no JSONata required.
 * Used by ColumnNodeExecutor when editable is a DepthRule.
 */
export function evaluateDepthRule(rule: DepthRule, depth: number): boolean {
  if ('depths'   in rule) return rule.depths.includes(depth)
  if ('minDepth' in rule) return depth >= rule.minDepth
  if ('maxDepth' in rule) return depth <= rule.maxDepth
  return false
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/jsonata-evaluator.test.ts
```

Expected: PASS — 14 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/jsonata-evaluator.ts \
        src/components/data-grid/table-engine/__tests__/jsonata-evaluator.test.ts
git commit -m "feat(table-engine): replace jsonata-evaluator with DAG-aware evaluateExpr + NodeContext bindings"
```

---

## Task 2: ApiNode

**Files:**
- Create: `src/components/data-grid/table-engine/nodes/api-node.ts`
- Create: `src/components/data-grid/table-engine/__tests__/api-node.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/components/data-grid/table-engine/__tests__/api-node.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ApiNodeExecutor } from '../nodes/api-node'
import { AuthAdapterRegistry } from '../core/auth-registry'
import { NodeContext } from '../core/node-context'
import type { ApiNodeConfig } from '../types/table.types'

function makeAuth(responseData: unknown = [{ id: '1' }]) {
  const registry = new AuthAdapterRegistry()
  const mockRequest = vi.fn().mockResolvedValue({
    data: responseData,
    status: 200, statusText: 'OK', headers: {}, time: 0, size: 0,
  })
  registry.register('test', { name: 'test', request: mockRequest })
  return { registry, mockRequest }
}

describe('ApiNodeExecutor', () => {
  it('calls auth adapter and returns rows from array response', async () => {
    const { registry } = makeAuth([{ id: '1', name: 'Alice' }])
    const result = await new ApiNodeExecutor(registry).execute(
      { url: '/items', method: 'GET', authAdapterId: 'test' },
      new NodeContext(), []
    )
    expect(result.rows).toEqual([{ id: '1', name: 'Alice' }])
  })

  it('applies responseTransform JSONata on raw response', async () => {
    const { registry } = makeAuth({ items: [{ id: '2', val: 'x' }] })
    const result = await new ApiNodeExecutor(registry).execute(
      {
        url: '/api', method: 'GET', authAdapterId: 'test',
        responseTransform: 'items.{"id": id, "value": val}',
      },
      new NodeContext(), []
    )
    expect(result.rows).toEqual([{ id: '2', value: 'x' }])
  })

  it('evaluates JsonataExpr in url using $params from context', async () => {
    const { registry, mockRequest } = makeAuth([])
    const ctx = new NodeContext().withParams({ rootId: 'ABC' })
    await new ApiNodeExecutor(registry).execute(
      { url: '$:"/items/" & $params.rootId', method: 'GET', authAdapterId: 'test' },
      ctx, []
    )
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ url: '/items/ABC' })
    )
  })

  it('evaluates JsonataExpr in queryParams', async () => {
    const { registry, mockRequest } = makeAuth([])
    const ctx = new NodeContext().withParams({ pid: 'P1' })
    await new ApiNodeExecutor(registry).execute(
      {
        url: '/api', method: 'GET', authAdapterId: 'test',
        queryParams: { parentId: '$:$params.pid' },
      },
      ctx, []
    )
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ queryParams: { parentId: 'P1' } })
    )
  })

  it('passes static body to auth adapter', async () => {
    const { registry, mockRequest } = makeAuth({})
    await new ApiNodeExecutor(registry).execute(
      {
        url: '/api', method: 'POST', authAdapterId: 'test',
        body: { comment: 'test comment' },
      },
      new NodeContext(), []
    )
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ body: { comment: 'test comment' } })
    )
  })

  it('returns empty rows array when response is not an array and no transform', async () => {
    const { registry } = makeAuth({ notAnArray: true })
    const result = await new ApiNodeExecutor(registry).execute(
      { url: '/api', method: 'GET', authAdapterId: 'test' },
      new NodeContext(), []
    )
    expect(result.rows).toEqual([])
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/api-node.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ApiNodeExecutor**

```ts
// src/components/data-grid/table-engine/nodes/api-node.ts
import type { INodeExecutor } from '../core/node-registry'
import type { AuthAdapterRegistry } from '../core/auth-registry'
import type { NodeContext } from '../core/node-context'
import type { DAGNode } from '../types/dag.types'
import type { ApiNodeConfig, ApiNodeOutput, GridRow } from '../types/table.types'
import type { JsonValue } from '../types/dag.types'
import { isJsonataExpr, extractExpr } from '../types/dag.types'
import { evaluateExpr } from '../jsonata-evaluator'
import { DAGExecutionError } from '../core/dag-validator'

export class ApiNodeExecutor implements INodeExecutor<'api'> {
  constructor(private readonly auth: AuthAdapterRegistry) {}

  async execute(
    config: ApiNodeConfig,
    context: NodeContext,
    _allNodes: DAGNode[]
  ): Promise<ApiNodeOutput> {
    try {
      // 1. Resolve URL (plain string or JsonataExpr)
      let url: string
      if (isJsonataExpr(config.url)) {
        url = (await evaluateExpr<string>(extractExpr(config.url), context, {})) ?? ''
      } else {
        url = config.url
      }

      // 2. Resolve queryParams (each value may be JsonataExpr)
      const queryParams: Record<string, string> = {}
      if (config.queryParams) {
        for (const [key, val] of Object.entries(config.queryParams)) {
          if (isJsonataExpr(val)) {
            const resolved = await evaluateExpr<JsonValue>(extractExpr(val), context, {})
            queryParams[key] = resolved != null ? String(resolved) : ''
          } else {
            queryParams[key] = val
          }
        }
      }

      // 3. Resolve body (static JsonValue or JsonataExpr)
      let body: JsonValue | undefined
      if (config.body != null) {
        if (typeof config.body === 'string' && isJsonataExpr(config.body)) {
          body = (await evaluateExpr<JsonValue>(extractExpr(config.body), context, {})) ?? null
        } else {
          body = config.body as JsonValue
        }
      }

      // 4. Dispatch via auth adapter
      const adapter = this.auth.resolve(config.authAdapterId)
      const response = await adapter.request<JsonValue>({
        url,
        method: config.method,
        headers: config.headers,
        queryParams: Object.keys(queryParams).length > 0 ? queryParams : undefined,
        body,
        responseType: 'json',
      })

      // 5. Apply responseTransform JSONata if present (cast boundary in evaluateExpr)
      let rows: GridRow[]
      if (config.responseTransform) {
        const transformed = await evaluateExpr<GridRow | GridRow[]>(
          config.responseTransform,
          context,
          response.data
        )
        if (transformed === undefined) {
          rows = []
        } else {
          rows = Array.isArray(transformed) ? transformed : [transformed]
        }
      } else {
        rows = Array.isArray(response.data) ? (response.data as GridRow[]) : []
      }

      return { rows }
    } catch (err) {
      // Re-throw DAGExecutionError as-is; wrap everything else
      if (err instanceof DAGExecutionError) throw err
      throw new DAGExecutionError(
        `ApiNode "${config.url}" failed: ${err instanceof Error ? err.message : String(err)}`,
        String(config.url),
        err instanceof Error ? err : new Error(String(err))
      )
    }
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/api-node.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/nodes/api-node.ts \
        src/components/data-grid/table-engine/__tests__/api-node.test.ts
git commit -m "feat(table-engine): add ApiNodeExecutor — JsonataExpr URL/params/body, responseTransform"
```

---

## Task 3: ColumnNode

**Files:**
- Create: `src/components/data-grid/table-engine/nodes/column-node.ts`
- Create: `src/components/data-grid/table-engine/__tests__/column-node.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/components/data-grid/table-engine/__tests__/column-node.test.ts
import { describe, it, expect } from 'vitest'
import { ColumnNodeExecutor } from '../nodes/column-node'
import { NodeContext } from '../core/node-context'
import type { ColumnNodeConfig } from '../types/table.types'

const executor = new ColumnNodeExecutor()
const ctx = new NodeContext()

describe('ColumnNodeExecutor', () => {
  it('maps a string ColumnDef to GridColumnDef', async () => {
    const config: ColumnNodeConfig = {
      columns: [{ field: 'name', header: 'Name', type: 'string' }],
    }
    const result = await executor.execute(config, ctx, [])
    expect(result.columns).toHaveLength(1)
    // accessorKey or id should match the field
    const col = result.columns[0] as { accessorKey?: string; id?: string }
    expect(col.accessorKey ?? col.id).toBe('name')
  })

  it('maps a number ColumnDef to GridColumnDef', async () => {
    const config: ColumnNodeConfig = {
      columns: [{ field: 'age', header: 'Age', type: 'number' }],
    }
    const result = await executor.execute(config, ctx, [])
    expect(result.columns).toHaveLength(1)
  })

  it('hidden column appears in visibility map with value false', async () => {
    const config: ColumnNodeConfig = {
      columns: [{ field: 'secret', header: 'Secret', hidden: true }],
    }
    const result = await executor.execute(config, ctx, [])
    expect(result.visibility['secret']).toBe(false)
  })

  it('visible column is absent from visibility map', async () => {
    const config: ColumnNodeConfig = {
      columns: [{ field: 'name', header: 'Name' }],
    }
    const result = await executor.execute(config, ctx, [])
    expect('name' in result.visibility).toBe(false)
  })

  it('sortable:false sets enableSorting:false on the column', async () => {
    const config: ColumnNodeConfig = {
      columns: [{ field: 'x', header: 'X', sortable: false }],
    }
    const result = await executor.execute(config, ctx, [])
    expect(result.columns[0].enableSorting).toBe(false)
  })

  it('filterable:false sets enableColumnFilter:false on the column', async () => {
    const config: ColumnNodeConfig = {
      columns: [{ field: 'x', header: 'X', filterable: false }],
    }
    const result = await executor.execute(config, ctx, [])
    expect(result.columns[0].enableColumnFilter).toBe(false)
  })

  it('empty columns array produces empty output', async () => {
    const result = await executor.execute({ columns: [] }, ctx, [])
    expect(result.columns).toHaveLength(0)
    expect(result.visibility).toEqual({})
  })

  it('multiple columns produce correct length', async () => {
    const config: ColumnNodeConfig = {
      columns: [
        { field: 'a', header: 'A' },
        { field: 'b', header: 'B' },
        { field: 'c', header: 'C', hidden: true },
      ],
    }
    const result = await executor.execute(config, ctx, [])
    expect(result.columns).toHaveLength(3)
    expect(result.visibility).toEqual({ c: false })
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/column-node.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement ColumnNodeExecutor**

```ts
// src/components/data-grid/table-engine/nodes/column-node.ts
import { booleanColumn }    from '@/components/data-grid/columns/boolean-column'
import { codeColumn }       from '@/components/data-grid/columns/code-column'
import { dateColumn }       from '@/components/data-grid/columns/date-column'
import { multiValueColumn } from '@/components/data-grid/columns/multi-value-column'
import { numberColumn }     from '@/components/data-grid/columns/number-column'
import { selectColumn }     from '@/components/data-grid/columns/select-column'
import { stringColumn }     from '@/components/data-grid/columns/string-column'
import type { GridColumnDef } from '@/components/data-grid/types/column-types'
import type { INodeExecutor } from '../core/node-registry'
import type { NodeContext } from '../core/node-context'
import type { DAGNode } from '../types/dag.types'
import type {
  ColumnDef,
  ColumnNodeConfig,
  ColumnNodeOutput,
  DepthRule,
  GridRow,
} from '../types/table.types'
import { evaluateDepthRule } from '../jsonata-evaluator'

// ── Factory registry (same types as old column-builder.ts) ────────────────────

type FactoryOpts = {
  accessorKey: string
  header: string
  editable?: boolean
  meta?: Record<string, unknown>
  [k: string]: unknown
}

type ColFactory = (opts: FactoryOpts) => GridColumnDef

const FACTORIES: Record<string, ColFactory> = {
  string:        stringColumn as ColFactory,
  number:        numberColumn as ColFactory,
  date:          dateColumn   as ColFactory,
  'multi-value': multiValueColumn as ColFactory,
  select:        selectColumn as ColFactory,
  boolean:       booleanColumn as ColFactory,
  code:          codeColumn   as ColFactory,
}

function getFactory(type: string | undefined): ColFactory {
  return FACTORIES[type ?? 'string'] ?? FACTORIES['string']
}

function buildEditableFn(rules: DepthRule[]) {
  return (_row: GridRow, depth: number) =>
    rules.some(rule => evaluateDepthRule(rule, depth))
}

// ── Executor ──────────────────────────────────────────────────────────────────

export class ColumnNodeExecutor implements INodeExecutor<'column'> {
  async execute(
    config: ColumnNodeConfig,
    _context: NodeContext,
    _allNodes: DAGNode[]
  ): Promise<ColumnNodeOutput> {
    const visibility: Record<string, boolean> = {}
    const columns: GridColumnDef<GridRow>[] = []

    for (const def of config.columns) {
      // Track hidden columns for initial visibility state
      if (def.hidden === true) {
        visibility[def.field] = false
      }

      // Resolve editability
      const isEditable = typeof def.editable === 'boolean' ? def.editable : false
      const editableFnMeta =
        Array.isArray(def.depthRules) && def.depthRules.length > 0
          ? { editableFn: buildEditableFn(def.depthRules) }
          : {}

      const meta: Record<string, unknown> = {
        editable: isEditable,
        ...editableFnMeta,
        ...(def.pinned ? { pinned: def.pinned } : {}),
        ...(def.selectOptions ? { options: def.selectOptions } : {}),
      }

      const factory = getFactory(def.type)
      let col = factory({
        accessorKey: def.field,
        header: def.header,
        editable: isEditable,
        meta,
        ...(def.width !== undefined ? { width: def.width } : {}),
        ...(def.selectOptions ? { options: def.selectOptions } : {}),
      }) as GridColumnDef<GridRow>

      // Apply per-column feature overrides
      if (def.sortable === false)   col = { ...col, enableSorting: false }
      if (def.filterable === false)  col = { ...col, enableColumnFilter: false }

      columns.push(col)
    }

    return { columns, visibility }
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/column-node.test.ts
```

Expected: PASS — 8 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/nodes/column-node.ts \
        src/components/data-grid/table-engine/__tests__/column-node.test.ts
git commit -m "feat(table-engine): add ColumnNodeExecutor — absorbs column-builder factory registry"
```

---

## Task 4: RowExpandNode

**Files:**
- Create: `src/components/data-grid/table-engine/nodes/row-expand-node.ts`
- Create: `src/components/data-grid/table-engine/__tests__/row-expand-node.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/components/data-grid/table-engine/__tests__/row-expand-node.test.ts
import { describe, it, expect, vi } from 'vitest'
import { RowExpandNodeExecutor } from '../nodes/row-expand-node'
import { NodeRegistry } from '../core/node-registry'
import { AuthAdapterRegistry } from '../core/auth-registry'
import { ApiNodeExecutor } from '../nodes/api-node'
import { NodeContext } from '../core/node-context'
import { DAGExecutionError } from '../core/dag-validator'
import type { RowExpandNodeConfig, GridRow } from '../types/table.types'
import type { DAGNode } from '../types/dag.types'

const childRows: GridRow[] = [{ id: 'c1' }, { id: 'c2' }]

function makeSetup() {
  const auth = new AuthAdapterRegistry()
  auth.register('test', {
    name: 'test',
    request: vi.fn().mockResolvedValue({
      data: childRows, status: 200, statusText: 'OK', headers: {}, time: 0, size: 0,
    }),
  })
  const nodeReg = new NodeRegistry()
  nodeReg.register('api', new ApiNodeExecutor(auth))
  return { nodeReg }
}

const lazyNode: DAGNode = {
  id: 'child-api',
  type: 'api',
  config: { url: '/children', method: 'GET', authAdapterId: 'test' },
}

const config: RowExpandNodeConfig = {
  triggerOnExpand: true,
  childApiNodeId: 'child-api',
  childKeyExpr: '$:$row.id',
  childQueryParam: 'parentId',
}

describe('RowExpandNodeExecutor', () => {
  it('returns an object with an expandHandler function', async () => {
    const { nodeReg } = makeSetup()
    const executor = new RowExpandNodeExecutor(nodeReg)
    const result = await executor.execute(config, new NodeContext(), [lazyNode])
    expect(typeof result.expandHandler).toBe('function')
  })

  it('expandHandler calls the child ApiNode and returns its rows', async () => {
    const { nodeReg } = makeSetup()
    const executor = new RowExpandNodeExecutor(nodeReg)
    const result = await executor.execute(config, new NodeContext(), [lazyNode])
    const rows = await result.expandHandler({ id: 'parent1' })
    expect(rows).toEqual(childRows)
  })

  it('expandHandler injects childKeyExpr value as childQueryParam into context', async () => {
    const auth = new AuthAdapterRegistry()
    const mockRequest = vi.fn().mockResolvedValue({
      data: [], status: 200, statusText: 'OK', headers: {}, time: 0, size: 0,
    })
    auth.register('test', { name: 'test', request: mockRequest })
    const nodeReg = new NodeRegistry()
    nodeReg.register('api', new ApiNodeExecutor(auth))

    const executor = new RowExpandNodeExecutor(nodeReg)
    const result = await executor.execute(config, new NodeContext(), [lazyNode])
    await result.expandHandler({ id: 'PARENT_ID_XYZ' })

    // The queryParam 'parentId' should equal the row's id
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ queryParams: expect.objectContaining({ parentId: 'PARENT_ID_XYZ' }) })
    )
  })

  it('expandHandler throws DAGExecutionError when childApiNodeId not in allNodes', async () => {
    const { nodeReg } = makeSetup()
    const executor = new RowExpandNodeExecutor(nodeReg)
    const result = await executor.execute(config, new NodeContext(), []) // empty allNodes
    await expect(result.expandHandler({ id: 'p1' })).rejects.toThrow(DAGExecutionError)
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/row-expand-node.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement RowExpandNodeExecutor**

```ts
// src/components/data-grid/table-engine/nodes/row-expand-node.ts
import type { INodeExecutor } from '../core/node-registry'
import type { NodeRegistry } from '../core/node-registry'
import type { NodeContext } from '../core/node-context'
import type { DAGNode, JsonPrimitive } from '../types/dag.types'
import type { RowExpandNodeConfig, RowExpandOutput, GridRow } from '../types/table.types'
import { isJsonataExpr, extractExpr } from '../types/dag.types'
import { evaluateExpr } from '../jsonata-evaluator'
import { DAGExecutionError } from '../core/dag-validator'

export class RowExpandNodeExecutor implements INodeExecutor<'rowExpand'> {
  constructor(private readonly nodeRegistry: NodeRegistry) {}

  async execute(
    config: RowExpandNodeConfig,
    context: NodeContext,
    allNodes: DAGNode[]
  ): Promise<RowExpandOutput> {
    const expandHandler = async (row: GridRow): Promise<GridRow[]> => {
      // 1. Find the lazy child ApiNode in allNodes
      const childNode = allNodes.find(
        n => n.id === config.childApiNodeId && n.type === 'api'
      )
      if (!childNode) {
        throw new DAGExecutionError(
          `RowExpandNode: lazy node "${config.childApiNodeId}" not found in allNodes[]. ` +
            `Ensure it is declared in dag.nodes[] (it must NOT be in dag.edges[]).`,
          config.childApiNodeId,
          new Error('Lazy node not found')
        )
      }

      // 2. Clone context with the current row
      const rowCtx = context.withRow(row)

      // 3. Evaluate childKeyExpr to get the param value
      const keyExpr = isJsonataExpr(config.childKeyExpr)
        ? extractExpr(config.childKeyExpr)
        : config.childKeyExpr
      const keyValue = (await evaluateExpr<JsonPrimitive>(keyExpr, rowCtx, {})) ?? null

      // 4. Add param to context (e.g. parentId → row.id value)
      const childCtx = rowCtx.withParams({
        [config.childQueryParam]: keyValue as JsonPrimitive,
      })

      // 5. Execute child ApiNode directly (NOT recursively via DAGEngine)
      const apiExecutor = this.nodeRegistry.resolve('api')
      const result = await apiExecutor.execute(childNode.config, childCtx, allNodes)
      return result.rows
    }

    return { expandHandler }
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/row-expand-node.test.ts
```

Expected: PASS — 4 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/nodes/row-expand-node.ts \
        src/components/data-grid/table-engine/__tests__/row-expand-node.test.ts
git commit -m "feat(table-engine): add RowExpandNodeExecutor — lazy child API call with row context injection"
```

---

## Task 5: TransformNode

**Files:**
- Create: `src/components/data-grid/table-engine/nodes/transform-node.ts`
- Create: `src/components/data-grid/table-engine/__tests__/transform-node.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
// src/components/data-grid/table-engine/__tests__/transform-node.test.ts
import { describe, it, expect } from 'vitest'
import { TransformNodeExecutor } from '../nodes/transform-node'
import { NodeContext } from '../core/node-context'
import type { TransformNodeConfig, ApiNodeOutput } from '../types/table.types'

const executor = new TransformNodeExecutor()

describe('TransformNodeExecutor', () => {
  it('transforms api node rows via JSONata expression', async () => {
    const ctx = new NodeContext()
    ctx.set('src', 'api', {
      rows: [{ id: '1', price: 10, qty: 3 }],
    } as ApiNodeOutput)

    const config: TransformNodeConfig = {
      sourceNodeId: 'src',
      expression: '$.*.({"id": id, "total": price * qty})',
    }
    const result = await executor.execute(config, ctx, [])
    expect(result).toEqual([{ id: '1', total: 30 }])
  })

  it('wraps a single-object result in an array', async () => {
    const ctx = new NodeContext()
    ctx.set('src', 'api', { rows: [{ id: '1', name: 'x' }] })

    const config: TransformNodeConfig = {
      sourceNodeId: 'src',
      expression: '$[0]',
    }
    const result = await executor.execute(config, ctx, [])
    expect(Array.isArray(result)).toBe(true)
    expect(result[0]).toMatchObject({ id: '1' })
  })

  it('returns empty array when expression produces undefined', async () => {
    const ctx = new NodeContext()
    ctx.set('src', 'api', { rows: [] })

    const config: TransformNodeConfig = {
      sourceNodeId: 'src',
      expression: 'nonexistentField',
    }
    const result = await executor.execute(config, ctx, [])
    expect(result).toEqual([])
  })

  it('returns empty array when source node is not in context', async () => {
    const ctx = new NodeContext()
    const config: TransformNodeConfig = {
      sourceNodeId: 'missing',
      expression: '$',
    }
    const result = await executor.execute(config, ctx, [])
    expect(result).toEqual([])
  })

  it('can read from a merge node source', async () => {
    const ctx = new NodeContext()
    ctx.set('merged', 'merge', [{ id: '1', x: 1 }, { id: '2', x: 2 }])

    const config: TransformNodeConfig = {
      sourceNodeId: 'merged',
      expression: '$[x > 1]',
    }
    const result = await executor.execute(config, ctx, [])
    expect(result).toEqual([{ id: '2', x: 2 }])
  })
})
```

- [ ] **Step 2: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/transform-node.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement TransformNodeExecutor**

```ts
// src/components/data-grid/table-engine/nodes/transform-node.ts
import type { INodeExecutor } from '../core/node-registry'
import type { NodeContext } from '../core/node-context'
import type { DAGNode } from '../types/dag.types'
import type { TransformNodeConfig, GridRow } from '../types/table.types'
import { evaluateExpr } from '../jsonata-evaluator'

export class TransformNodeExecutor implements INodeExecutor<'transform'> {
  async execute(
    config: TransformNodeConfig,
    context: NodeContext,
    _allNodes: DAGNode[]
  ): Promise<GridRow[]> {
    // Return empty rows when source is not yet available (graceful for optional sources)
    if (!context.has(config.sourceNodeId)) return []

    const entry = context.getAll().get(config.sourceNodeId)

    let sourceRows: GridRow[]
    if (entry?.type === 'api') {
      sourceRows = context.get(config.sourceNodeId, 'api').rows
    } else if (entry?.type === 'merge') {
      sourceRows = context.get(config.sourceNodeId, 'merge')
    } else if (entry?.type === 'transform') {
      sourceRows = context.get(config.sourceNodeId, 'transform')
    } else {
      sourceRows = []
    }

    const result = await evaluateExpr<GridRow | GridRow[]>(
      config.expression,
      context,
      sourceRows
    )

    if (result === undefined) return []
    return Array.isArray(result) ? result : [result]
  }
}
```

- [ ] **Step 4: Run test — verify it passes**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/transform-node.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/nodes/transform-node.ts \
        src/components/data-grid/table-engine/__tests__/transform-node.test.ts
git commit -m "feat(table-engine): add TransformNodeExecutor — JSONata transform on api/merge source rows"
```

---

## Task 6: Bootstrap (partial) + useDAGTable Hook

**Files:**
- Create: `src/components/data-grid/table-engine/bootstrap.ts`
- Create: `src/components/data-grid/table-engine/hooks/use-dag-table.ts`
- Create: `src/components/data-grid/table-engine/__tests__/use-dag-table.test.ts`

- [ ] **Step 1: Create partial bootstrap.ts** (extended in Phase 3 to add MergeNode + ActionNode)

```ts
// src/components/data-grid/table-engine/bootstrap.ts
import { DAGEngine } from './core/dag-engine'
import { NodeRegistry } from './core/node-registry'
import { AuthAdapterRegistry } from './core/auth-registry'
import { ApiNodeExecutor } from './nodes/api-node'
import { ColumnNodeExecutor } from './nodes/column-node'
import { RowExpandNodeExecutor } from './nodes/row-expand-node'
import { TransformNodeExecutor } from './nodes/transform-node'
import { WAFDataAuthAdapter } from './adapters/wafdata-auth-adapter'
import { BearerAuthAdapter } from './adapters/bearer-auth-adapter'
import { NoAuthAdapter } from './adapters/no-auth-adapter'

export function createDefaultEngine(bearerToken?: string): DAGEngine {
  const auth = new AuthAdapterRegistry()
    .register('wafdata', new WAFDataAuthAdapter())
    .register('bearer',  new BearerAuthAdapter(bearerToken ?? ''))
    .register('none',    new NoAuthAdapter())

  // nodeReg declared before registering RowExpandNode so the reference is valid
  const nodeReg = new NodeRegistry()
    .register('api',       new ApiNodeExecutor(auth))
    .register('transform', new TransformNodeExecutor())
    .register('column',    new ColumnNodeExecutor())
    .register('rowExpand', new RowExpandNodeExecutor(nodeReg))

  return new DAGEngine(nodeReg, auth)
}
```

- [ ] **Step 2: Write failing tests for useDAGTable**

```ts
// src/components/data-grid/table-engine/__tests__/use-dag-table.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useDAGTable } from '../hooks/use-dag-table'
import { createDefaultEngine } from '../bootstrap'
import type { DAGTableConfig } from '../types/table.types'

vi.mock('@/services', () => ({
  httpClient: {
    execute: vi.fn(),
  },
}))

import { httpClient } from '@/services'
const mockExecute = vi.mocked(httpClient.execute)

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children)
}

const twoRowResponse = {
  data: [{ id: '1', name: 'Alice' }, { id: '2', name: 'Bob' }],
  status: 200, statusText: 'OK', headers: {}, time: 0, size: 0,
}

const flatConfig: DAGTableConfig = {
  tableId: 'test-flat',
  mode: 'flat',
  dag: {
    nodes: [
      {
        id: 'api1',
        type: 'api',
        config: { url: '/items', method: 'GET', authAdapterId: 'wafdata' },
      },
      {
        id: 'cols',
        type: 'column',
        config: {
          columns: [
            { field: 'name', header: 'Name' },
          ],
        },
      },
    ],
    edges: [{ from: 'api1', to: 'cols' }],
    rootNodeId: 'cols',
  },
}

describe('useDAGTable — flat mode', () => {
  beforeEach(() => {
    mockExecute.mockReset()
    mockExecute.mockResolvedValue(twoRowResponse)
  })

  it('starts in loading state and resolves to data', async () => {
    const engine = createDefaultEngine()
    const { result } = renderHook(
      () => useDAGTable(flatConfig, engine),
      { wrapper: makeWrapper() }
    )

    expect(result.current.isLoading).toBe(true)
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.data).toHaveLength(2)
  })

  it('error is null on successful fetch', async () => {
    const engine = createDefaultEngine()
    const { result } = renderHook(
      () => useDAGTable(flatConfig, engine),
      { wrapper: makeWrapper() }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBeNull()
  })

  it('columns are returned from ColumnNode output', async () => {
    const engine = createDefaultEngine()
    const { result } = renderHook(
      () => useDAGTable(flatConfig, engine),
      { wrapper: makeWrapper() }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.columns).toHaveLength(1)
  })

  it('isFetchingNextPage is false in flat mode', async () => {
    const engine = createDefaultEngine()
    const { result } = renderHook(
      () => useDAGTable(flatConfig, engine),
      { wrapper: makeWrapper() }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isFetchingNextPage).toBe(false)
  })
})

describe('useDAGTable — tree mode', () => {
  beforeEach(() => {
    mockExecute.mockReset()
    mockExecute.mockResolvedValue(twoRowResponse)
  })

  it('exposes onExpand when a rowExpand node is present', async () => {
    const treeConfig: DAGTableConfig = {
      tableId: 'test-tree',
      mode: 'tree',
      dag: {
        nodes: [
          {
            id: 'root-api',
            type: 'api',
            config: { url: '/root', method: 'GET', authAdapterId: 'wafdata' },
          },
          {
            id: 'expand',
            type: 'rowExpand',
            config: {
              triggerOnExpand: true,
              childApiNodeId: 'child-api',
              childKeyExpr: '$:$row.id',
              childQueryParam: 'parentId',
            },
          },
          {
            id: 'cols',
            type: 'column',
            config: { columns: [{ field: 'name', header: 'Name' }] },
          },
          // Lazy node — not in edges
          {
            id: 'child-api',
            type: 'api',
            config: { url: '/children', method: 'GET', authAdapterId: 'wafdata' },
          },
        ],
        edges: [
          { from: 'root-api', to: 'expand' },
          { from: 'expand',   to: 'cols' },
        ],
        rootNodeId: 'cols',
      },
    }

    const engine = createDefaultEngine()
    const { result } = renderHook(
      () => useDAGTable(treeConfig, engine),
      { wrapper: makeWrapper() }
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(typeof result.current.onExpand).toBe('function')
  })
})
```

- [ ] **Step 3: Run test — verify it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/use-dag-table.test.ts
```

Expected: FAIL — hook not found.

- [ ] **Step 4: Implement useDAGTable**

```ts
// src/components/data-grid/table-engine/hooks/use-dag-table.ts
import { useMemo, useRef, useState, useCallback } from 'react'
import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import type { DAGEngine } from '../core/dag-engine'
import { NodeContext } from '../core/node-context'
import type {
  DAGTableConfig,
  DAGTableResult,
  GridRow,
  ColumnNodeOutput,
} from '../types/table.types'
import type {
  DAGExecutionError,
  DAGValidationError,
} from '../core/dag-validator'
import type { JsonPrimitive } from '../types/dag.types'

/**
 * Primary React hook for the DAG table engine.
 *
 * Strategy per mode:
 *  flat/tree  — useQuery; single engine.execute(); returns all rows
 *  paginated  — useQuery with pageIndex state; re-executes on page change
 *  infinite   — useInfiniteQuery; paginationConfig.nextPage drives cursor
 */
export function useDAGTable(config: DAGTableConfig, engine: DAGEngine): DAGTableResult {
  const { tableId, mode, dag } = config
  const [pageIndex, setPageIndex] = useState(0)
  const pageSize = 50

  // Store the last NodeContext so onAction can access action output and row data
  const ctxRef = useRef<NodeContext | null>(null)

  // ── Flat / Paginated / Tree ──────────────────────────────────────────────
  const flatQuery = useQuery({
    queryKey: [tableId, mode, pageIndex],
    queryFn: async () => {
      const initialParams: Record<string, JsonPrimitive> = mode === 'paginated'
        ? { pageIndex: String(pageIndex), pageSize: String(pageSize) }
        : {}
      const ctx = new NodeContext().withParams(initialParams)

      // Execute engine and capture full context
      await engine.execute(dag, 'column', ctx)
      ctxRef.current = ctx

      // Extract rows from first api-type node that appears in edges
      const edgeNodeIds = new Set(dag.edges.flatMap(e => [e.from, e.to]))
      const apiNode = dag.nodes.find(
        n => n.type === 'api' && edgeNodeIds.has(n.id)
      )
      const rows: GridRow[] = apiNode && ctx.has(apiNode.id)
        ? ctx.get(apiNode.id, 'api').rows
        : []

      const colOutput: ColumnNodeOutput = ctx.has(dag.rootNodeId)
        ? ctx.get(dag.rootNodeId, 'column')
        : { columns: [], visibility: {} }

      // Store context for expand handler
      return { rows, colOutput, ctx }
    },
    enabled: mode === 'flat' || mode === 'paginated' || mode === 'tree',
    staleTime: 0,
  })

  // ── Infinite ─────────────────────────────────────────────────────────────
  const infiniteQuery = useInfiniteQuery({
    queryKey: [tableId, 'infinite'],
    queryFn: async ({ pageParam }: { pageParam: string | null }) => {
      const ctx = new NodeContext().withParams(
        pageParam ? { cursor: pageParam } : {}
      )
      await engine.execute(dag, 'column', ctx)

      const edgeNodeIds = new Set(dag.edges.flatMap(e => [e.from, e.to]))
      const apiNode = dag.nodes.find(n => n.type === 'api' && edgeNodeIds.has(n.id))
      const rows: GridRow[] = apiNode && ctx.has(apiNode.id)
        ? ctx.get(apiNode.id, 'api').rows
        : []
      const apiOutput = apiNode && ctx.has(apiNode.id)
        ? ctx.get(apiNode.id, 'api')
        : undefined
      const colOutput: ColumnNodeOutput = ctx.has(dag.rootNodeId)
        ? ctx.get(dag.rootNodeId, 'column')
        : { columns: [], visibility: {} }

      return { rows, nextPage: apiOutput?.nextPage ?? null, colOutput }
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage: { nextPage: string | null }) => lastPage.nextPage ?? null,
    enabled: mode === 'infinite',
  })

  // ── Derive final values ───────────────────────────────────────────────────

  const isLoading = mode === 'infinite'
    ? infiniteQuery.isLoading
    : flatQuery.isLoading

  const isFetchingNextPage = mode === 'infinite'
    ? infiniteQuery.isFetchingNextPage
    : false

  const error = (mode === 'infinite'
    ? infiniteQuery.error
    : flatQuery.error) as DAGExecutionError | DAGValidationError | null

  const finalRows: GridRow[] = useMemo(() => {
    if (mode === 'infinite') {
      return infiniteQuery.data?.pages.flatMap(p => p.rows) ?? []
    }
    return flatQuery.data?.rows ?? []
  }, [mode, flatQuery.data, infiniteQuery.data])

  const finalColOutput: ColumnNodeOutput = useMemo(() => {
    if (mode === 'infinite') {
      return infiniteQuery.data?.pages[0]?.colOutput ?? { columns: [], visibility: {} }
    }
    return flatQuery.data?.colOutput ?? { columns: [], visibility: {} }
  }, [mode, flatQuery.data, infiniteQuery.data])

  // ── RowExpand handler ─────────────────────────────────────────────────────

  const rowExpandNodeId = dag.nodes.find(n => n.type === 'rowExpand')?.id

  const onExpand = useMemo<DAGTableResult['onExpand']>(() => {
    if (!rowExpandNodeId || mode !== 'tree') return undefined
    const storedCtx = flatQuery.data?.ctx
    if (!storedCtx) return undefined
    if (!storedCtx.has(rowExpandNodeId)) return undefined

    const expandOutput = storedCtx.get(rowExpandNodeId, 'rowExpand')
    return expandOutput.expandHandler
  }, [rowExpandNodeId, mode, flatQuery.data])

  // ── Pagination ────────────────────────────────────────────────────────────

  const pagination = mode === 'paginated' ? {
    pageIndex,
    pageCount: Math.max(1, Math.ceil((finalRows.length || pageSize) / pageSize)),
    onPageChange: setPageIndex,
    pageSize,
  } : undefined

  return {
    data: finalRows,
    columns: finalColOutput.columns,
    columnVisibility: finalColOutput.visibility,
    isLoading,
    isFetchingNextPage,
    error,
    pagination,
    hasNextPage:    mode === 'infinite' ? infiniteQuery.hasNextPage  : undefined,
    fetchNextPage:  mode === 'infinite' ? infiniteQuery.fetchNextPage : undefined,
    onExpand,
  }
}
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/use-dag-table.test.ts
```

Expected: PASS — 5 tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/data-grid/table-engine/bootstrap.ts \
        src/components/data-grid/table-engine/hooks/use-dag-table.ts \
        src/components/data-grid/table-engine/__tests__/use-dag-table.test.ts
git commit -m "feat(table-engine): add useDAGTable hook (all modes) + partial bootstrap"
```

---

## Task 6: Delete Legacy Files + Update data-grid Barrel

**Files:**
- Delete: `src/components/data-grid/table-engine/api-executor.ts`
- Delete: `src/components/data-grid/table-engine/dag-resolver.ts`
- Delete: `src/components/data-grid/table-engine/use-table-engine.ts`
- Delete: `src/components/data-grid/table-engine/config-validator.ts`
- Delete: `src/components/data-grid/table-engine/column-builder.ts`
- Delete: `src/components/data-grid/table-engine/types.ts`
- Modify: `src/components/data-grid/index.ts`

> Phase 2 replaced `jsonata-evaluator.ts` with a new API (removing `evaluateSourceExpr` and `evaluateRowExpr`). The legacy files that imported those removed exports are now dead code. Delete them now rather than let the broken imports linger until Phase 3.

- [ ] **Step 1: Check for remaining consumers outside the table-engine folder**

```bash
grep -r \
  "api-executor\|dag-resolver\|use-table-engine\|config-validator\|column-builder\|from.*table-engine/types" \
  src/ \
  --include="*.ts" --include="*.tsx" \
  --exclude-dir="table-engine" \
  -l
```

Expected: Only `src/components/data-grid/index.ts` should appear.

- [ ] **Step 2: Delete the legacy files**

```bash
rm \
  "src/components/data-grid/table-engine/api-executor.ts" \
  "src/components/data-grid/table-engine/dag-resolver.ts" \
  "src/components/data-grid/table-engine/use-table-engine.ts" \
  "src/components/data-grid/table-engine/config-validator.ts" \
  "src/components/data-grid/table-engine/column-builder.ts" \
  "src/components/data-grid/table-engine/types.ts"
```

- [ ] **Step 3: Update `src/components/data-grid/index.ts`**

Remove the three broken table-engine exports (lines importing from `./table-engine/configured-table`, `./table-engine/types`, `./table-engine/use-table-engine`) and replace with a single re-export from the new table-engine barrel:

The file should end with:
```ts
// Export table engine (DAG-based)
export * from './table-engine'
```

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No errors related to deleted files.

- [ ] **Step 5: Run all table-engine tests**

```bash
npx vitest run src/components/data-grid/table-engine/
```

Expected: All tests pass.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore(table-engine): delete legacy api-executor, dag-resolver, use-table-engine, config-validator, column-builder, types — replaced by DAG engine"
```

---

## Phase 2 Complete — Verification

- [ ] **Run all Phase 2 tests**

```bash
npx vitest run src/components/data-grid/table-engine/
```

Expected: All tests pass (Phase 1 + Phase 2 combined).

- [ ] **TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "table-engine" | head -20
```

Expected: No errors in new files.

- [ ] **Biome check**

```bash
npm run check
```

Expected: No lint/format errors.

- [ ] **Smoke test: verify legacy files are deleted**

The old `use-table-engine.ts`, `column-builder.ts`, etc. were deleted in Task 6.
Confirm no remaining imports reference them:

```bash
grep -r "from.*use-table-engine\|from.*column-builder\|from.*api-executor\|from.*dag-resolver\|from.*config-validator" src/components/data-grid/table-engine/nodes src/components/data-grid/table-engine/core src/components/data-grid/table-engine/hooks src/components/data-grid/table-engine/adapters
```

Expected: No output.
