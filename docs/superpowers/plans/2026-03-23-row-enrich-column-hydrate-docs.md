# RowEnrich + ColumnHydrate Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document the `rowEnrich` and `columnHydrate` DAG node types with full schema tables, annotated examples, and real-world walkthroughs.

**Architecture:** Three new markdown files (standalone guides + combined walkthrough) + surgical updates to four existing reference files. Follows established data-grid docs style: concept → schema tables → annotated examples. Uses `ca-search.config.ts` for eager real-world example; `engEnrichedConfig` from design spec for lazy pattern example.

**Tech Stack:** Markdown, JSONata expressions, TypeScript type examples

---

## Phase 1: Create New Documentation Files

### Task 1: Write `row-enrich.md`

**Files:**
- Create: `src/components/data-grid/docs/05-config-driven-tables/row-enrich.md`

**Content checklist:**
1. H1 title: "Row Enrich"
2. One-paragraph concept explaining eager per-row enrichment + progressive rendering
3. Config Fields table for `RowEnrichNodeConfig` (6 fields: sourceNodeId, childApiNodeId, rowKeyField, lazy, mergeTransform, invalidateQueryKeys)
4. Output type schema block for `RowEnrichNodeOutput` and `RowEnrichDescriptor` (typescript code blocks)
5. "DAG Wiring Rules" section explaining nodes[] vs edges[], sourceNodeId, childApiNodeId convention
6. "JSONata mergeTransform" section with input/output shapes + critical note about post-responseTransform input
7. "Lazy Mode" section explaining `lazy: true` and `triggerEnrich()` toolbar handler pattern
8. "`invalidateQueryKeys`" section explaining TQ v5 useEffect pattern
9. Annotated minimal example config (self-contained, ~20 lines)
10. "See Also" links to combined walkthrough and dag-nodes reference
11. No emoji, no h4+ headings, cross-reference links at bottom

- [ ] **Step 1: Read existing doc style**

Open: `src/components/data-grid/docs/05-config-driven-tables/dag-nodes.md` (lines 1–100) to understand section structure, table format, code block style.

- [ ] **Step 2: Create row-enrich.md with full content**

File content (use schema from spec 2026-03-23):

```markdown
# Row Enrich

**Purpose:** Enrich every root row with supplemental API data in parallel. After the root API loads, trigger a per-row API call for each row and merge the results progressively into the grid.

## Concept

Row enrichment runs **eagerly** (by default) after the root data loads. Each root row triggers one child API call in parallel. Results merge as they arrive — rows display immediately with enriched data filling in progressively.

This is the pattern for: "Fetch list of items (identifier only) → for each item, fetch its full details in parallel → display full details as they arrive."

## Config Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sourceNodeId` | `string` | ✓ | — | ID of `api`, `transform`, or `merge` node whose rows to enrich |
| `childApiNodeId` | `string` | ✓ | — | ID of lazy `api` node (in nodes[], NOT in edges[]) called per row |
| `rowKeyField` | `string` | — | `"id"` | Field on root row used as unique identifier |
| `lazy` | `boolean` | — | `false` | false = fires immediately after root load; true = waits for `triggerEnrich()` |
| `mergeTransform` | `string` (JSONata) | — | — | JSONata applied to `rows[0]` of childApi response before merging |
| `invalidateQueryKeys` | `string[]` | — | — | TanStack Query keys to invalidate after ALL row enrich queries succeed |

## Output

```typescript
interface RowEnrichNodeOutput {
  descriptors: RowEnrichDescriptor[];
  childApiNodeId: string;
  rowKeyField: string;
  lazy: boolean;
  mergeTransform?: string;
  invalidateQueryKeys?: string[];
}

interface RowEnrichDescriptor {
  rowKey: string;       // String(row[rowKeyField])
  rowData: GridRow;     // Original root row (plain data, no NodeContext)
}
```

## DAG Wiring Rules

**Nodes and edges:**
- The `rowEnrich` node itself is in `edges[]` — it executes in the initial DAG wave (eager) or on trigger (lazy)
- The `childApiNodeId` it references is a **lazy node**: listed in `nodes[]` but NOT in `edges[]`
- Lazy nodes execute only when explicitly triggered (inside `useQueries` in the React hook)

**Example edge chain:**
```
edges: [
  { from: "root-api", to: "row-enrich" },
  { from: "row-enrich", to: "columns" }
]
```

## JSONata mergeTransform

**Input:** The first row of the `childApiNodeId` API response, **after that API node's own `responseTransform` has run**.

**Critical detail:** If the child API returns a flat object and its `responseTransform` wraps it in an array (e.g., `[{...}]`), then `mergeTransform` receives the already-shaped object from `rows[0]`.

**Output:** The JSONata result is spread directly onto the root row → all keys become row fields.

**When absent:** The first row of the child API response is spread directly, unchanged.

**Example:**
```typescript
// Child API returns flat: { name: "Alice", department: "Eng", manager: "Bob" }
// Child API responseTransform: `[{...}]` wraps it
// mergeTransform: `{ "fullName": name & " (" & department & ")" }`
// Result merged onto row: row.fullName = "Alice (Eng)"
```

## Lazy Mode

Set `lazy: true` to defer enrichment until the user explicitly triggers it.

**Config:**
```typescript
{
  id: "row-enrich",
  type: "rowEnrich",
  config: {
    sourceNodeId: "root-api",
    childApiNodeId: "detail-api",
    rowKeyField: "id",
    lazy: true,  // Wait for trigger
  }
}
```

**Toolbar handler:**
```typescript
{
  id: "load-details",
  type: "command",
  enabled: true,
  label: "Load Details",
  icon: "RefreshCw",
  handler: async (ctx) => {
    ctx.triggerEnrich?.();  // Available only if lazy: true
  }
}
```

The `triggerEnrich()` function is passed in `ToolbarContext` and exposed by `useDAGTable` only when the rowEnrich node's `lazy` config is true.

## invalidateQueryKeys

After **all** per-row enrichment queries succeed, refetch any TanStack Query keys listed in this array.

**Use case:** After enriching rows, re-fetch the root API to pick up any side-effect changes.

**Example:**
```typescript
{
  id: "row-enrich",
  type: "rowEnrich",
  config: {
    sourceNodeId: "root-api",
    childApiNodeId: "detail-api",
    invalidateQueryKeys: ["my-table"]  // Root API queryKey
  }
}
```

Implementation: TQ v5 `useEffect` checks when all queries for this node succeed, then calls `queryClient.invalidateQueries({ queryKey: [key] })` for each key.

## Annotated Example

```typescript
{
  id: "engineers",
  type: "rowEnrich",
  config: {
    sourceNodeId: "root-api",          // From root-api node
    childApiNodeId: "engineer-detail", // Lazy node, called per row
    rowKeyField: "id",                 // Use row.id as unique key
    lazy: false,                       // Eager (default)
    mergeTransform: `{
      "name": firstName & " " & lastName,
      "email": emailAddress
    }`,
    invalidateQueryKeys: [],
  }
}
```

---

## See Also

- [Column Hydrate](column-hydrate.md) — Lazy per-column hydration pattern
- [RowEnrich + ColumnHydrate Combined](row-enrich-column-hydrate-combined.md) — Real-world walkthrough with ca-search.config.ts
- [DAG Nodes Reference](dag-nodes.md) — All node types
- [JSONata Transforms](jsonata-transforms.md) — Expression syntax
```

- [ ] **Step 3: Verify file exists and is valid markdown**

Run: `ls -la src/components/data-grid/docs/05-config-driven-tables/row-enrich.md`
Expected: File exists, no syntax errors

- [ ] **Step 4: Commit**

```bash
git add src/components/data-grid/docs/05-config-driven-tables/row-enrich.md
git commit -m "docs: add rowEnrich standalone documentation"
```

---

### Task 2: Write `column-hydrate.md`

**Files:**
- Create: `src/components/data-grid/docs/05-config-driven-tables/column-hydrate.md`

**Content checklist:**
1. H1 title: "Column Hydrate"
2. One-paragraph concept: per-column lazy hydration, independent gates
3. Config Fields table for `ColumnHydrateNodeConfig` (3 fields) + **Note: no invalidateQueryKeys at node level**
4. ColumnHydrateEntry fields table (5 fields: columnId, childApiNodeId, lazy, mergeTransform, invalidateQueryKeys)
5. Output schema blocks: `ColumnHydrateNodeOutput`, `ColumnHydrateDescriptor`
6. "DAG Wiring Rules" explaining the per-column gate pattern
7. "Per-Column Lazy Gate" section with example showing one eager, one lazy
8. "mergeTransform Per Column" section explaining object-spread merge (can merge multiple fields)
9. "Toolbar triggerHydrate(columnId) Pattern" section with example handler
10. Annotated minimal example — **use engEnrichedConfig from 2026-03-18 design spec (lines 529–639) as the source**; extract the status column lazy example and simplify
11. "See Also" links
12. No emoji, no h4+ headings

- [ ] **Step 1: Open engEnrichedConfig from design spec**

Path: `docs/superpowers/specs/2026-03-18-row-enrich-column-hydrate-design.md` (lines 529–639)

Extract the `columnHydrate` node config and the "Load Status" toolbar command as your example.

- [ ] **Step 2: Create column-hydrate.md with full content**

File content:

```markdown
# Column Hydrate

**Purpose:** Hydrate per-column cell data from independent API calls, with per-column lazy gates. Useful for "load-on-demand" patterns where some columns are expensive to fetch.

## Concept

Column hydration allows each column to be hydrated independently:
- Some columns fire immediately (eager, default)
- Other columns wait until the user triggers them (lazy, via toolbar button)

This is the pattern for: "Display basic info immediately, but only fetch expensive columns (members, statuses, proposed changes) when the user clicks 'Load Details'."

## Config Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `sourceNodeId` | `string` | ✓ | — | ID of `api`, `transform`, or `merge` node whose rows to hydrate |
| `rowKeyField` | `string` | — | `"id"` | Field on root row used as unique identifier |
| `columns` | `ColumnHydrateEntry[]` | ✓ | — | Per-column hydration config array |

**Note:** `ColumnHydrateNodeConfig` has **no** `invalidateQueryKeys` field. Invalidation is per-column on each `ColumnHydrateEntry`.

## ColumnHydrateEntry (Per-Column Config)

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `columnId` | `string` | ✓ | — | Must match a `field` in the ColumnNode of the same DAG |
| `childApiNodeId` | `string` | ✓ | — | ID of lazy `api` node (in nodes[], NOT in edges[]) |
| `lazy` | `boolean` | — | `false` | false = fires with root load; true = waits for `triggerHydrate(columnId)` |
| `mergeTransform` | `string` (JSONata) | — | — | JSONata applied to `rows[0]` of childApi response. If result is a non-null object, spread directly (can merge multiple fields). If primitive/array, stored as `{ [columnId]: value }`. |
| `invalidateQueryKeys` | `string[]` | — | — | TQ keys to invalidate after this column's queries all succeed |

## Output

```typescript
interface ColumnHydrateNodeOutput {
  descriptors: ColumnHydrateDescriptor[];
  columnEntries: ColumnHydrateEntry[];
  rowKeyField: string;
}

interface ColumnHydrateDescriptor {
  rowKey: string;       // String(row[rowKeyField])
  rowData: GridRow;     // Original root row
  columnId: string;     // Which column this descriptor belongs to
}
```

## DAG Wiring Rules

**Nodes and edges:**
- The `columnHydrate` node is in `edges[]` — executes in the initial DAG wave
- Each `childApiNodeId` it references is a **lazy node**: in `nodes[]` but NOT in `edges[]`
- The `sourceNodeId` points to the root API/transform, not to `rowEnrich` (independent source)

**Example edge chain:**
```
edges: [
  { from: "root-api", to: "row-enrich" },
  { from: "root-api", to: "column-hydrate" },  // Both source from root
  { from: "row-enrich", to: "columns" },
  { from: "column-hydrate", to: "columns" }
]
```

Data flow: root-api provides rows → both row-enrich and column-hydrate source from root-api independently → both merge results to final rows.

## Per-Column Lazy Gate

Each column can be independently eager or lazy. Example:

```typescript
{
  id: "col-hydrate",
  type: "columnHydrate",
  config: {
    sourceNodeId: "root-api",
    rowKeyField: "id",
    columns: [
      {
        columnId: "summary",
        childApiNodeId: "summary-api",
        lazy: false,  // Eager — fires immediately
      },
      {
        columnId: "status",
        childApiNodeId: "status-api",
        lazy: true,   // Lazy — waits for triggerHydrate('status')
      },
    ]
  }
}
```

## mergeTransform Per Column

**Input:** First row of the childApi response (post-`responseTransform`).

**Merge behaviour:**
- If transform result (or raw row) is a **non-null object** → spread all keys directly onto the row
  - Example: `mergeTransform: "{ proposedCount: $count(changes), proposedList: changes }"` → both `proposedCount` and `proposedList` become row fields
- If result is a **primitive or array** → stored as `{ [columnId]: value }`
  - Example: `mergeTransform: "$count(items)"` → stored as `{ status: 42 }`

**When absent:** Raw first row is spread directly.

This design allows one `ColumnHydrateEntry` to hydrate multiple columns by returning an object with multiple keys.

## Toolbar triggerHydrate(columnId) Pattern

Set `lazy: true` on columns you want to gate behind a toolbar button.

**Toolbar handler:**
```typescript
{
  id: "load-status",
  type: "command",
  enabled: true,
  label: "Load Status",
  icon: "RefreshCw",
  handler: async (ctx) => {
    ctx.triggerHydrate?.('status');  // Load the 'status' column
  }
}
```

The `triggerHydrate` function is passed in `ToolbarContext` and available only when at least one `ColumnHydrateEntry` has `lazy: true`.

## Annotated Example

Simplified from `engEnrichedConfig` pattern (see 2026-03-18 design spec for full example):

```typescript
{
  id: "col-hydrate",
  type: "columnHydrate",
  config: {
    sourceNodeId: "root-api",
    rowKeyField: "id",
    columns: [
      {
        columnId: "owner",
        childApiNodeId: "owner-api",
        lazy: false,  // Eager
        mergeTransform: `{ "owner": owner.login }`
      },
      {
        columnId: "status",
        childApiNodeId: "status-api",
        lazy: true,   // Lazy — triggered by toolbar
        mergeTransform: `value`
      }
    ]
  }
}
```

---

## See Also

- [Row Enrich](row-enrich.md) — Eager per-row enrichment pattern
- [RowEnrich + ColumnHydrate Combined](row-enrich-column-hydrate-combined.md) — Real-world walkthrough with ca-search.config.ts
- [DAG Nodes Reference](dag-nodes.md) — All node types
- [JSONata Transforms](jsonata-transforms.md) — Expression syntax
```

- [ ] **Step 3: Verify file exists and is valid markdown**

Run: `ls -la src/components/data-grid/docs/05-config-driven-tables/column-hydrate.md`
Expected: File exists, no syntax errors

- [ ] **Step 4: Commit**

```bash
git add src/components/data-grid/docs/05-config-driven-tables/column-hydrate.md
git commit -m "docs: add columnHydrate standalone documentation"
```

---

### Task 3: Write `row-enrich-column-hydrate-combined.md`

**Files:**
- Create: `src/components/data-grid/docs/05-config-driven-tables/row-enrich-column-hydrate-combined.md`

**Content checklist:**
1. H1 title: "RowEnrich + ColumnHydrate Combined"
2. ASCII architecture diagram showing linear edge chain + lazy nodes floating outside
3. Brief intro explaining the ca-search.config.ts pattern
4. **Section: "The Real-World Config (ca-search.config.ts)"**
   - Full annotated config with inline comments on every DAG section (api, row-enrich, col-hydrate, columns, lazy nodes)
   - Highlight proposedCount multi-field merge behavior
5. **Section: "Data Flow Narrative"**
   - What fires eagerly (root-api, row-enrich, col-hydrate columns — all eager in this example)
   - Progressive rendering timeline
6. **IMPORTANT FLAG: "Note on Stale Comments"**
   - File-header comments (lines 17–18) and inline comments (line 256) claim lazy/toolbar-gated behavior
   - Actual code uses eager hydration
   - Explain the discrepancy
7. **Section: "ToolbarContext: isEnriching, isHydrating, triggerHydrate"**
   - Explain the loading state flags
   - Show how a custom toolbar command can call `ctx.triggerHydrate?.('columnId')`
8. **Section: "Decision Guide"**
   - Table: when to use rowEnrich vs columnHydrate vs merge node
9. **Section: "Next Steps"**
   - Link to standalone row-enrich.md and column-hydrate.md for pattern variations
10. No emoji, no h4+ headings

- [ ] **Step 1: Extract ca-search.config.ts from file system**

Read: `src/features/xen/configs/ca-search.config.ts` (lines 35–325)

- [ ] **Step 2: Create combined.md with annotated config**

File content:

```markdown
# RowEnrich + ColumnHydrate Combined

Learn how row enrichment and column hydration work together in a real-world example: the Change Action search table.

## Architecture Diagram

**Topology A: Linear Chain (used by ca-search.config.ts)**

```
Initial DAG Wave:
  root-api
    ↓
  row-enrich
    ↓
  col-hydrate
    ↓
  columns

Lazy Nodes (float outside edges):
  ca-detail-api    ← called by row-enrich per row
  members-api      ← called by col-hydrate per row
  proposed-api     ← called by col-hydrate per row
```

**Topology B: Alternative Fan-Out (both source from root independently)**

```
Initial DAG Wave:
  root-api
    ├─→ row-enrich ─┐
    └─→ col-hydrate ┤
                    ↓
                 columns
```

**Key Insight:** In **both topologies**, `col-hydrate` node's `sourceNodeId` points to `root-api`, NOT to `row-enrich`. The edge chain controls **execution order** (wave 1, wave 2, etc.), but `sourceNodeId` controls the **data source** (which rows are read for hydration). This means column hydration always operates on root rows, not enriched rows, regardless of edge topology.

## The Real-World Config (ca-search.config.ts)

Below is the complete `caSearchConfig` with annotations explaining each section.

### Root API: Fetch Search Results

```typescript
// Root API returns: { changeAction: [{ identifier, relativePath, source, type }] }
// We keep only identifier + type; everything else comes via rowEnrich.
{
  id: "root-api",
  type: "api",
  config: {
    url: "/resources/v1/modeler/dslc/changeaction/search",
    method: "GET",
    authAdapterId: "wafdata",
    queryParams: {
      $searchStr: '$:$params.searchStr ?? ""',
      $top: "50",
      $skip: '$:$exists($params.cursor) ? $params.cursor : "0"',
    },
    paginationConfig: {
      type: "offset",
      pageParam: "$skip",
      pageSizeParam: "$top",
    },
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
    },
    // Extract only identifier + relativePath + type from the changeAction array.
    // All other fields (name, title, state, etc.) are fetched by rowEnrich below.
    responseTransform: `
      changeAction.{
        "identifier":   identifier,
        "relativePath": relativePath,
        "type":         type
      }
    `,
  },
},
```

### Row Enrichment: Fetch Full Details Eagerly

```typescript
// Eager enrichment: ca-detail-api fires immediately after root-api for every row.
// Merges: name, title, state, description, severity, owner, organization, etc.
{
  id: "row-enrich",
  type: "rowEnrich",
  config: {
    sourceNodeId: "root-api",
    childApiNodeId: "ca-detail-api",
    rowKeyField: "identifier",
    lazy: false,  // Eager — fires immediately
    mergeTransform: `{
      "name":           name,
      "title":          title,
      "state":          state,
      "description":    description,
      "severity":       severity,
      "owner":          owner,
      "organization":   organization,
      "collabSpace":    collabSpace,
      "onHold":         onHold,
      "estimatedStart": estimatedStart,
      "estimatedEnd":   estimatedEnd,
      "actualStart":    actualStart,
      "actualEnd":      actualEnd
    }`,
  },
},
```

### Column Hydration: Fetch Members & Proposed Changes (Eagerly in This Config)

```typescript
// Column hydration with per-column gates. In THIS config, all columns are eager.
// (The standalone column-hydrate.md shows lazy: true examples.)
{
  id: "col-hydrate",
  type: "columnHydrate",
  config: {
    sourceNodeId: "root-api",  // Sources from root, not row-enrich
    rowKeyField: "identifier",
    columns: [
      {
        columnId: "assignees",
        childApiNodeId: "members-api",
        lazy: false,  // Eager
        mergeTransform: `{ "assignees": assignees }`
      },
      {
        columnId: "reviewers",
        childApiNodeId: "members-api",
        lazy: false,  // Eager
        mergeTransform: `{ "reviewers": reviewers }`
      },
      {
        columnId: "proposedChanges",
        childApiNodeId: "proposed-api",
        lazy: false,  // Eager
        // NOTE: This mergeTransform returns TWO fields!
        // They are spread directly onto the row (see "mergeTransform Multi-Field Spread" below).
        mergeTransform: `{ "proposedChanges": proposedChanges, "proposedCount": proposedCount }`
      }
    ]
  },
},
```

### Lazy API Nodes: Not in edges[], called on demand

```typescript
// ca-detail-api: Fetch full change action details (name, title, state, etc.)
// Called once per row during row enrichment.
{
  id: "ca-detail-api",
  type: "api",
  config: {
    url: '$:"/resources/v1/modeler/dslc/changeaction/" & $row.identifier',
    method: "GET",
    authAdapterId: "wafdata",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    responseTransform: `[{
      "name": name,
      "title": title,
      "state": state,
      "description": description,
      "severity": severity,
      "owner": owner,
      "organization": organization,
      "collabSpace": collabSpace,
      "onHold": onHold,
      "estimatedStart": $.\"Estimated Start Date\",
      "estimatedEnd": $.\"Estimated Completion Date\",
      "actualStart": $.\"Actual Start Date\",
      "actualEnd": $.\"Actual Completion Date\"
    }]`,
  },
},

// members-api: Fetch assignees, reviewers, followers.
// Called once per row during column hydration (assignees, reviewers columns).
{
  id: "members-api",
  type: "api",
  config: {
    url: '$:"/resources/v1/modeler/dslc/changeaction/" & $row.identifier',
    method: "GET",
    authAdapterId: "wafdata",
    queryParams: { $fields: "members" },
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    responseTransform: `[{
      "assignees":  $join(members.assignees, \", \"),
      "reviewers":  $join(members.reviewers, \", \"),
      "followers":  $join(members.followers, \", \")
    }]`,
  },
},

// proposed-api: Fetch proposed changes (count, status, targets).
// Called once per row during column hydration (proposedChanges column).
{
  id: "proposed-api",
  type: "api",
  config: {
    url: '$:"/resources/v1/modeler/dslc/changeaction/" & $row.identifier',
    method: "GET",
    authAdapterId: "wafdata",
    queryParams: { $fields: "proposedChanges" },
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    responseTransform: `[{
      "proposedCount": $count(proposedChanges),
      "proposedChanges": $join(
        proposedChanges.(status & \" → \" & where.type),
        \" | \"
      )
    }]`,
  },
},
```

### Column Definitions

```typescript
// Column node references all fields: root, enriched, and hydrated.
// The proposedCount field (hidden by default) is populated by col-hydrate's
// proposedChanges entry, which returns TWO keys (see "Multi-Field Merge" below).
{
  id: "columns",
  type: "column",
  config: {
    columns: [
      { field: "type",         header: "Type",          sortable: true },
      { field: "identifier",   header: "ID",            hidden: true },

      // From rowEnrich (ca-detail-api)
      { field: "name",         header: "Name",          sortable: true, filterable: true },
      { field: "title",        header: "Title",         sortable: true, filterable: true },
      { field: "state",        header: "State",         renderType: "badge" },
      { field: "severity",     header: "Severity" },
      { field: "owner",        header: "Owner" },
      { field: "organization", header: "Organization" },
      { field: "collabSpace",  header: "Collab Space" },
      { field: "description",  header: "Description" },
      { field: "estimatedStart", header: "Est. Start",  type: "date" },
      { field: "estimatedEnd",   header: "Est. End",    type: "date" },
      { field: "actualStart",    header: "Act. Start",  type: "date", hidden: true },
      { field: "actualEnd",      header: "Act. End",    type: "date", hidden: true },
      { field: "onHold",       header: "On Hold",       type: "boolean" },

      // From col-hydrate (members-api, proposed-api)
      { field: "assignees",       header: "Assignees",        hidden: false },
      { field: "reviewers",       header: "Reviewers",        hidden: false },
      { field: "proposedChanges", header: "Proposed Changes", hidden: false },
      { field: "proposedCount",   header: "# Proposed",       type: "number", hidden: true },
    ],
  },
}
```

### Edge Chain

```typescript
edges: [
  { from: "root-api",    to: "row-enrich" },
  { from: "row-enrich",  to: "col-hydrate" },
  { from: "col-hydrate", to: "columns" },
],

rootNodeId: "columns",
```

---

## Data Flow Narrative

**Execution Timeline:**

1. **User loads table** → DAG engine executes initial wave
2. **Wave 0:** root-api fetches search results (identifier, type only)
   - Result: `rows = [{ identifier: "CA-123", type: "Change" }, ...]`
3. **Wave 1:** row-enrich node executes
   - Descriptor loop: create one descriptor per root row
   - `useQueries` in React: trigger ca-detail-api in parallel for each row
   - As responses arrive: merge enriched fields (name, title, state, etc.) into rows progressively
   - Grid displays identifiers immediately, name/title fill in as requests complete
4. **Wave 1:** col-hydrate node executes (parallel to rowEnrich in React)
   - Descriptor loop: create one descriptor per (root row × hydrated column)
   - `useQueries`: trigger members-api and proposed-api per row in parallel
   - All three columns (assignees, reviewers, proposedChanges) are eager (`lazy` omitted = false)
   - As responses arrive: merge member/proposed data into rows
5. **Wave 2:** columns node executes
   - Render final column definitions with all data merged in

**Progressive Rendering Key:** Root rows display immediately with identifiers. Enriched fields (name, title, owner) appear as row-enrich queries resolve. Hydrated fields (assignees, reviewers, proposedChanges) appear as col-hydrate queries resolve. No stall — rows visible at each stage.

---

## mergeTransform Multi-Field Spread Behavior

**Key Feature:** A single `ColumnHydrateEntry` can merge **multiple fields** onto the root row.

In ca-search.config.ts, the `proposedChanges` column hydrate entry is configured with:
```typescript
{
  columnId: "proposedChanges",
  childApiNodeId: "proposed-api",
  mergeTransform: `{ "proposedChanges": proposedChanges, "proposedCount": proposedCount }`
}
```

The `mergeTransform` returns a **non-null object** with TWO keys. The merge logic in `use-dag-table.ts` detects this and spreads **both keys** directly onto the row:
- `row.proposedChanges` = the summary string
- `row.proposedCount` = the count number (3 in this example)

Then in the column definitions, there are **two columns** reading these fields:
- `proposedChanges` column (visible header: "Proposed Changes")
- `proposedCount` column (type: number, hidden: true by default)

This demonstrates the power of column hydration: **one API call, one column entry, multiple result fields**. The design avoids redundant API calls by allowing a single hydration step to populate multiple columns simultaneously.

---

## Note on Stale Comments

The source file `ca-search.config.ts` contains misleading comments:

**File-header comment (lines 17–18):**
> "columnHydrate (lazy) — members-api and proposed-api are gated behind 'Load Details' toolbar button"

**Inline column comment (line 256):**
> "// From columnHydrate (lazy — populated after 'Load Details')"

**ACTUAL BEHAVIOR:** The `columnHydrate` columns in this config have `lazy` **omitted** (= false = eager). There is no "Load Details" toolbar command. All three columns (assignees, reviewers, proposedChanges) load immediately with the root data.

These comments describe an **intended future pattern**, not the current state. The standalone `column-hydrate.md` guide shows how to implement the lazy/toolbar-gated pattern with `lazy: true`.

---

## ToolbarContext: isEnriching, isHydrating, triggerHydrate

The table engine exposes loading state and trigger functions via `ToolbarContext` (passed to toolbar command handlers):

```typescript
interface ToolbarContext {
  isEnriching: boolean           // true while any rowEnrich query is pending
  isHydrating: boolean           // true while any columnHydrate query is pending
  triggerEnrich?: () => void     // Only if rowEnrich node has lazy: true
  triggerHydrate?: (columnId: string) => void  // Only if any ColumnHydrateEntry has lazy: true
  // ... other fields (data, columns, mode, etc.)
}
```

**Example: Custom toolbar command that triggers lazy hydration**

```typescript
{
  id: "load-status",
  type: "command",
  enabled: true,
  label: "Load Status",
  icon: "RefreshCw",
  handler: async (ctx) => {
    // Show spinner while loading
    if (ctx.isHydrating) return;

    // Trigger hydration of the 'status' column
    ctx.triggerHydrate?.('status');
  }
}
```

**Example: Conditional command availability based on loading**

```typescript
{
  id: "refresh-enriched",
  type: "command",
  enabled: true,
  label: "Refresh Enrichment",
  icon: "RefreshCw",
  handler: async (ctx) => {
    // Only clickable when not already enriching
    if (ctx.isEnriching) return;
    ctx.triggerEnrich?.();
  }
}
```

---

## Decision Guide: rowEnrich vs columnHydrate vs Merge Node

| Pattern | Use rowEnrich | Use columnHydrate | Use merge node |
|---------|---|---|---|
| **Eager: fetch extra fields for all rows immediately** | ✓ Enrich all rows with full details in parallel | — | Or merge two eager APIs |
| **Lazy: user clicks "Load Details"** | Set `lazy: true` | Set `lazy: true` on column | — |
| **Multiple details per row (assignees, reviewers)** | ✓ Each row makes one call, mergeTransform extracts multiple fields | ✓ Each column makes its own call | — |
| **Combine two root API sources (users + projects)** | — | — | ✓ concat/join two APIs |
| **Expensive calculation per row (statistics, ML inference)** | ✓ Lazy mode defers until needed | — | — |
| **Real-time updates (polling / WebSocket)** | Not designed for it | Not designed for it | — |

---

## Next Steps

- **Learn row enrichment patterns:** [Row Enrich](row-enrich.md)
- **Learn column hydration patterns:** [Column Hydrate](column-hydrate.md)
- **See all DAG node types:** [DAG Nodes Reference](dag-nodes.md)
- **Learn JSONata expressions:** [JSONata Transforms](jsonata-transforms.md)
```

- [ ] **Step 3: Verify file exists and is valid markdown**

Run: `ls -la src/components/data-grid/docs/05-config-driven-tables/row-enrich-column-hydrate-combined.md`
Expected: File exists, no syntax errors

- [ ] **Step 4: Commit**

```bash
git add src/components/data-grid/docs/05-config-driven-tables/row-enrich-column-hydrate-combined.md
git commit -m "docs: add rowEnrich + columnHydrate combined walkthrough with ca-search.config.ts"
```

---

## Phase 2: Update Existing Reference Files

### Task 4: Update `dag-nodes.md`

**Files:**
- Modify: `src/components/data-grid/docs/05-config-driven-tables/dag-nodes.md`

**Changes needed:**
1. Opening sentence: "Complete reference for all six node types." → "Complete reference for all eight node types."
2. Add `rowEnrich` section after Action Node section (lines ~400)
3. Add `columnHydrate` section after rowEnrich section
4. Update "Full Node Type Reference" table at bottom (add two rows)

- [ ] **Step 1: Read existing dag-nodes.md**

Read: `src/components/data-grid/docs/05-config-driven-tables/dag-nodes.md` (lines 1–50 and lines 403–432)

- [ ] **Step 2: Update opening sentence (line 3)**

Replace: "Complete reference for all six node types."
With: "Complete reference for all eight node types."

- [ ] **Step 3: Add rowEnrich section**

Insert after the "## Action Node" section (after line ~400), before the "## Full Node Type Reference" section:

```markdown
---

## RowEnrich Node

**Purpose:** Enrich every root row with supplemental API data. Each row triggers one child API call in parallel; results merge progressively as they arrive.

### Config Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceNodeId` | `string` | ✓ | ID of `api`, `transform`, or `merge` node whose rows to enrich |
| `childApiNodeId` | `string` | ✓ | ID of lazy `api` node (in nodes[], NOT in edges[]) |
| `rowKeyField` | `string` | — | Field name used as unique key (default: `"id"`) |
| `lazy` | `boolean` | — | false = eager; true = waits for `triggerEnrich()` (default: `false`) |
| `mergeTransform` | `string` (JSONata) | — | JSONata applied to first row of childApi response |
| `invalidateQueryKeys` | `string[]` | — | TQ keys to invalidate after all row enrich queries succeed |

### Output

```typescript
{
  descriptors: RowEnrichDescriptor[];
  childApiNodeId: string;
  rowKeyField: string;
  lazy: boolean;
  mergeTransform?: string;
  invalidateQueryKeys?: string[];
}
```

### Example: Eager Enrichment

```typescript
{
  id: "row-enrich",
  type: "rowEnrich",
  config: {
    sourceNodeId: "root-api",
    childApiNodeId: "detail-api",
    rowKeyField: "id",
    lazy: false,
    mergeTransform: `{ "owner": owner.login, "status": $uppercase(state) }`,
  },
},

{
  id: "detail-api",  // Lazy node
  type: "api",
  config: {
    url: '$:"/api/items/" & $row.id',
    method: "GET",
    authAdapterId: "wafdata",
  },
}
```

When a user loads the table, row-enrich fires after root-api and calls detail-api once per root row in parallel. As responses arrive, the mergeTransform output is spread onto each root row.

---

## ColumnHydrate Node

**Purpose:** Hydrate per-column cell data from independent API calls, with per-column lazy gates.

### Config Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceNodeId` | `string` | ✓ | ID of `api`, `transform`, or `merge` node whose rows to hydrate |
| `rowKeyField` | `string` | — | Field name used as unique key (default: `"id"`) |
| `columns` | `ColumnHydrateEntry[]` | ✓ | Array of per-column hydration configs |

### ColumnHydrateEntry (Per-Column)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `columnId` | `string` | ✓ | Must match a `field` in the ColumnNode |
| `childApiNodeId` | `string` | ✓ | ID of lazy `api` node (in nodes[], NOT in edges[]) |
| `lazy` | `boolean` | — | false = eager; true = waits for `triggerHydrate(columnId)` (default: `false`) |
| `mergeTransform` | `string` (JSONata) | — | JSONata applied to first row of childApi. If result is a non-null object, spread directly (can merge multiple fields) |
| `invalidateQueryKeys` | `string[]` | — | TQ keys to invalidate after this column's queries all succeed |

### Output

```typescript
{
  descriptors: ColumnHydrateDescriptor[];
  columnEntries: ColumnHydrateEntry[];
  rowKeyField: string;
}
```

### Example: Mixed Eager and Lazy

```typescript
{
  id: "col-hydrate",
  type: "columnHydrate",
  config: {
    sourceNodeId: "root-api",
    rowKeyField: "id",
    columns: [
      {
        columnId: "members",
        childApiNodeId: "members-api",
        lazy: false,  // Eager — load immediately
        mergeTransform: `$join(members, ", ")`
      },
      {
        columnId: "status",
        childApiNodeId: "status-api",
        lazy: true,   // Lazy — wait for triggerHydrate('status')
        mergeTransform: `state`
      }
    ]
  },
},

{
  id: "members-api",  // Lazy node
  type: "api",
  config: {
    url: '$:"/api/items/" & $row.id & "/members"',
    method: "GET",
    authAdapterId: "wafdata",
  },
},

{
  id: "status-api",   // Lazy node
  type: "api",
  config: {
    url: '$:"/api/items/" & $row.id & "/status"',
    method: "GET",
    authAdapterId: "wafdata",
  },
}
```

The `members` column loads immediately; the `status` column waits until the user calls `ctx.triggerHydrate?.('status')` from a toolbar command.

---
```

- [ ] **Step 4: Update Full Node Type Reference table**

Find the "Full Node Type Reference" section (currently line ~403), update from 6 rows to 8 rows. Add:

```markdown
| **rowEnrich** | Yes (if in edges) | Yes (via `triggerEnrich()`) | `RowEnrichNodeOutput` | Enrich every root row via per-row API call (eager or trigger-gated) |
| **columnHydrate** | Yes (if in edges) | Yes (per-column via `triggerHydrate(columnId)`) | `ColumnHydrateNodeOutput` | Hydrate per-column cells from independent API calls (per-column lazy gate) |
```

- [ ] **Step 5: Verify no broken markdown**

Run: `grep -n "^## " src/components/data-grid/docs/05-config-driven-tables/dag-nodes.md | head -20`
Expected: All section headers visible, no duplicates

- [ ] **Step 6: Commit**

```bash
git add src/components/data-grid/docs/05-config-driven-tables/dag-nodes.md
git commit -m "docs: add rowEnrich and columnHydrate sections to dag-nodes.md"
```

---

### Task 5: Update `config-api-reference.md`

**Files:**
- Modify: `src/components/data-grid/docs/05-config-driven-tables/config-api-reference.md`

**Changes needed:**
1. Insert `RowEnrichNode` section after `ActionNode` section
2. Insert `ColumnHydrateNode` section after `RowEnrichNode` section
3. Update `DAGConfig` table: `nodes` field description to include rowEnrich, columnHydrate

- [ ] **Step 1: Read existing config-api-reference.md structure**

Read: `src/components/data-grid/docs/05-config-driven-tables/config-api-reference.md` (look for ActionNode section and DAGConfig table)

- [ ] **Step 2: Add RowEnrichNode section**

Insert after the ActionNode section:

```markdown
### RowEnrichNode

```typescript
{
  id: string;
  type: "rowEnrich";
  config: RowEnrichNodeConfig;
}
```

**RowEnrichNodeConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceNodeId` | `string` | ✓ | ID of `api`, `transform`, or `merge` node whose rows to enrich |
| `childApiNodeId` | `string` | ✓ | ID of lazy `api` node (in nodes[], NOT in edges[]) |
| `rowKeyField` | `string` | — | Field name used as unique key (default: `"id"`) |
| `lazy` | `boolean` | — | false = eager; true = waits for trigger (default: `false`) |
| `mergeTransform` | `string` (JSONata) | — | Applied to first row of childApi response before merging |
| `invalidateQueryKeys` | `string[]` | — | TQ keys to invalidate after all row enrich queries succeed |

**RowEnrichNodeOutput:**

```typescript
{
  descriptors: RowEnrichDescriptor[];
  childApiNodeId: string;
  rowKeyField: string;
  lazy: boolean;
  mergeTransform?: string;
  invalidateQueryKeys?: string[];
}
```

---

### ColumnHydrateNode

```typescript
{
  id: string;
  type: "columnHydrate";
  config: ColumnHydrateNodeConfig;
}
```

**ColumnHydrateNodeConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceNodeId` | `string` | ✓ | ID of `api`, `transform`, or `merge` node whose rows to hydrate |
| `rowKeyField` | `string` | — | Field name used as unique key (default: `"id"`) |
| `columns` | `ColumnHydrateEntry[]` | ✓ | Array of per-column hydration configs |

**ColumnHydrateEntry:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `columnId` | `string` | ✓ | Must match a `field` in the ColumnNode |
| `childApiNodeId` | `string` | ✓ | ID of lazy `api` node (in nodes[], NOT in edges[]) |
| `lazy` | `boolean` | — | false = eager; true = waits for trigger (default: `false`) |
| `mergeTransform` | `string` (JSONata) | — | Applied to first row of childApi; if result is non-null object, spread directly |
| `invalidateQueryKeys` | `string[]` | — | TQ keys to invalidate after this column's queries succeed |

**ColumnHydrateNodeOutput:**

```typescript
{
  descriptors: ColumnHydrateDescriptor[];
  columnEntries: ColumnHydrateEntry[];
  rowKeyField: string;
}
```

---
```

- [ ] **Step 3: Update DAGConfig.nodes field**

Find the `DAGConfig` table (near the top), locate the `nodes` field description.

Replace: "All nodes: api, transform, column, merge, rowExpand, action. Includes lazy nodes."
With: "All nodes: api, transform, column, merge, rowExpand, action, rowEnrich, columnHydrate. Includes lazy nodes."

- [ ] **Step 4: Verify markdown syntax**

Run: `grep -A 5 "### RowEnrichNode" src/components/data-grid/docs/05-config-driven-tables/config-api-reference.md`
Expected: Section header and first table visible

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/docs/05-config-driven-tables/config-api-reference.md
git commit -m "docs: add RowEnrichNode and ColumnHydrateNode schemas to config-api-reference.md"
```

---

### Task 6: Update `config-basics.md`

**Files:**
- Modify: `src/components/data-grid/docs/05-config-driven-tables/config-basics.md`

**Changes needed:**
1. "Six Node Types" → "Eight Node Types" (multiple places)
2. Update DAG model table to include rowEnrich and columnHydrate rows

- [ ] **Step 1: Read existing config-basics.md**

Read: `src/components/data-grid/docs/05-config-driven-tables/config-basics.md` (lines 1–60)

- [ ] **Step 2: Update heading**

Find: "### Six Node Types"
Replace with: "### Eight Node Types"

Find: "| Type | Purpose | Example |" table (lines ~32–40)
Add two rows:

```markdown
| **rowEnrich** | Enrich every root row via per-row API call | `GET /api/items/{id}/details`, merge results |
| **columnHydrate** | Hydrate per-column cells from independent API calls | Members column, status column with per-column lazy gates |
```

- [ ] **Step 3: Update prose reference**

Find any text like "all six node types" and replace with "all eight node types" (use grep to find all occurrences)

Run: `grep -n "six node types" src/components/data-grid/docs/05-config-driven-tables/config-basics.md`

Replace all matches with "eight node types".

- [ ] **Step 4: Verify changes**

Run: `grep -n "Eight Node Types" src/components/data-grid/docs/05-config-driven-tables/config-basics.md`
Expected: Section header updated

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/docs/05-config-driven-tables/config-basics.md
git commit -m "docs: update config-basics.md to reference 8 node types instead of 6"
```

---

### Task 7: Update `README.md`

**Files:**
- Modify: `src/components/data-grid/docs/README.md`

**Changes needed:**
1. Update DAG Nodes Reference link description (line ~74)
2. Add three new doc links in Scenarios & Examples section (after actions.md, before config-api-reference.md)

- [ ] **Step 1: Read existing README.md**

Read: `src/components/data-grid/docs/README.md` (lines 70–90)

- [ ] **Step 2: Update DAG Nodes Reference link**

Find: `[DAG Nodes Reference](05-config-driven-tables/dag-nodes.md) — All 6 node types (api, transform, column, merge, rowExpand, action)`
Replace with: `[DAG Nodes Reference](05-config-driven-tables/dag-nodes.md) — All 8 node types (api, transform, column, merge, rowExpand, action, rowEnrich, columnHydrate)`

- [ ] **Step 3: Add three new doc links**

Find the line: `- [Actions](05-config-driven-tables/actions.md) — Row/cell buttons, lazy APIs, visibility/disabled rules`

Insert immediately after:
```markdown
- [Row Enrich](05-config-driven-tables/row-enrich.md) — Eager per-row API enrichment, progressive rendering
- [Column Hydrate](05-config-driven-tables/column-hydrate.md) — Per-column lazy hydration, toolbar-triggered
- [RowEnrich + ColumnHydrate Combined](05-config-driven-tables/row-enrich-column-hydrate-combined.md) — Real-world walkthrough with ca-search.config.ts
```

- [ ] **Step 4: Verify links are valid markdown**

Run: `grep -n "Row Enrich\|Column Hydrate" src/components/data-grid/docs/README.md`
Expected: Three new lines visible

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/docs/README.md
git commit -m "docs: add navigation links for rowEnrich and columnHydrate docs in README.md"
```

---

## Summary

**Files created:**
- `src/components/data-grid/docs/05-config-driven-tables/row-enrich.md`
- `src/components/data-grid/docs/05-config-driven-tables/column-hydrate.md`
- `src/components/data-grid/docs/05-config-driven-tables/row-enrich-column-hydrate-combined.md`

**Files modified:**
- `src/components/data-grid/docs/05-config-driven-tables/dag-nodes.md`
- `src/components/data-grid/docs/05-config-driven-tables/config-api-reference.md`
- `src/components/data-grid/docs/05-config-driven-tables/config-basics.md`
- `src/components/data-grid/docs/README.md`

**Total commits:** 7 (one per task)
**Total time estimate:** ~60 minutes (10 min per task, parallelizable)

---

## Success Criteria

- [ ] All 3 new markdown files exist and render without errors
- [ ] All 4 updated files have correct changes and no broken markdown
- [ ] Links between docs work (cross-references are correct)
- [ ] DAG Nodes Reference table has 8 rows (not 6)
- [ ] README.md navigation section includes all three new docs
- [ ] No conflicts with existing content
- [ ] All commits are clean (no unstaged changes)
