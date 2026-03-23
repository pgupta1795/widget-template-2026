# RowEnrich + ColumnHydrate — Phase 3: useDAGTable Hook

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend `useDAGTable` to run parallel per-row and per-column enrichment queries using TanStack Query `useQueries`, merge results progressively into the final row array, expose `isEnriching`/`isHydrating` flags and optional lazy triggers.

**Architecture:** Two TanStack Query `useQueries` blocks (one for `rowEnrich`, one for `columnHydrate`) are added after the existing `flatQuery`/`infiniteQuery`. Each block reads descriptors produced by the executors, fires a separate API call per descriptor using `ApiNodeExecutor`, and optionally applies a `mergeTransform` (JSONata). Two chained `useMemo`s — `enrichedRows` then `hydratedRows` — fold results back onto rows progressively. Lazy gates use `useState` initialised from the static DAG config (not async data) so hooks are never called conditionally. Dead code (two commented-out `queryClient.invalidateQueries` lines) is removed.

**Tech Stack:** TypeScript 5, React 19, TanStack Query v5, Biome

**Spec:** `docs/superpowers/specs/2026-03-18-row-enrich-column-hydrate-design.md`

**Prev phase:** `docs/superpowers/plans/2026-03-18-row-enrich-column-hydrate-phase-2-executors.md`

**Next phase:** `docs/superpowers/plans/2026-03-18-row-enrich-column-hydrate-phase-4-wiring.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/data-grid/table-engine/hooks/use-dag-table.ts` | Modify — add useQueries blocks, progressive merge chain, invalidation effects, lazy triggers, remove dead code |

---

## Chunk 1: Imports and lazy-gate state

### Task 1: Add missing imports

**File:** `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] Open the file. The current React import line (line 8) is:
  ```ts
  import {useCallback,useMemo,useRef,useState} from "react";
  ```
  Add `useEffect` and remove the inline-format inconsistency — replace that line with:
  ```ts
  import { useCallback, useEffect, useMemo, useRef, useState } from "react";
  ```

- [ ] The current TanStack Query import (lines 3–7) is:
  ```ts
  import {
  	useInfiniteQuery,
  	useQuery,
  	useQueryClient,
  } from "@tanstack/react-query";
  ```
  Add `useQueries`:
  ```ts
  import {
  	useInfiniteQuery,
  	useQueries,
  	useQuery,
  	useQueryClient,
  } from "@tanstack/react-query";
  ```

- [ ] The current `table.types` import (lines 17–22) is:
  ```ts
  import type {
  	ColumnNodeOutput,
  	DAGTableConfig,
  	DAGTableResult,
  	GridRow,
  } from "../types/table.types";
  ```
  Add the four new output types:
  ```ts
  import type {
  	ApiNodeConfig,
  	ColumnHydrateNodeOutput,
  	ColumnNodeOutput,
  	DAGTableConfig,
  	DAGTableResult,
  	GridRow,
  	RowEnrichNodeOutput,
  } from "../types/table.types";
  ```

- [ ] Also add the `evaluateExpr` import. After the existing `import {ApiNodeExecutor}` line (line 15), add:
  ```ts
  import { evaluateExpr } from "../jsonata-evaluator";
  ```

- [ ] Run: `npm run check`
  Expected: No new errors from the import changes alone. The new types (RowEnrichNodeOutput, etc.) are already defined in Phase 1.

### Task 2: Declare static node lookups and lazy-gate state

**File:** `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] Inside `useDAGTable`, after the destructure on line 37:
  ```ts
  const { tableId, mode, dag } = config;
  ```
  Add the following block **before** the existing `useState(0)` call for `pageIndex`:

  ```ts
  // ── Static node lookups (derived from config — stable between renders) ───────
  const rowEnrichNode = dag.nodes.find((n) => n.type === "rowEnrich") as
    | { id: string; type: "rowEnrich"; config: import("../types/table.types").RowEnrichNodeConfig }
    | undefined;
  const colHydrateNode = dag.nodes.find((n) => n.type === "columnHydrate") as
    | { id: string; type: "columnHydrate"; config: import("../types/table.types").ColumnHydrateNodeConfig }
    | undefined;

  // Lazy-gate state — initialised from static DAG config, never from async data.
  // rowEnrich: starts enabled unless config.lazy === true.
  const [enrichEnabled, setEnrichEnabled] = useState(() => !rowEnrichNode?.config.lazy);
  // columnHydrate: per-column gate; starts enabled unless column.lazy === true.
  const [hydrateEnabledCols, setHydrateEnabledCols] = useState<Record<string, boolean>>(
    () =>
      Object.fromEntries(
        (colHydrateNode?.config.columns ?? []).map((col) => [col.columnId, !col.lazy]),
      ),
  );

  // One-shot refs to guard invalidateQueryKeys effects from firing more than once.
  const enrichInvalidatedRef = useRef(false);
  const hydrateInvalidatedRef = useRef<Set<string>>(new Set());
  ```

- [ ] Run: `npm run check`
  Expected: TypeScript should compile without errors (the new types exist from Phase 1).

---

## Chunk 2: Extend flatQuery to carry enrichment outputs

### Task 3: Return rowEnrichOutput and colHydrateOutput from flatQuery

**File:** `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] Inside the `flatQuery.queryFn` async function, after the line:
  ```ts
  		// Store context for expand handler
  		return { rows, colOutput, ctx };
  ```
  Replace that return statement with:
  ```ts
  		// Extract rowEnrich and columnHydrate outputs if their nodes were executed
  		const rowEnrichNodeId = dag.nodes.find((n) => n.type === "rowEnrich")?.id;
  		const rowEnrichOutput: RowEnrichNodeOutput | undefined =
  			rowEnrichNodeId && ctx.has(rowEnrichNodeId)
  				? ctx.get(rowEnrichNodeId, "rowEnrich")
  				: undefined;

  		const colHydrateNodeId = dag.nodes.find((n) => n.type === "columnHydrate")?.id;
  		const colHydrateOutput: ColumnHydrateNodeOutput | undefined =
  			colHydrateNodeId && ctx.has(colHydrateNodeId)
  				? ctx.get(colHydrateNodeId, "columnHydrate")
  				: undefined;

  		// Store context for expand handler
  		return { rows, colOutput, ctx, rowEnrichOutput, colHydrateOutput };
  ```

- [ ] Run: `npm run check`
  Expected: No errors — TypeScript infers the new optional fields on the query data shape.

---

## Chunk 3: rowEnrich useQueries block

### Task 4: Add useQueries for per-row enrichment

**File:** `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] After the existing `// ── Derive final values ───────────────────────────────────────────────────` section (after `finalColOutput` useMemo, around line 144), add the following block:

  ```ts
  // ── rowEnrich useQueries ─────────────────────────────────────────────────────

  const rowEnrichOutput = flatQuery.data?.rowEnrichOutput;
  const enrichDescriptors = rowEnrichOutput?.descriptors ?? [];
  const enrichChildApiNodeId = rowEnrichOutput?.childApiNodeId ?? "";
  const enrichRowKeyField = rowEnrichOutput?.rowKeyField ?? "id";
  const enrichMergeTransform = rowEnrichOutput?.mergeTransform;
  const enrichInvalidateKeys = rowEnrichOutput?.invalidateQueryKeys;

  const enrichQueries = useQueries({
    queries: enrichDescriptors.map((desc) => ({
      queryKey: [tableId, "rowEnrich", desc.rowKey, enrichChildApiNodeId],
      queryFn: async (): Promise<GridRow> => {
        const childApiNode = dag.nodes.find(
          (n) => n.id === enrichChildApiNodeId && n.type === "api",
        );
        if (!childApiNode || !ctxRef.current) return desc.rowData;

        const rowCtx = ctxRef.current.withRow(desc.rowData);
        const apiExecutor = new ApiNodeExecutor(engine.getAuthRegistry());
        const result = await apiExecutor.execute(
          childApiNode.config as ApiNodeConfig,
          rowCtx,
          dag.nodes,
        );

        const firstRow = result.rows[0] ?? {};
        if (enrichMergeTransform) {
          const merged = await evaluateExpr<GridRow>(enrichMergeTransform, rowCtx, firstRow);
          return merged ?? {};
        }
        return firstRow as GridRow;
      },
      enabled: enrichEnabled && !!flatQuery.data && !!enrichChildApiNodeId,
    })),
  });
  ```

- [ ] Run: `npm run check`
  Expected: No errors.

---

## Chunk 4: columnHydrate useQueries block

### Task 5: Add useQueries for per-column hydration

**File:** `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] Directly after the `enrichQueries` block from Task 4, add:

  ```ts
  // ── columnHydrate useQueries ─────────────────────────────────────────────────

  const colHydrateOutput = flatQuery.data?.colHydrateOutput;
  const hydrateDescriptors = colHydrateOutput?.descriptors ?? [];
  const hydrateColumnEntries = colHydrateOutput?.columnEntries ?? [];
  const hydrateRowKeyField = colHydrateOutput?.rowKeyField ?? "id";

  const hydrateQueries = useQueries({
    queries: hydrateDescriptors.map((desc) => {
      const entry = hydrateColumnEntries.find((e) => e.columnId === desc.columnId);
      return {
        queryKey: [tableId, "columnHydrate", desc.rowKey, desc.columnId],
        queryFn: async (): Promise<unknown> => {
          if (!entry || !ctxRef.current) return undefined;
          const childApiNode = dag.nodes.find(
            (n) => n.id === entry.childApiNodeId && n.type === "api",
          );
          if (!childApiNode) return undefined;

          const rowCtx = ctxRef.current.withRow(desc.rowData);
          const apiExecutor = new ApiNodeExecutor(engine.getAuthRegistry());
          const result = await apiExecutor.execute(
            childApiNode.config as ApiNodeConfig,
            rowCtx,
            dag.nodes,
          );

          const firstRow = result.rows[0] ?? {};
          if (entry.mergeTransform) {
            return evaluateExpr<unknown>(entry.mergeTransform, rowCtx, firstRow);
          }
          return firstRow;
        },
        enabled: !!(
          hydrateEnabledCols[desc.columnId] &&
          flatQuery.data &&
          entry?.childApiNodeId
        ),
      };
    }),
  });
  ```

- [ ] Run: `npm run check`
  Expected: No errors.

---

## Chunk 5: Progressive merge chain and isEnriching/isHydrating

### Task 6: Add enrichedRows and hydratedRows useMemos

**File:** `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] After the `hydrateQueries` block from Task 5, add:

  ```ts
  // ── Progressive merge chain ───────────────────────────────────────────────────

  // Fold enrichment results onto the root rows (progressive — updates per query)
  const enrichedRows = useMemo<GridRow[]>(() => {
    if (enrichDescriptors.length === 0) return finalRows;
    return finalRows.map((row) => {
      const rowKey = String(row[enrichRowKeyField] ?? "");
      const idx = enrichDescriptors.findIndex((d) => d.rowKey === rowKey);
      if (idx === -1 || enrichQueries[idx]?.status !== "success") return row;
      const patch = enrichQueries[idx].data;
      return patch ? { ...row, ...patch } : row;
    });
  }, [finalRows, enrichDescriptors, enrichQueries, enrichRowKeyField]);

  // Fold hydration results onto enriched rows — one key per descriptor
  const hydratedRows = useMemo<GridRow[]>(() => {
    if (hydrateDescriptors.length === 0) return enrichedRows;
    return enrichedRows.map((row) => {
      const rowKey = String(row[hydrateRowKeyField] ?? "");
      const matches = hydrateDescriptors
        .map((desc, i) => ({ desc, i }))
        .filter(({ desc }) => desc.rowKey === rowKey);
      if (matches.length === 0) return row;
      let merged: GridRow = { ...row };
      for (const { desc, i } of matches) {
        if (hydrateQueries[i]?.status === "success") {
          merged = { ...merged, [desc.columnId]: hydrateQueries[i].data };
        }
      }
      return merged;
    });
  }, [enrichedRows, hydrateDescriptors, hydrateQueries, hydrateRowKeyField]);
  ```

### Task 7: Add isEnriching and isHydrating derived values

**File:** `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] Directly after the `hydratedRows` useMemo, add:

  ```ts
  const isEnriching = enrichQueries.some((q) => q.isFetching);
  const isHydrating = hydrateQueries.some((q) => q.isFetching);
  ```

- [ ] Run: `npm run check`
  Expected: No errors.

---

## Chunk 6: invalidateQueryKeys effects

### Task 8: Add invalidation useEffects

**File:** `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] After the `isEnriching`/`isHydrating` lines from Task 7, add:

  ```ts
  // ── invalidateQueryKeys effects ──────────────────────────────────────────────

  // rowEnrich: invalidate once when ALL row-enrich queries succeed.
  const allEnrichSuccess =
    enrichQueries.length > 0 && enrichQueries.every((q) => q.isSuccess);
  useEffect(() => {
    if (!allEnrichSuccess || !enrichInvalidateKeys?.length) return;
    if (enrichInvalidatedRef.current) return;
    enrichInvalidatedRef.current = true;
    for (const key of enrichInvalidateKeys) {
      void queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, [allEnrichSuccess, enrichInvalidateKeys, queryClient]);

  // columnHydrate: per-column — invalidate once when ALL queries for that column succeed.
  useEffect(() => {
    for (const entry of hydrateColumnEntries) {
      if (!entry.invalidateQueryKeys?.length) continue;
      if (hydrateInvalidatedRef.current.has(entry.columnId)) continue;
      const colIndices = hydrateDescriptors
        .map((desc, i) => ({ desc, i }))
        .filter(({ desc }) => desc.columnId === entry.columnId);
      const allColSuccess =
        colIndices.length > 0 && colIndices.every(({ i }) => hydrateQueries[i]?.isSuccess);
      if (allColSuccess) {
        hydrateInvalidatedRef.current.add(entry.columnId);
        for (const key of entry.invalidateQueryKeys) {
          void queryClient.invalidateQueries({ queryKey: [key] });
        }
      }
    }
  }, [hydrateColumnEntries, hydrateDescriptors, hydrateQueries, queryClient]);
  ```

- [ ] Run: `npm run check`
  Expected: No errors.

---

## Chunk 7: Lazy triggers and dead code removal

### Task 9: Add unconditional trigger useCallbacks

**File:** `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] After the `invalidateQueryKeys` effects from Task 8, add the trigger callbacks.
  Both `useCallback`s must be called unconditionally (Rules of Hooks). The *exposed* value
  is gated after the call:

  ```ts
  // ── Lazy triggers ─────────────────────────────────────────────────────────────

  // Always call — never inside conditions.
  const triggerEnrichFn = useCallback(() => setEnrichEnabled(true), []);
  const triggerHydrateFn = useCallback(
    (columnId: string) =>
      setHydrateEnabledCols((prev) => ({ ...prev, [columnId]: true })),
    [],
  );

  // Only expose when the DAG actually has a lazy node of that type.
  const triggerEnrich = rowEnrichNode?.config.lazy ? triggerEnrichFn : undefined;
  const triggerHydrate =
    colHydrateNode?.config.columns.some((c) => c.lazy) ? triggerHydrateFn : undefined;
  ```

### Task 10: Remove dead code

**File:** `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] Find and delete the two commented-out `queryClient.invalidateQueries` lines:
  - Line ~184: `// await queryClient.invalidateQueries({ queryKey: [config.tableId] });` (inside `executeNode`)
  - Line ~225: `// await queryClient.invalidateQueries({ queryKey: [config.tableId] });` (inside `onAction`)

  Delete each entire comment line (the whole `// await queryClient...` line, not surrounding code).

- [ ] Run: `npm run check`
  Expected: No errors.

---

## Chunk 8: Update return statement

### Task 11: Add new fields to return object

**File:** `src/components/data-grid/table-engine/hooks/use-dag-table.ts`

- [ ] Find the `return {` statement at the bottom of the hook (around line 245). Currently it returns:
  ```ts
  return {
  	data: finalRows,
  	columns: finalColOutput.columns,
  	columnVisibility: finalColOutput.visibility,
  	isLoading,
  	isFetchingNextPage,
  	error,
  	pagination,
  	hasNextPage: mode === "infinite" ? infiniteQuery.hasNextPage : undefined,
  	fetchNextPage:
  		mode === "infinite" ? infiniteQuery.fetchNextPage : undefined,
  	onExpand,
  	onAction,
  	executeNode,
  };
  ```
  Replace with:
  ```ts
  return {
  	data: hydratedRows,
  	columns: finalColOutput.columns,
  	columnVisibility: finalColOutput.visibility,
  	isLoading,
  	isFetchingNextPage,
  	error,
  	pagination,
  	hasNextPage: mode === "infinite" ? infiniteQuery.hasNextPage : undefined,
  	fetchNextPage:
  		mode === "infinite" ? infiniteQuery.fetchNextPage : undefined,
  	onExpand,
  	onAction,
  	executeNode,
  	isEnriching,
  	isHydrating,
  	triggerEnrich,
  	triggerHydrate,
  };
  ```

- [ ] Run: `npm run check`
  Expected: TypeScript may flag that `DAGTableResult.isEnriching` and `isHydrating` are required — that's intentional and will be present from Phase 1. If they appear missing, verify Phase 1 was applied first.

- [ ] Run: `npm run build`
  Expected: Clean build with no errors in the hook.

### Task 12: Commit

- [ ] Run:
  ```bash
  git add src/components/data-grid/table-engine/hooks/use-dag-table.ts
  git commit -m "feat(hook): add rowEnrich and columnHydrate useQueries to useDAGTable"
  ```
