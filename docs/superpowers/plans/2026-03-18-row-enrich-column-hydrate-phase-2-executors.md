# RowEnrich + ColumnHydrate — Phase 2: Executors, Validator, Bootstrap

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement `RowEnrichNodeExecutor` and `ColumnHydrateNodeExecutor`, extract the shared `readSourceRows` helper, wire both into `dag-validator.ts` and `bootstrap.ts`, and refactor `TransformNodeExecutor` / `MergeNodeExecutor` to use the shared helper.

**Architecture:** Descriptor-pattern executors — run in the initial DAG wave, read source rows from `NodeContext`, build plain `{rowKey, rowData}` descriptors, return typed outputs. No HTTP calls in executors. The shared helper `readSourceRows` replaces the duplicated inline pattern in `transform-node.ts` and `merge-node.ts`. Validator adds two new `if` blocks matching the existing `rowExpand` pattern. Bootstrap registers both executors without `NodeRegistry` in their constructors (they need none).

**Tech Stack:** TypeScript 5, Biome

**Spec:** `docs/superpowers/specs/2026-03-18-row-enrich-column-hydrate-design.md`

**Depends on:** Phase 1 types must be in place (`dag.types.ts` and `table.types.ts` extended).

**Next phase:** `docs/superpowers/plans/2026-03-18-row-enrich-column-hydrate-phase-3-hook.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/data-grid/table-engine/nodes/shared-row-reader.ts` | **Create** — `readSourceRows` helper |
| `src/components/data-grid/table-engine/nodes/row-enrich-node.ts` | **Create** — `RowEnrichNodeExecutor` |
| `src/components/data-grid/table-engine/nodes/column-hydrate-node.ts` | **Create** — `ColumnHydrateNodeExecutor` |
| `src/components/data-grid/table-engine/nodes/transform-node.ts` | **Modify** — replace inline source-row extraction with `readSourceRows` |
| `src/components/data-grid/table-engine/nodes/merge-node.ts` | **Modify** — replace inline `extractRows` function with `readSourceRows` |
| `src/components/data-grid/table-engine/core/dag-validator.ts` | **Modify** — add `rowEnrich` and `columnHydrate` validation blocks |
| `src/components/data-grid/table-engine/bootstrap.ts` | **Modify** — register both new executors |

---

## Chunk 1: Shared helper

### Task 1: Create `shared-row-reader.ts`

**File:** `src/components/data-grid/table-engine/nodes/shared-row-reader.ts` (**new file**)

- [ ] Create the file with the following content:

  ```ts
  // src/components/data-grid/table-engine/nodes/shared-row-reader.ts

  import type { NodeContext } from "../core/node-context";
  import type { GridRow } from "../types/table.types";

  /**
   * Reads GridRow[] from context for a given source node.
   *
   * Supports source node types:
   *   'api'       → ApiNodeOutput.rows
   *   'transform' → GridRow[] (direct)
   *   'merge'     → GridRow[] (direct)
   *
   * Returns [] when context.has(sourceNodeId) is false — matches the graceful-absence
   * pattern in TransformNodeExecutor and MergeNodeExecutor (optional sources).
   *
   * Does NOT need allNodes — reads only from context.
   */
  export function readSourceRows(
    context: NodeContext,
    sourceNodeId: string,
  ): GridRow[] {
    if (!context.has(sourceNodeId)) return [];
    const entry = context.getAll().get(sourceNodeId);
    if (entry?.type === "api") return context.get(sourceNodeId, "api").rows;
    if (entry?.type === "transform") return context.get(sourceNodeId, "transform");
    if (entry?.type === "merge") return context.get(sourceNodeId, "merge");
    return [];
  }
  ```

### Task 2: Refactor `transform-node.ts` to use the helper

**File:** `src/components/data-grid/table-engine/nodes/transform-node.ts`

- [ ] The file currently has an inline source-row extraction pattern (lines 14–27). Replace the import section and the extraction block with `readSourceRows`:

  Before:
  ```ts
  import type { NodeContext } from "../core/node-context";
  import type { INodeExecutor } from "../core/node-registry";
  import { evaluateExpr } from "../jsonata-evaluator";
  import type { DAGNode } from "../types/dag.types";
  import type { GridRow, TransformNodeConfig } from "../types/table.types";

  export class TransformNodeExecutor implements INodeExecutor<"transform"> {
    async execute(
      config: TransformNodeConfig,
      context: NodeContext,
      _allNodes: DAGNode[],
    ): Promise<GridRow[]> {
      // Return empty rows when source is not yet available (graceful for optional sources)
      if (!context.has(config.sourceNodeId)) return [];

      const entry = context.getAll().get(config.sourceNodeId);

      let sourceRows: GridRow[];
      if (entry?.type === "api") {
        sourceRows = context.get(config.sourceNodeId, "api").rows;
      } else if (entry?.type === "merge") {
        sourceRows = context.get(config.sourceNodeId, "merge");
      } else if (entry?.type === "transform") {
        sourceRows = context.get(config.sourceNodeId, "transform");
      } else {
        sourceRows = [];
      }
  ```

  After:
  ```ts
  import type { NodeContext } from "../core/node-context";
  import type { INodeExecutor } from "../core/node-registry";
  import { evaluateExpr } from "../jsonata-evaluator";
  import type { DAGNode } from "../types/dag.types";
  import type { GridRow, TransformNodeConfig } from "../types/table.types";
  import { readSourceRows } from "./shared-row-reader";

  export class TransformNodeExecutor implements INodeExecutor<"transform"> {
    async execute(
      config: TransformNodeConfig,
      context: NodeContext,
      _allNodes: DAGNode[],
    ): Promise<GridRow[]> {
      const sourceRows = readSourceRows(context, config.sourceNodeId);
  ```

  The remainder of the function body (lines 29–37) is unchanged:
  ```ts
      const result = await evaluateExpr<GridRow | GridRow[]>(
        config.expression,
        context,
        sourceRows,
      );

      if (result === undefined) return [];
      return Array.isArray(result) ? result : [result];
    }
  }
  ```

### Task 3: Refactor `merge-node.ts` to use the helper

**File:** `src/components/data-grid/table-engine/nodes/merge-node.ts`

- [ ] The file has a private `extractRows` function (lines 8–16) that does exactly what `readSourceRows` now does. Remove `extractRows` entirely and replace its usages with `readSourceRows`.

  Add the import at the top:
  ```ts
  import { readSourceRows } from "./shared-row-reader";
  ```

  Remove the `extractRows` function (lines 8–16):
  ```ts
  // DELETE THIS ENTIRE FUNCTION:
  function extractRows(context: NodeContext, id: string): GridRow[] {
    if (!context.has(id)) return [];
    const entry = context.getAll().get(id);
    if (entry?.type === "api") return context.get(id, "api").rows;
    if (entry?.type === "transform") return context.get(id, "transform");
    if (entry?.type === "merge") return context.get(id, "merge");
    return [];
  }
  ```

  Update the one callsite inside `execute`:
  ```ts
  // Before:
  const sources = config.sourceNodeIds.map((id) => extractRows(context, id));

  // After:
  const sources = config.sourceNodeIds.map((id) => readSourceRows(context, id));
  ```

  The final file should look like:
  ```ts
  // src/components/data-grid/table-engine/nodes/merge-node.ts

  import type { NodeContext } from "../core/node-context";
  import type { INodeExecutor } from "../core/node-registry";
  import type { DAGNode } from "../types/dag.types";
  import type { GridRow, MergeNodeConfig } from "../types/table.types";
  import { readSourceRows } from "./shared-row-reader";

  export class MergeNodeExecutor implements INodeExecutor<"merge"> {
    async execute(
      config: MergeNodeConfig,
      context: NodeContext,
      _allNodes: DAGNode[],
    ): Promise<GridRow[]> {
      const sources = config.sourceNodeIds.map((id) => readSourceRows(context, id));

      switch (config.strategy) {
        case "concat": {
          return sources.flat();
        }

        case "join": {
          if (!config.joinKey) {
            throw new Error(`MergeNode: "join" strategy requires a joinKey`);
          }
          const [primary, ...rest] = sources;
          return primary.map((row) => {
            const merged: GridRow = { ...row };
            for (const source of rest) {
              const match = source.find(
                (r) => r[config.joinKey!] === row[config.joinKey!],
              );
              if (match) Object.assign(merged, match);
            }
            return merged;
          });
        }

        case "merge": {
          const maxLen = Math.max(0, ...sources.map((s) => s.length));
          return Array.from({ length: maxLen }, (_, i) => {
            const merged: GridRow = { id: sources[0][i]?.id ?? String(i) };
            for (const source of sources) {
              if (source[i]) Object.assign(merged, source[i]);
            }
            return merged;
          });
        }

        default: {
          return sources.flat();
        }
      }
    }
  }
  ```

### Task 4: Verify helper refactors compile and lint clean

- [ ] Run: `npm run check`
  Expected: No errors related to `shared-row-reader.ts`, `transform-node.ts`, or `merge-node.ts`. The `extractRows` function is gone — if Biome previously warned about the duplicate pattern, that warning is now resolved.

### Task 5: Commit shared helper + refactors

- [ ] Run:
  ```bash
  git add src/components/data-grid/table-engine/nodes/shared-row-reader.ts \
          src/components/data-grid/table-engine/nodes/transform-node.ts \
          src/components/data-grid/table-engine/nodes/merge-node.ts
  git commit -m "refactor(nodes): extract readSourceRows helper, remove duplicate extractRows"
  ```

---

## Chunk 2: New executors

### Task 6: Create `row-enrich-node.ts`

**File:** `src/components/data-grid/table-engine/nodes/row-enrich-node.ts` (**new file**)

- [ ] Create:

  ```ts
  // src/components/data-grid/table-engine/nodes/row-enrich-node.ts

  import { DAGExecutionError } from "../core/dag-validator";
  import type { NodeContext } from "../core/node-context";
  import type { INodeExecutor } from "../core/node-registry";
  import type { DAGNode } from "../types/dag.types";
  import type {
    GridRow,
    RowEnrichNodeConfig,
    RowEnrichNodeOutput,
  } from "../types/table.types";
  import { readSourceRows } from "./shared-row-reader";

  export class RowEnrichNodeExecutor implements INodeExecutor<"rowEnrich"> {
    async execute(
      config: RowEnrichNodeConfig,
      context: NodeContext,
      allNodes: DAGNode[],
    ): Promise<RowEnrichNodeOutput> {
      // Validate that the lazy child API node exists — mirrors RowExpandNodeExecutor
      const childNode = allNodes.find(
        (n) => n.id === config.childApiNodeId && n.type === "api",
      );
      if (!childNode) {
        throw new DAGExecutionError(
          `RowEnrichNode: lazy node "${config.childApiNodeId}" not found in allNodes[]. ` +
            `Ensure it is declared in dag.nodes[] (it must NOT be in dag.edges[]).`,
          config.childApiNodeId,
          new Error("Lazy node not found"),
        );
      }

      const rowKeyField = config.rowKeyField ?? "id";
      const rows: GridRow[] = readSourceRows(context, config.sourceNodeId);

      const descriptors = rows.map((row) => ({
        rowKey: String(row[rowKeyField]),
        rowData: row,
      }));

      return {
        descriptors,
        childApiNodeId: config.childApiNodeId,
        rowKeyField,
        lazy: config.lazy ?? false,
        mergeTransform: config.mergeTransform,
        invalidateQueryKeys: config.invalidateQueryKeys,
      };
    }
  }
  ```

### Task 7: Create `column-hydrate-node.ts`

**File:** `src/components/data-grid/table-engine/nodes/column-hydrate-node.ts` (**new file**)

- [ ] Create:

  ```ts
  // src/components/data-grid/table-engine/nodes/column-hydrate-node.ts

  import { DAGExecutionError } from "../core/dag-validator";
  import type { NodeContext } from "../core/node-context";
  import type { INodeExecutor } from "../core/node-registry";
  import type { DAGNode } from "../types/dag.types";
  import type {
    ColumnHydrateNodeConfig,
    ColumnHydrateNodeOutput,
    GridRow,
  } from "../types/table.types";
  import { readSourceRows } from "./shared-row-reader";

  export class ColumnHydrateNodeExecutor implements INodeExecutor<"columnHydrate"> {
    async execute(
      config: ColumnHydrateNodeConfig,
      context: NodeContext,
      allNodes: DAGNode[],
    ): Promise<ColumnHydrateNodeOutput> {
      // Validate all childApiNodeIds exist — one error per missing reference
      for (const col of config.columns) {
        const childNode = allNodes.find(
          (n) => n.id === col.childApiNodeId && n.type === "api",
        );
        if (!childNode) {
          throw new DAGExecutionError(
            `ColumnHydrateNode: lazy node "${col.childApiNodeId}" for column "${col.columnId}" ` +
              `not found in allNodes[]. Ensure it is declared in dag.nodes[] (NOT in dag.edges[]).`,
            col.childApiNodeId,
            new Error("Lazy node not found"),
          );
        }
      }

      const rowKeyField = config.rowKeyField ?? "id";
      const rows: GridRow[] = readSourceRows(context, config.sourceNodeId);

      // One descriptor per {row × column} combination
      const descriptors = config.columns.flatMap((col) =>
        rows.map((row) => ({
          rowKey: String(row[rowKeyField]),
          rowData: row,
          columnId: col.columnId,
        })),
      );

      return {
        descriptors,
        columnEntries: config.columns,
        rowKeyField,
      };
    }
  }
  ```

### Task 8: Verify new executors compile

- [ ] Run: `npm run check`
  Expected: No errors in `row-enrich-node.ts` or `column-hydrate-node.ts`.

### Task 9: Commit new executors

- [ ] Run:
  ```bash
  git add src/components/data-grid/table-engine/nodes/row-enrich-node.ts \
          src/components/data-grid/table-engine/nodes/column-hydrate-node.ts
  git commit -m "feat(nodes): add RowEnrichNodeExecutor and ColumnHydrateNodeExecutor"
  ```

---

## Chunk 3: Validator + Bootstrap

### Task 10: Extend `dag-validator.ts`

**File:** `src/components/data-grid/table-engine/core/dag-validator.ts`

- [ ] Find the `// Per-node validation` block (around line 69). After the existing `if (node.type === "action")` block, add two new blocks at the end of the `for (const node of dag.nodes)` loop:

  ```ts
  if (node.type === "rowEnrich") {
    if (!nodeIds.has(node.config.sourceNodeId)) {
      throw new DAGValidationError(
        `RowEnrichNode "${node.id}" references unknown sourceNodeId: "${node.config.sourceNodeId}"`,
        node.id,
      );
    }
    if (!nodeIds.has(node.config.childApiNodeId)) {
      throw new DAGValidationError(
        `RowEnrichNode "${node.id}" references unknown childApiNodeId: "${node.config.childApiNodeId}"`,
        node.id,
      );
    }
  }

  if (node.type === "columnHydrate") {
    if (!nodeIds.has(node.config.sourceNodeId)) {
      throw new DAGValidationError(
        `ColumnHydrateNode "${node.id}" references unknown sourceNodeId: "${node.config.sourceNodeId}"`,
        node.id,
      );
    }
    for (const col of node.config.columns) {
      if (!nodeIds.has(col.childApiNodeId)) {
        throw new DAGValidationError(
          `ColumnHydrateNode "${node.id}" column "${col.columnId}" references unknown childApiNodeId: "${col.childApiNodeId}"`,
          node.id,
        );
      }
    }
  }
  ```

  The final `validateDAG` function should now have 5 `if (node.type === ...)` blocks: `api`, `rowExpand`, `action`, `rowEnrich`, `columnHydrate`.

### Task 11: Extend `bootstrap.ts`

**File:** `src/components/data-grid/table-engine/bootstrap.ts`

- [ ] Add imports for both new executors at the top of the file, alongside the existing node imports:
  ```ts
  import { ColumnHydrateNodeExecutor } from "./nodes/column-hydrate-node";
  import { RowEnrichNodeExecutor } from "./nodes/row-enrich-node";
  ```

- [ ] After `nodeReg.register("rowExpand", new RowExpandNodeExecutor(nodeReg));`, add:
  ```ts
  nodeReg.register("rowEnrich", new RowEnrichNodeExecutor());
  nodeReg.register("columnHydrate", new ColumnHydrateNodeExecutor());
  ```

  Note: Unlike `RowExpandNodeExecutor`, the two new executors take **no constructor arguments** — they do not call `nodeRegistry.resolve()` at runtime and therefore do not need `NodeRegistry` injected.

  The final `createDefaultEngine` should read:
  ```ts
  export function createDefaultEngine(bearerToken?: string): DAGEngine {
    const auth = new AuthAdapterRegistry()
      .register("wafdata", new WAFDataAuthAdapter())
      .register("bearer", new BearerAuthAdapter(bearerToken ?? ""))
      .register("none", new NoAuthAdapter());

    const nodeReg = new NodeRegistry()
      .register("api", new ApiNodeExecutor(auth))
      .register("transform", new TransformNodeExecutor())
      .register("column", new ColumnNodeExecutor())
      .register("merge", new MergeNodeExecutor())
      .register("action", new ActionNodeExecutor());

    nodeReg.register("rowExpand", new RowExpandNodeExecutor(nodeReg));
    nodeReg.register("rowEnrich", new RowEnrichNodeExecutor());
    nodeReg.register("columnHydrate", new ColumnHydrateNodeExecutor());

    return new DAGEngine(nodeReg, auth);
  }
  ```

### Task 12: Verify the full engine compiles and lints

- [ ] Run: `npm run check`
  Expected: No errors in `dag-validator.ts` or `bootstrap.ts`. There may be errors in `use-dag-table.ts` if it doesn't yet return `isEnriching`/`isHydrating` — those are fixed in Phase 3.

### Task 13: Verify the build passes

- [ ] Run: `npm run build`
  Expected: Build completes. Ignore any TypeScript strict errors about `DAGTableResult` missing `isEnriching`/`isHydrating` in `use-dag-table.ts` return — fixed in Phase 3.

### Task 14: Commit validator + bootstrap

- [ ] Run:
  ```bash
  git add src/components/data-grid/table-engine/core/dag-validator.ts \
          src/components/data-grid/table-engine/bootstrap.ts
  git commit -m "feat(engine): register rowEnrich and columnHydrate nodes in DAG engine"
  ```
