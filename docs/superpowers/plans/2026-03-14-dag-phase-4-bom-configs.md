# DAG Table Engine — Phase 4: 3DX BOM Configs

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create eBOM and mBOM `DAGTableConfig` objects under `src/features/xen/configs/` and wire them into the Xen component with a tabbed UI. These are pure config files — zero engine changes required.

**Prerequisite:** Phase 3 (`2026-03-14-dag-phase-3-merge-actions.md`) must be complete.

**Architecture:** Each BOM config is a typed `DAGTableConfig` object. Initial-wave nodes (root API + expand + columns) are connected via `edges`. Lazy nodes (child API + action APIs) are declared in `nodes[]` only and executed on demand. The Xen component renders both configs using `<ConfiguredTable />`.

**Tech Stack:** TypeScript 5, React 19, Biome

**Spec:** `docs/superpowers/specs/2026-03-14-dag-table-engine-design.md`

**Previous phase:** `docs/superpowers/plans/2026-03-14-dag-phase-3-merge-actions.md`

---

## File Map

| File | Action |
|------|--------|
| `src/features/xen/configs/ebom.config.ts` | Create |
| `src/features/xen/configs/mbom.config.ts` | Create |
| `src/features/xen/components/xen.tsx` | Replace |

---

## Task 1: eBOM Config

**Files:**
- Create: `src/features/xen/configs/ebom.config.ts`

> No separate test file — the config is validated at runtime by `validateDAG()` inside the engine on first render. TypeScript type-checking is the primary guard here.

- [ ] **Step 1: Create the `configs/` directory and `ebom.config.ts`**

```ts
// src/features/xen/configs/ebom.config.ts
import type { DAGTableConfig } from '@/components/data-grid/table-engine'

/**
 * Engineering BOM (eBOM) table config.
 *
 * DAG structure:
 *   Initial wave (edges):
 *     root-api → row-expand → columns
 *     root-api → actions    → columns
 *
 *   Lazy nodes (nodes[] only, NOT in edges):
 *     child-api   — executed by RowExpandNode on tree node expand
 *     promote-api — executed by useDAGTable.onAction when user clicks Promote
 */
export const ebomConfig: DAGTableConfig = {
  tableId: 'ebom',
  mode: 'tree',

  dag: {
    nodes: [
      // ─── Initial-wave nodes ──────────────────────────────────────────────

      {
        id: 'root-api',
        type: 'api',
        config: {
          // $params.rootId is injected by the caller via NodeContext.withParams()
          url: '$:"/resources/v1/engineeringItem/" & $params.rootId & "/children"',
          method: 'GET',
          queryParams: {
            '$mask': 'dskern:Mask.Default',
          },
          authAdapterId: 'wafdata',
          responseTransform: `
            member.{
              "id":          id,
              "title":       dataelements.title,
              "revision":    dataelements.revision,
              "maturity":    dataelements.state,
              "hasChildren": (usage > 0)
            }
          `,
        },
      },

      {
        id: 'row-expand',
        type: 'rowExpand',
        config: {
          triggerOnExpand: true,
          childApiNodeId:  'child-api',    // lazy — NOT in edges
          childKeyExpr:    '$:$row.id',
          childQueryParam: 'parentId',
          maxDepth: 10,
        },
      },

      {
        id: 'actions',
        type: 'action',
        config: {
          rowActions: [
            {
              id:             'promote',
              label:          'Promote',
              icon:           'ArrowUp',
              apiNodeId:      'promote-api',  // lazy — NOT in edges
              confirmMessage: 'Promote this item to the next lifecycle state?',
            },
          ],
        },
      },

      {
        id: 'columns',
        type: 'column',
        config: {
          actionNodeId: 'actions',
          columns: [
            {
              field:     'title',
              header:    'Title',
              sortable:  true,
              filterable: true,
            },
            {
              field:  'revision',
              header: 'Rev',
            },
            {
              field:      'maturity',
              header:     'State',
              renderType: 'badge',
            },
          ],
        },
      },

      // ─── Lazy nodes (in nodes[] but NOT in edges) ────────────────────────

      {
        id: 'child-api',
        type: 'api',
        config: {
          // $params.parentId is injected by RowExpandNodeExecutor
          url: '$:"/resources/v1/engineeringItem/" & $params.parentId & "/children"',
          method: 'GET',
          authAdapterId: 'wafdata',
          responseTransform: `
            member.{
              "id":          id,
              "title":       dataelements.title,
              "revision":    dataelements.revision,
              "maturity":    dataelements.state,
              "hasChildren": (usage > 0)
            }
          `,
        },
      },

      {
        id: 'promote-api',
        type: 'api',
        config: {
          // $row.id is the engineering item id, injected by useDAGTable.onAction
          url:    '$:"/resources/v1/lifecycle/" & $row.id & "/promote"',
          method: 'PUT',
          authAdapterId: 'wafdata',
          body: {
            comment: 'Promoted via BOM table',
          },
        },
      },
    ],

    edges: [
      { from: 'root-api',   to: 'row-expand' },
      { from: 'root-api',   to: 'actions' },
      { from: 'row-expand', to: 'columns' },
      { from: 'actions',    to: 'columns' },
    ],

    rootNodeId: 'columns',
  },

  features: {
    sorting:        { enabled: true },
    filtering:      { enabled: true },
    columnResizing: { enabled: true },
    columnVisibility: { enabled: true },
  },
}
```

- [ ] **Step 2: Verify TypeScript — config is type-safe**

```bash
npx tsc --noEmit 2>&1 | grep "ebom.config" | head -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/xen/configs/ebom.config.ts
git commit -m "feat(xen): add eBOM DAGTableConfig — tree mode, row expand, promote action"
```

---

## Task 2: mBOM Config

**Files:**
- Create: `src/features/xen/configs/mbom.config.ts`

- [ ] **Step 1: Create `mbom.config.ts`**

```ts
// src/features/xen/configs/mbom.config.ts
import type { DAGTableConfig } from '@/components/data-grid/table-engine'

/**
 * Manufacturing BOM (mBOM) table config.
 *
 * DAG structure:
 *   Initial wave (edges):
 *     root-api → row-expand → columns
 *
 *   Lazy nodes (nodes[] only):
 *     child-api — executed by RowExpandNode on tree node expand
 */
export const mbomConfig: DAGTableConfig = {
  tableId: 'mbom',
  mode: 'tree',

  dag: {
    nodes: [
      // ─── Initial-wave nodes ──────────────────────────────────────────────

      {
        id: 'root-api',
        type: 'api',
        config: {
          url: '$:"/resources/v1/manufacturingItem/" & $params.rootId & "/children"',
          method: 'GET',
          queryParams: {
            '$mask': 'dskern:Mask.Default',
          },
          authAdapterId: 'wafdata',
          responseTransform: `
            member.{
              "id":          id,
              "title":       dataelements.title,
              "quantity":    dataelements.quantity,
              "unit":        dataelements.unit,
              "maturity":    dataelements.state,
              "hasChildren": (usage > 0)
            }
          `,
        },
      },

      {
        id: 'row-expand',
        type: 'rowExpand',
        config: {
          triggerOnExpand: true,
          childApiNodeId:  'child-api',
          childKeyExpr:    '$:$row.id',
          childQueryParam: 'parentId',
          maxDepth: 10,
        },
      },

      {
        id: 'columns',
        type: 'column',
        config: {
          columns: [
            {
              field:     'title',
              header:    'Title',
              sortable:  true,
              filterable: true,
            },
            {
              field:  'quantity',
              header: 'Quantity',
              type:   'number',
            },
            {
              field:  'unit',
              header: 'Unit',
            },
            {
              field:      'maturity',
              header:     'State',
              renderType: 'badge',
            },
          ],
        },
      },

      // ─── Lazy nodes ───────────────────────────────────────────────────────

      {
        id: 'child-api',
        type: 'api',
        config: {
          url: '$:"/resources/v1/manufacturingItem/" & $params.parentId & "/children"',
          method: 'GET',
          authAdapterId: 'wafdata',
          responseTransform: `
            member.{
              "id":          id,
              "title":       dataelements.title,
              "quantity":    dataelements.quantity,
              "unit":        dataelements.unit,
              "maturity":    dataelements.state,
              "hasChildren": (usage > 0)
            }
          `,
        },
      },
    ],

    edges: [
      { from: 'root-api',   to: 'row-expand' },
      { from: 'row-expand', to: 'columns' },
    ],

    rootNodeId: 'columns',
  },

  features: {
    sorting:        { enabled: true },
    filtering:      { enabled: true },
    columnResizing: { enabled: true },
    columnVisibility: { enabled: true },
  },
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep "mbom.config" | head -10
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/features/xen/configs/mbom.config.ts
git commit -m "feat(xen): add mBOM DAGTableConfig — tree mode with row expand"
```

---

## Task 3: Xen Component

**Files:**
- Replace: `src/features/xen/components/xen.tsx`

- [ ] **Step 1: Replace `xen.tsx` with tabbed eBOM + mBOM**

```tsx
// src/features/xen/components/xen.tsx
import { ConfiguredTable } from '@/components/data-grid/table-engine'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ebomConfig } from '../configs/ebom.config'
import { mbomConfig } from '../configs/mbom.config'

/**
 * Xen feature root component.
 *
 * Renders eBOM and mBOM tables as tabs. Each table is driven entirely by its
 * DAGTableConfig — no table logic lives in this component.
 *
 * To pass a rootId at runtime (e.g. from widget context or a route param),
 * extend the config with `dag.nodes[0].config.url` evaluated against a
 * NodeContext pre-seeded via withParams({ rootId: '...' }).
 */
export function Xen() {
  return (
    <div className="flex h-full flex-col overflow-hidden">
      <Tabs defaultValue="ebom" className="flex h-full flex-col">
        <div className="border-b px-4">
          <TabsList className="mt-3 mb-0 h-9">
            <TabsTrigger value="ebom" className="text-sm">
              eBOM
            </TabsTrigger>
            <TabsTrigger value="mbom" className="text-sm">
              mBOM
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="ebom" className="mt-0 flex-1 overflow-hidden">
          <ConfiguredTable config={ebomConfig} className="h-full" />
        </TabsContent>

        <TabsContent value="mbom" className="mt-0 flex-1 overflow-hidden">
          <ConfiguredTable config={mbomConfig} className="h-full" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit 2>&1 | grep -E "(xen\.tsx|ebom|mbom)" | head -15
```

Expected: No errors.

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: Build passes.

- [ ] **Step 4: Run Biome**

```bash
npm run check
```

Expected: No lint/format errors.

- [ ] **Step 5: Commit**

```bash
git add src/features/xen/
git commit -m "feat(xen): add Xen component with eBOM/mBOM tabs using ConfiguredTable"
```

---

## Phase 4 Complete — Full System Verification

- [ ] **Run all table-engine tests**

```bash
npx vitest run src/components/data-grid/table-engine/
```

Expected: All tests pass.

- [ ] **Run full project build**

```bash
npm run build
```

Expected: Build succeeds with no errors.

- [ ] **Run Biome lint/format check**

```bash
npm run check
```

Expected: No errors.

- [ ] **Verify legacy files are gone**

```bash
ls src/components/data-grid/table-engine/*.ts 2>/dev/null
```

Expected: Only `jsonata-evaluator.ts`, `bootstrap.ts`, `index.ts` remain at the root level. No `api-executor.ts`, `dag-resolver.ts`, `use-table-engine.ts`, `config-validator.ts`, `column-builder.ts`, `types.ts`.

- [ ] **Verify new structure**

```bash
find src/components/data-grid/table-engine -name "*.ts" -o -name "*.tsx" | sort
```

Expected structure:
```
src/components/data-grid/table-engine/__tests__/auth-adapters.test.ts
src/components/data-grid/table-engine/__tests__/dag-engine.test.ts
src/components/data-grid/table-engine/__tests__/dependency-resolver.test.ts
src/components/data-grid/table-engine/__tests__/jsonata-evaluator.test.ts
src/components/data-grid/table-engine/__tests__/node-context.test.ts
src/components/data-grid/table-engine/__tests__/registries.test.ts
src/components/data-grid/table-engine/__tests__/api-node.test.ts
src/components/data-grid/table-engine/__tests__/column-node.test.ts
src/components/data-grid/table-engine/__tests__/row-expand-node.test.ts
src/components/data-grid/table-engine/__tests__/transform-node.test.ts
src/components/data-grid/table-engine/__tests__/merge-node.test.ts
src/components/data-grid/table-engine/__tests__/action-node.test.ts
src/components/data-grid/table-engine/__tests__/use-dag-table.test.ts
src/components/data-grid/table-engine/adapters/bearer-auth-adapter.ts
src/components/data-grid/table-engine/adapters/no-auth-adapter.ts
src/components/data-grid/table-engine/adapters/wafdata-auth-adapter.ts
src/components/data-grid/table-engine/bootstrap.ts
src/components/data-grid/table-engine/configured-table.tsx
src/components/data-grid/table-engine/core/auth-registry.ts
src/components/data-grid/table-engine/core/dag-engine.ts
src/components/data-grid/table-engine/core/dag-validator.ts
src/components/data-grid/table-engine/core/dependency-resolver.ts
src/components/data-grid/table-engine/core/node-context.ts
src/components/data-grid/table-engine/core/node-registry.ts
src/components/data-grid/table-engine/hooks/use-dag-table.ts
src/components/data-grid/table-engine/index.ts
src/components/data-grid/table-engine/jsonata-evaluator.ts
src/components/data-grid/table-engine/nodes/action-node.ts
src/components/data-grid/table-engine/nodes/api-node.ts
src/components/data-grid/table-engine/nodes/column-node.ts
src/components/data-grid/table-engine/nodes/merge-node.ts
src/components/data-grid/table-engine/nodes/row-expand-node.ts
src/components/data-grid/table-engine/nodes/transform-node.ts
src/components/data-grid/table-engine/types/api.types.ts
src/components/data-grid/table-engine/types/auth.types.ts
src/components/data-grid/table-engine/types/dag.types.ts
src/components/data-grid/table-engine/types/table.types.ts
src/features/xen/components/xen.tsx
src/features/xen/configs/ebom.config.ts
src/features/xen/configs/mbom.config.ts
```
