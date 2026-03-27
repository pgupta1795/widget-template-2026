# Form Engine — Phase 3: DAG Node Executors

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the four DAG node executors: `formField`, `formSection`, `detailPanel`, `headerForm`. Register them in `createDefaultEngine()`.

**Architecture:** Each executor implements `INodeExecutor<T>` — same interface as existing nodes. `formSection` and `formField` nodes are resolved by ID lookup from `allNodes` (not edges), parallel to `rowExpandNode`'s `childApiNodeId` pattern. The DAG validator is extended to allow these node types without edges. Phase 1 types and Phase 2 fields must be complete.

**Tech Stack:** TypeScript 5, jsonata (via `evaluateExpr`), existing DAG engine

**Spec:** `docs/superpowers/specs/2026-03-24-form-engine-design.md`

**Prev phase:** `docs/superpowers/plans/2026-03-24-form-engine-phase-2-fields.md`

**Next phase:** `docs/superpowers/plans/2026-03-24-form-engine-phase-4-hook-component.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/form-engine/nodes/form-field-node.ts` | Create — executor |
| `src/components/form-engine/nodes/form-section-node.ts` | Create — executor |
| `src/components/form-engine/nodes/detail-panel-node.ts` | Create — executor |
| `src/components/form-engine/nodes/header-form-node.ts` | Create — executor |
| `src/components/data-grid/table-engine/core/dag-validator.ts` | Modify — allow form content nodes without edges |
| `src/components/data-grid/table-engine/bootstrap.ts` | Modify — register 4 form node executors |
| `src/components/data-grid/table-engine/jsonata-evaluator.ts` | Modify — add `extraBindings` param |

---

## Task 1: Extend `evaluateExpr` with `extraBindings`

**File:** `src/components/data-grid/table-engine/jsonata-evaluator.ts`

- [ ] Add the optional `extraBindings` parameter (additive, non-breaking):

```ts
export async function evaluateExpr<T>(
  expression: string,
  context: NodeContext,
  inputDoc: unknown = {},
  extraBindings?: Record<string, unknown>,  // NEW
): Promise<T | undefined> {
  if (!expression.trim()) return undefined;

  try {
    const expr = jsonata(expression);
    const result = await expr.evaluate(inputDoc, {
      row: context.getRow() ?? {},
      params: context.getParams(),
      ...extraBindings,   // NEW — spread after to allow caller override
    });
    return result as T;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `JSONata expression failed: ${msg}\nExpression: ${expression}`,
    );
  }
}
```

- [ ] Run `npm run check` — zero errors (all existing call sites still work; new param is optional).

---

## Task 2: Extend `dag-validator.ts` to allow form content nodes without edges

**File:** `src/components/data-grid/table-engine/core/dag-validator.ts`

- [ ] Find the orphaned-node validation check in `dag-validator.ts`. It will look something like nodes that have no edges and are not the root. Add a set of "content node types" that are exempt:

```ts
// Content node types that are referenced by their parent node's config (not via edges)
// and are therefore intentionally absent from the edge graph.
const CONTENT_NODE_TYPES = new Set<NodeType>([
  "formSection",
  "formField",
]);
```

- [ ] In the orphan check loop, skip nodes whose type is in `CONTENT_NODE_TYPES`:

```ts
// Example — the exact check varies by validator implementation.
// Find the loop that checks for nodes with no incoming/outgoing edges and add:
if (CONTENT_NODE_TYPES.has(node.type)) continue;
```

- [ ] Run `npm run check` — zero errors.

---

## Task 3: `form-field-node.ts` executor

**File:** `src/components/form-engine/nodes/form-field-node.ts`

- [ ] Create:

```ts
// src/components/form-engine/nodes/form-field-node.ts
import type { INodeExecutor } from "@/components/data-grid/table-engine/core/node-registry";
import type { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type { DAGNode } from "@/components/data-grid/table-engine/types/dag.types";
import type { FormFieldNodeConfig, FormFieldNodeOutput } from "../types/form.types";

export class FormFieldNodeExecutor implements INodeExecutor<"formField"> {
  execute(
    config: FormFieldNodeConfig,
    context: NodeContext,
    _allNodes: DAGNode[],
  ): Promise<FormFieldNodeOutput> {
    // FormField nodes are pure config carriers — the executor just packages
    // the config alongside the node ID for use by FormSectionNodeExecutor.
    const nodeId = context.getNodeId();
    return Promise.resolve({ fieldId: nodeId, config });
  }
}
```

> **Note:** `context.getNodeId()` returns the current node's `id`. If `NodeContext` does not expose this method, add `getNodeId(): string` to `NodeContext` (returns the id passed at construction). Check `core/node-context.ts` first.

---

## Task 4: `form-section-node.ts` executor

**File:** `src/components/form-engine/nodes/form-section-node.ts`

- [ ] Create:

```ts
// src/components/form-engine/nodes/form-section-node.ts
import type { INodeExecutor } from "@/components/data-grid/table-engine/core/node-registry";
import type { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type { DAGNode } from "@/components/data-grid/table-engine/types/dag.types";
import type {
  FormFieldNodeConfig,
  FormFieldNodeOutput,
  FormSectionNodeConfig,
  FormSectionNodeOutput,
} from "../types/form.types";
import { FormFieldNodeExecutor } from "./form-field-node";

const fieldExecutor = new FormFieldNodeExecutor();

export class FormSectionNodeExecutor implements INodeExecutor<"formSection"> {
  async execute(
    config: FormSectionNodeConfig,
    context: NodeContext,
    allNodes: DAGNode[],
  ): Promise<FormSectionNodeOutput> {
    const sectionId = context.getNodeId();

    // Resolve each formField node by ID from allNodes
    const fields: FormFieldNodeOutput[] = [];
    for (const fieldId of config.fieldIds) {
      const node = allNodes.find((n) => n.id === fieldId && n.type === "formField");
      if (!node) {
        console.warn(`[FormEngine] formSection "${sectionId}": field node "${fieldId}" not found`);
        continue;
      }
      const fieldConfig = node.config as FormFieldNodeConfig;
      // Create a child context for the field node
      const fieldContext = context.forNode(fieldId);
      const output = await fieldExecutor.execute(fieldConfig, fieldContext, allNodes);
      fields.push(output);
    }

    return { sectionId, config, fields };
  }
}
```

> **Note:** `context.forNode(id)` creates a new NodeContext scoped to a child node ID. Check `node-context.ts` — if this method doesn't exist, add it: it returns a new `NodeContext` with the same params/row but a different nodeId.

---

## Task 5: `header-form-node.ts` executor

**File:** `src/components/form-engine/nodes/header-form-node.ts`

- [ ] Create:

```ts
// src/components/form-engine/nodes/header-form-node.ts
import type { INodeExecutor } from "@/components/data-grid/table-engine/core/node-registry";
import type { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type { DAGNode } from "@/components/data-grid/table-engine/types/dag.types";
import type { HeaderFormNodeConfig, HeaderFormNodeOutput } from "../types/form.types";

export class HeaderFormNodeExecutor implements INodeExecutor<"headerForm"> {
  execute(
    config: HeaderFormNodeConfig,
    _context: NodeContext,
    _allNodes: DAGNode[],
  ): Promise<HeaderFormNodeOutput> {
    // HeaderForm is a config carrier — rendering is done by ConfiguredForm.
    // The executor validates that required fields are declared.
    if (!config.titleField) {
      throw new Error("[FormEngine] headerForm node requires titleField");
    }
    return Promise.resolve({ config });
  }
}
```

---

## Task 6: `detail-panel-node.ts` executor

**File:** `src/components/form-engine/nodes/detail-panel-node.ts`

- [ ] Create:

```ts
// src/components/form-engine/nodes/detail-panel-node.ts
import type { INodeExecutor } from "@/components/data-grid/table-engine/core/node-registry";
import type { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type { DAGNode } from "@/components/data-grid/table-engine/types/dag.types";
import type {
  DetailPanelNodeConfig,
  DetailPanelNodeOutput,
  FormSectionNodeConfig,
  FormSectionNodeOutput,
} from "../types/form.types";
import { FormSectionNodeExecutor } from "./form-section-node";

const sectionExecutor = new FormSectionNodeExecutor();

export class DetailPanelNodeExecutor implements INodeExecutor<"detailPanel"> {
  async execute(
    config: DetailPanelNodeConfig,
    context: NodeContext,
    allNodes: DAGNode[],
  ): Promise<DetailPanelNodeOutput> {
    // Resolve each formSection node by ID from allNodes
    const sections: FormSectionNodeOutput[] = [];
    for (const sectionId of config.sections) {
      const node = allNodes.find((n) => n.id === sectionId && n.type === "formSection");
      if (!node) {
        console.warn(`[FormEngine] detailPanel: section node "${sectionId}" not found`);
        continue;
      }
      const sectionConfig = node.config as FormSectionNodeConfig;
      const sectionContext = context.forNode(sectionId);
      const output = await sectionExecutor.execute(sectionConfig, sectionContext, allNodes);
      sections.push(output);
    }
    return { config, sections };
  }
}
```

---

## Task 7: Register form node executors in `bootstrap.ts`

**File:** `src/components/data-grid/table-engine/bootstrap.ts`

- [ ] Add imports for the 4 form node executors:

```ts
import { FormFieldNodeExecutor }   from "@/components/form-engine/nodes/form-field-node";
import { FormSectionNodeExecutor } from "@/components/form-engine/nodes/form-section-node";
import { HeaderFormNodeExecutor }  from "@/components/form-engine/nodes/header-form-node";
import { DetailPanelNodeExecutor } from "@/components/form-engine/nodes/detail-panel-node";
```

- [ ] Register them inside `createDefaultEngine()`, after the existing registrations:

```ts
nodeReg.register("headerForm",  new HeaderFormNodeExecutor());
nodeReg.register("detailPanel", new DetailPanelNodeExecutor());
nodeReg.register("formSection", new FormSectionNodeExecutor());
nodeReg.register("formField",   new FormFieldNodeExecutor());
```

- [ ] Run `npm run check` — zero errors.

---

## Task 8: Add `bootstrap.ts` for form engine

**File:** `src/components/form-engine/bootstrap.ts`

- [ ] Create:

```ts
// src/components/form-engine/bootstrap.ts
// Called from src/main.tsx before the app renders.
// Registers all built-in field type renderers into the global FieldTypeRegistry.
import { registerDefaultFields } from "./core/register-default-fields";

let bootstrapped = false;

export function bootstrapFormEngine(): void {
  if (bootstrapped) return;
  registerDefaultFields();
  bootstrapped = true;
}
```

- [ ] Update `src/components/form-engine/index.ts` to also export bootstrap:

```ts
export { bootstrapFormEngine } from "./bootstrap";
export { fieldTypeRegistry } from "./core/field-type-registry";
// ... existing type exports
```

---

## Task 9: Verify and commit

- [ ] Run `npm run check` — zero errors.
- [ ] Run `npm run build` — must succeed.

- [ ] Commit:

```bash
git add src/components/form-engine/nodes/ \
        src/components/form-engine/bootstrap.ts \
        src/components/form-engine/index.ts \
        src/components/data-grid/table-engine/bootstrap.ts \
        src/components/data-grid/table-engine/core/dag-validator.ts \
        src/components/data-grid/table-engine/jsonata-evaluator.ts
git commit -m "feat(form-engine): add form DAG node executors and register in engine (phase 3)"
```
