# RowEnrich + ColumnHydrate Documentation — Design Spec

**Date:** 2026-03-23
**Branch:** tanstack-table-ui
**Status:** Approved

---

## Overview

Add comprehensive documentation for the two new DAG node types (`rowEnrich` and `columnHydrate`) to the existing `src/components/data-grid/docs/` tree. Follow the established style (concept → schema tables → annotated example) used across existing docs. Use `ca-search.config.ts` as the real-world combined example.

---

## Approach

Option A + C mix:
- Two dedicated per-feature files (deep, standalone)
- One combined walkthrough file (real-world, ca-search.config.ts)
- Four surgical updates to existing reference files

---

## Files to Create

### 1. `src/components/data-grid/docs/05-config-driven-tables/row-enrich.md`

Structure:
1. Concept — eager row enrichment, progressive rendering, DAG wave placement
2. Schema tables — `RowEnrichNodeConfig` (all fields), `RowEnrichNodeOutput`, `RowEnrichDescriptor`
3. DAG wiring rules — nodes[] vs edges[], sourceNodeId, childApiNodeId convention
4. JSONata `mergeTransform` — input shape, output shape, omit behaviour. **Critical detail:** the input to `mergeTransform` is `rows[0]` of the childApi response *after* that node's own `responseTransform` has already run. Document this explicitly with an example showing how `ca-detail-api`'s `responseTransform` wraps the flat response into `[{...}]` and `mergeTransform` then receives the already-shaped object.
5. Lazy mode — `lazy: true`, `triggerEnrich()` via toolbar handler
6. `invalidateQueryKeys` — TQ v5 useEffect pattern, when to use
7. Annotated minimal example + link to combined walkthrough

### 2. `src/components/data-grid/docs/05-config-driven-tables/column-hydrate.md`

Structure:
1. Concept — per-column lazy hydration, column-gated loading, independent column gates
2. Schema tables — `ColumnHydrateNodeConfig`, `ColumnHydrateEntry`, `ColumnHydrateNodeOutput`, `ColumnHydrateDescriptor`
3. DAG wiring rules
4. Per-column `lazy` — multiple columns independently gated; one column lazy, another eager
5. `mergeTransform` per column — input is first row of childApi response (post-`responseTransform`). Merge behaviour (from actual `use-dag-table.ts` lines 374–381):
   - If `mergeTransform` result (or raw `firstRow` when absent) is a **non-null object**, it is **spread directly** onto the root row → all keys are merged (e.g., `proposedChanges` entry's transform returns `{ proposedChanges, proposedCount }` → both become top-level row fields)
   - If result is a **primitive or array**, it is stored as `{ [columnId]: value }`
   - This means a single `ColumnHydrateEntry` can hydrate multiple columns by returning an object with multiple keys
   - **Note:** The 2026-03-18 design spec shows `return { [desc.columnId]: transformed }` in its code sample — this was the planned implementation, but the actual shipped code uses the smarter object-spread logic described above. Document the actual code behavior.
6. Toolbar `triggerHydrate(columnId)` pattern — handler calls `ctx.triggerHydrate?.('columnId')`
7. Annotated minimal example — **use `engEnrichedConfig` from `docs/superpowers/specs/2026-03-18-row-enrich-column-hydrate-design.md` (lines 529–639) as the source**; it has `lazy: true` on the `status` column hydrate entry and a `triggerHydrate` toolbar command. Simplify as needed. Link to combined walkthrough.

### 3. `src/components/data-grid/docs/05-config-driven-tables/row-enrich-column-hydrate-combined.md`

Structure:
1. ASCII architecture diagram — matches the linear chain in ca-search.config.ts:
   `root-api → row-enrich → col-hydrate → columns` (lazy nodes float outside edges)
   Also show alternative fan-out topology: `root-api` → both `row-enrich` AND `col-hydrate` independently → `columns`.
   **Critical nuance to document:** In both topologies, `col-hydrate`'s `sourceNodeId` points to `root-api` (not `row-enrich`) — it reads root rows, not enriched rows. The edge chain only controls execution order; the data source is controlled independently by `sourceNodeId`. Explain this in the walkthrough.
2. Annotated full `caSearchConfig` (from `src/features/xen/configs/ca-search.config.ts`) — every field commented
3. Data flow narrative — what fires eagerly (root-api, row-enrich), what fires lazily (col-hydrate columns
   all have `lazy` omitted = false = eager in ca-search; toolbar-triggered hydration is a separate
   pattern shown in the dedicated `column-hydrate.md` example)
4. Toolbar integration — explain `isEnriching` / `isHydrating` ToolbarContext flags, and how a custom
   toolbar command can call `ctx.triggerHydrate?.('columnId')` to gate column hydration on demand
5. Decision guide table — rowEnrich vs columnHydrate vs merge node

---

## Files to Update

### `docs/05-config-driven-tables/dag-nodes.md`

- Opening sentence "Complete reference for all six node types." → "Complete reference for all eight node types."
- Add `rowEnrich` section after Action Node section, matching per-type structure:
  purpose, Config Fields table, Output type, Example
- Add `columnHydrate` section after rowEnrich section, same structure
- Update "Full Node Type Reference" summary table at bottom (6 rows → 8 rows). New rows to add:

| Node Type | Executes On Initial Wave | Can Be Lazy | Output Type | Typical Use |
|-----------|--------------------------|-------------|-------------|-------------|
| **rowEnrich** | Yes (if in edges) | Yes (via `triggerEnrich()`) | `RowEnrichNodeOutput` | Enrich every root row via per-row API call (eager or trigger-gated) |
| **columnHydrate** | Yes (if in edges) | Yes (per-column via `triggerHydrate(columnId)`) | `ColumnHydrateNodeOutput` | Hydrate per-column cells from independent API calls (per-column lazy gate) |

### `docs/05-config-driven-tables/config-api-reference.md`

- Insert new node type sections after the existing `ActionNode` section (before any summary/footer content), using the same `### NodeName` heading style as the existing sections
- Add `RowEnrichNode` section: type block + `RowEnrichNodeConfig` field table + `RowEnrichNodeOutput` type block
- Add `ColumnHydrateNode` section: type block + `ColumnHydrateNodeConfig` field table + `ColumnHydrateEntry` field table + `ColumnHydrateNodeOutput` type block
- Also update the `DAGConfig` table: the `nodes` field description currently reads "All nodes: api, transform, column, merge, rowExpand, action. Includes lazy nodes." → update to "All nodes: api, transform, column, merge, rowExpand, action, rowEnrich, columnHydrate. Includes lazy nodes."

### `docs/05-config-driven-tables/config-basics.md`

- "Six Node Types" heading/text → "Eight Node Types"
- DAG model table: add `rowEnrich` row (Purpose: Enrich every root row via per-row API call) and `columnHydrate` row (Purpose: Hydrate per-column cells from independent API calls)

### `docs/README.md`

Anchor text for "Getting Started" target line (currently line 74):
```
- [DAG Nodes Reference](05-config-driven-tables/dag-nodes.md) — All 6 node types (api, transform, column, merge, rowExpand, action)
```
Change to:
```
- [DAG Nodes Reference](05-config-driven-tables/dag-nodes.md) — All 8 node types (api, transform, column, merge, rowExpand, action, rowEnrich, columnHydrate)
```

Anchor text for "Scenarios & Examples" insertion point — insert after this exact line (currently line 84):
```
- [Actions](05-config-driven-tables/actions.md) — Row/cell buttons, lazy APIs, visibility/disabled rules
```
Insert immediately after:
```
- [Row Enrich](05-config-driven-tables/row-enrich.md) — Eager per-row API enrichment, progressive rendering
- [Column Hydrate](05-config-driven-tables/column-hydrate.md) — Per-column lazy hydration, toolbar-triggered
- [RowEnrich + ColumnHydrate Combined](05-config-driven-tables/row-enrich-column-hydrate-combined.md) — Real-world walkthrough with ca-search.config.ts
```

---

## Style Rules (from existing docs)

- Concept first, then schema tables, then examples
- Schema tables: `Field | Type | Required | Description` columns
- Required fields marked ✓, optional marked —
- Code blocks use `typescript` language tag
- Per-node sections separated by `---`
- Cross-links to related docs at the bottom of each file
- No emoji, no headings deeper than `###`
- ASCII diagrams for data flow (matching config-basics.md style)

---

## Schema Summary (from design spec 2026-03-18)

### RowEnrichNodeConfig

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sourceNodeId` | `string` | ✓ | — | ID of `api`, `transform`, or `merge` node whose rows to enrich |
| `childApiNodeId` | `string` | ✓ | — | ID of lazy `api` node (in nodes[], NOT in edges[]) called per row |
| `rowKeyField` | `string` | — | `"id"` | Field on root row used as unique key |
| `lazy` | `boolean` | — | `false` | false = fires immediately after root load; true = waits for `triggerEnrich()` |
| `mergeTransform` | `string` (JSONata) | — | — | JSONata applied to `rows[0]` of childApi response before merging |
| `invalidateQueryKeys` | `string[]` | — | — | TQ keys to invalidate after ALL row enrich queries succeed |

### RowEnrichNodeOutput

```typescript
{
  descriptors: RowEnrichDescriptor[];   // One per root row
  childApiNodeId: string;
  rowKeyField: string;
  lazy: boolean;
  mergeTransform?: string;
  invalidateQueryKeys?: string[];
}
```

### RowEnrichDescriptor

```typescript
{
  rowKey: string;    // String(row[rowKeyField])
  rowData: GridRow;  // Original root row (plain data, no NodeContext)
}
```

### ColumnHydrateNodeConfig

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sourceNodeId` | `string` | ✓ | — | ID of `api`, `transform`, or `merge` node whose rows to hydrate |
| `rowKeyField` | `string` | — | `"id"` | Field on root row used as unique key |
| `columns` | `ColumnHydrateEntry[]` | ✓ | — | Per-column hydration config |

**Note:** `ColumnHydrateNodeConfig` has no `invalidateQueryKeys` field. Invalidation is configured per-column on each `ColumnHydrateEntry`. This is intentional — different columns may need to invalidate different query keys.

### ColumnHydrateEntry

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `columnId` | `string` | ✓ | — | Must match a `field` in the ColumnNode of the same DAG |
| `childApiNodeId` | `string` | ✓ | — | ID of lazy `api` node (in nodes[], NOT in edges[]) |
| `lazy` | `boolean` | — | `false` | false = fires with root load; true = waits for `triggerHydrate(columnId)` |
| `mergeTransform` | `string` (JSONata) | — | — | JSONata applied to `rows[0]` of childApi (post-`responseTransform`). If result is a non-null object, spread directly onto row (all keys merged). If result is a primitive or array, stored as `{ [columnId]: value }`. Absent = raw `firstRow` spread. |
| `invalidateQueryKeys` | `string[]` | — | — | TQ keys to invalidate after this column's queries all succeed |

### ColumnHydrateNodeOutput

```typescript
{
  descriptors: ColumnHydrateDescriptor[];  // One per (row × column) combination
  columnEntries: ColumnHydrateEntry[];     // Preserved from config for lazy lookups
  rowKeyField: string;
}
```

### ColumnHydrateDescriptor

```typescript
{
  rowKey: string;    // String(row[rowKeyField])
  rowData: GridRow;  // Original root row
  columnId: string;  // Which column this descriptor belongs to
}
```

### DAGTableResult additions (for ToolbarContext)

```typescript
isEnriching: boolean          // true while any rowEnrich query is pending/fetching
isHydrating: boolean          // true while any columnHydrate query is pending/fetching
triggerEnrich?: () => void    // Only present when rowEnrich node has lazy: true
triggerHydrate?: (columnId: string) => void  // Only present when any ColumnHydrateEntry has lazy: true
```

These flow through to `ToolbarContext` so any toolbar command handler can read them via `ctx`.

---

## Real-World Example Reference

`src/features/xen/configs/ca-search.config.ts` — Change Action search table:

**Accurate state of the file (code is ground truth; ignore the misleading file-header comment):**

Two stale comments exist in `ca-search.config.ts` — both are **incorrect** vs the code and must be flagged in the walkthrough:
- File-header comment (lines 17–18): "columnHydrate (lazy) — members-api and proposed-api are gated behind 'Load Details' toolbar button"
- Inline column comment (line 256): "// From columnHydrate (lazy — populated after 'Load Details')"

Neither is accurate — the actual config code has no `lazy: true` on any `ColumnHydrateEntry` and no `triggerHydrate` toolbar command. The combined walkthrough must document what the **code** does, not the comments. Note this discrepancy explicitly (e.g., "Note: comments in the source file describe an intended lazy pattern; the current implementation uses eager hydration for all three columns.").

Accurate behaviour from code:
- `root-api` fetches search results (identifier, relativePath, type only)
- `row-enrich` fires `ca-detail-api` **eagerly** (`lazy` omitted = false) per row → merges name, title, state, description, severity, owner, organization, collabSpace, onHold, estimatedStart, estimatedEnd, actualStart, actualEnd
- `col-hydrate` has **three** `ColumnHydrateEntry` objects: `assignees`, `reviewers`, `proposedChanges` — all with `lazy` omitted (= eager)
  - `assignees` and `reviewers` share `members-api` (different `mergeTransform` per entry)
  - `proposedChanges` uses `proposed-api`; its `mergeTransform` outputs **two fields**: `{ "proposedChanges": proposedChanges, "proposedCount": proposedCount }` — both are merged onto the row
  - A fourth column `proposedCount` (type: `number`, hidden: true) is defined in the column node to display this second field
- `ca-detail-api`, `members-api`, `proposed-api` are lazy nodes (in nodes[], NOT in edges[])
- Edge chain is linear: `root-api → row-enrich → col-hydrate → columns`
- No `triggerHydrate` toolbar command exists in this config — it is a pure eager example

**Note:** The `column-hydrate.md` standalone example must use a different example (from `engEnrichedConfig` in the 2026-03-18 design spec) to demonstrate the `lazy: true` + `triggerHydrate` toolbar pattern, since `ca-search.config.ts` does not use it.
