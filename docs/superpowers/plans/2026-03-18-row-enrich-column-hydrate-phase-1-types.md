# RowEnrich + ColumnHydrate — Phase 1: Type System

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add all new TypeScript types for `rowEnrich` and `columnHydrate` to the engine's type system.

**Architecture:** Two files edited — `dag.types.ts` gets the new node type discriminants and map entries; `table.types.ts` gets all new config, descriptor, output types, and extended `NodeOutputMap` + `DAGTableResult`. No behaviour change — pure type additions. All downstream phases depend on these compiling first.

**Tech Stack:** TypeScript 5, Biome (linting/formatting)

**Spec:** `docs/superpowers/specs/2026-03-18-row-enrich-column-hydrate-design.md`

**Next phase:** `docs/superpowers/plans/2026-03-18-row-enrich-column-hydrate-phase-2-executors.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/data-grid/table-engine/types/dag.types.ts` | Modify — extend `NodeType`, `NodeConfigMap`, `DAGNode` union |
| `src/components/data-grid/table-engine/types/table.types.ts` | Modify — add 7 new types, extend `NodeOutputMap`, `DAGTableResult` |

---

## Chunk 1: `dag.types.ts` — extend discriminants

### Task 1: Extend `NodeType` union

**File:** `src/components/data-grid/table-engine/types/dag.types.ts`

- [ ] Open the file. The current `NodeType` union (line ~27) is:
  ```ts
  export type NodeType =
    | "api"
    | "transform"
    | "column"
    | "rowExpand"
    | "merge"
    | "action";
  ```
  Add two new variants at the end:
  ```ts
  export type NodeType =
    | "api"
    | "transform"
    | "column"
    | "rowExpand"
    | "merge"
    | "action"
    | "rowEnrich"
    | "columnHydrate";
  ```

### Task 2: Extend `NodeConfigMap`

**File:** `src/components/data-grid/table-engine/types/dag.types.ts`

- [ ] The current `NodeConfigMap` (line ~35) imports types from `table.types`. Add two new entries:
  ```ts
  export interface NodeConfigMap {
    api: ApiNodeConfig;
    transform: TransformNodeConfig;
    column: ColumnNodeConfig;
    rowExpand: RowExpandNodeConfig;
    merge: MergeNodeConfig;
    action: ActionNodeConfig;
    rowEnrich: RowEnrichNodeConfig;        // new
    columnHydrate: ColumnHydrateNodeConfig; // new
  }
  ```
  The imports at the top of the file must also include the new config types — update the import from `"./table.types"`:
  ```ts
  import type {
    ActionNodeConfig,
    ApiNodeConfig,
    ColumnHydrateNodeConfig,   // new
    ColumnNodeConfig,
    MergeNodeConfig,
    NodeOutputMap,
    RowEnrichNodeConfig,       // new
    RowExpandNodeConfig,
    TransformNodeConfig,
  } from "./table.types";
  ```

### Task 3: Extend `DAGNode` discriminated union

**File:** `src/components/data-grid/table-engine/types/dag.types.ts`

- [ ] The current `DAGNode` union (line ~46) has 6 variants. Add two new ones at the end:
  ```ts
  export type DAGNode =
    | { id: string; type: "api"; config: ApiNodeConfig }
    | { id: string; type: "transform"; config: TransformNodeConfig }
    | { id: string; type: "column"; config: ColumnNodeConfig }
    | { id: string; type: "rowExpand"; config: RowExpandNodeConfig }
    | { id: string; type: "merge"; config: MergeNodeConfig }
    | { id: string; type: "action"; config: ActionNodeConfig }
    | { id: string; type: "rowEnrich"; config: RowEnrichNodeConfig }           // new
    | { id: string; type: "columnHydrate"; config: ColumnHydrateNodeConfig };  // new
  ```

### Task 4: Verify `dag.types.ts` compiles

- [ ] Run: `npm run check`
  Expected: TypeScript errors for `RowEnrichNodeConfig` and `ColumnHydrateNodeConfig` not found — these are defined in the next task. This is expected at this step.

---

## Chunk 2: `table.types.ts` — new config/descriptor/output types

### Task 5: Add `RowEnrichNode` types

**File:** `src/components/data-grid/table-engine/types/table.types.ts`

- [ ] After the `// ── RowExpandNode ──` section (after `RowExpandOutput` interface, around line 118), add a new section:

  ```ts
  // ── RowEnrichNode ─────────────────────────────────────────────────────────────

  export interface RowEnrichDescriptor {
    /** Key value identifying the row — derived from rowKeyField */
    rowKey: string;
    /** Plain row data snapshot — no NodeContext stored */
    rowData: GridRow;
  }

  export interface RowEnrichNodeConfig {
    /** Must reference an 'api', 'transform', or 'merge' node */
    sourceNodeId: string;
    /**
     * Lazy ApiNode in nodes[] — NOT in edges.
     * Same convention as RowExpandNodeConfig.childApiNodeId.
     */
    childApiNodeId: string;
    /** Field used as the row identity key. Default: 'id' */
    rowKeyField?: string;
    /**
     * false (default) = fires immediately after root load.
     * true = waits for triggerEnrich() to be called.
     */
    lazy?: boolean;
    /**
     * JSONata expression applied to the first row of the childApi response
     * before merging into the root row.
     * Input: first GridRow from childApi response.
     * Output: object spread onto the root row.
     * Evaluated via evaluateExpr (jsonata-evaluator.ts).
     * When absent, first row is spread directly.
     */
    mergeTransform?: string;
    /**
     * TanStack Query keys to invalidate after ALL row enrich queries succeed.
     * Each string is wrapped in an array: queryClient.invalidateQueries({ queryKey: [key] })
     * e.g. ['eng-expand'] re-fetches the root table after enrichment completes.
     */
    invalidateQueryKeys?: string[];
  }

  export interface RowEnrichNodeOutput {
    descriptors: RowEnrichDescriptor[];
    /** Shared childApiNodeId for all descriptors */
    childApiNodeId: string;
    /** Resolved rowKeyField (default 'id' applied) */
    rowKeyField: string;
    lazy: boolean;
    mergeTransform?: string;
    invalidateQueryKeys?: string[];
  }
  ```

### Task 6: Add `ColumnHydrateNode` types

**File:** `src/components/data-grid/table-engine/types/table.types.ts`

- [ ] Directly after the `RowEnrichNodeOutput` interface, add:

  ```ts
  // ── ColumnHydrateNode ─────────────────────────────────────────────────────────

  export interface ColumnHydrateDescriptor {
    /** Key value identifying the row */
    rowKey: string;
    /** Plain row data snapshot */
    rowData: GridRow;
    /** Column this descriptor is for */
    columnId: string;
  }

  export interface ColumnHydrateEntry {
    /** Must match a ColumnDef.field in the ColumnNode of the same DAG */
    columnId: string;
    /**
     * Lazy ApiNode in nodes[] — NOT in edges.
     * Same convention as RowEnrichNodeConfig.childApiNodeId.
     */
    childApiNodeId: string;
    /** Per-column lazy gate. false (default) = fires with root load */
    lazy?: boolean;
    /**
     * JSONata expression applied to the first row of the childApi response.
     * Output is merged as { [columnId]: transformedValue } onto the root row.
     * When absent, merged as { [columnId]: result.rows[0] }.
     */
    mergeTransform?: string;
    /**
     * TanStack Query keys to invalidate after this column's queries all succeed.
     * Each string is wrapped in an array for the invalidateQueries call.
     */
    invalidateQueryKeys?: string[];
  }

  export interface ColumnHydrateNodeConfig {
    /** Must reference an 'api', 'transform', or 'merge' node */
    sourceNodeId: string;
    /** Field used as the row identity key. Default: 'id' */
    rowKeyField?: string;
    columns: ColumnHydrateEntry[];
  }

  export interface ColumnHydrateNodeOutput {
    descriptors: ColumnHydrateDescriptor[];
    /**
     * Preserved from config for lazy lookups and mergeTransform access in useDAGTable.
     * Index-aligned to descriptors would be ambiguous — use columnEntries.find(c => c.columnId === desc.columnId).
     */
    columnEntries: ColumnHydrateEntry[];
    /** Resolved rowKeyField (default 'id' applied) */
    rowKeyField: string;
  }
  ```

### Task 7: Extend `NodeOutputMap`

**File:** `src/components/data-grid/table-engine/types/table.types.ts`

- [ ] Find the `NodeOutputMap` interface (around line 159). Add two new entries:
  ```ts
  export interface NodeOutputMap {
    api: ApiNodeOutput;
    transform: GridRow[];
    column: ColumnNodeOutput;
    rowExpand: RowExpandOutput;
    merge: GridRow[];
    action: ActionOutput;
    rowEnrich: RowEnrichNodeOutput;           // new
    columnHydrate: ColumnHydrateNodeOutput;   // new
  }
  ```

### Task 8: Extend `DAGTableResult`

**File:** `src/components/data-grid/table-engine/types/table.types.ts`

- [ ] Find the `DAGTableResult` interface (around line 194). Add four new fields after `executeNode`:
  ```ts
  export interface DAGTableResult {
    data: GridRow[];
    columns: GridColumnDef<GridRow>[];
    columnVisibility: Record<string, boolean>;
    isLoading: boolean;
    isFetchingNextPage: boolean;
    error: DAGExecutionError | DAGValidationError | null;
    pagination?: {
      pageIndex: number;
      pageCount: number;
      onPageChange: (page: number) => void;
      pageSize: number;
    };
    hasNextPage?: boolean;
    fetchNextPage?: () => void;
    onExpand?: (row: GridRow) => Promise<GridRow[]>;
    onAction?: (actionId: string, row?: GridRow) => Promise<void>;
    executeNode: (nodeId: string) => Promise<GridRow[]>;
    /** True while any per-row enrichment query is in-flight */
    isEnriching: boolean;
    /** True while any per-column hydration query is in-flight */
    isHydrating: boolean;
    /**
     * Enables eager rowEnrich queries when rowEnrich.lazy === true.
     * Undefined when the DAG has no rowEnrich node or lazy is false.
     */
    triggerEnrich?: () => void;
    /**
     * Enables a specific column's hydration queries when that column has lazy === true.
     * Undefined when the DAG has no columnHydrate node or no column has lazy === true.
     */
    triggerHydrate?: (columnId: string) => void;
  }
  ```

### Task 9: Verify the type system compiles

- [ ] Run: `npm run check`
  Expected: No TypeScript errors related to the new types. There may be errors in other files if they reference `DAGTableResult` and don't yet provide `isEnriching`/`isHydrating` — those will be fixed in Phase 3.

### Task 10: Commit

- [ ] Run:
  ```bash
  git add src/components/data-grid/table-engine/types/dag.types.ts \
          src/components/data-grid/table-engine/types/table.types.ts
  git commit -m "feat(types): add rowEnrich and columnHydrate node types to DAG engine"
  ```
