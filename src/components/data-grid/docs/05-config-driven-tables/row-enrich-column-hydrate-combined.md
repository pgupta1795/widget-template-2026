# RowEnrich + ColumnHydrate Combined

Learn how row enrichment and column hydration work together in a real-world example: the Change Action search table.

## Architecture Diagram

**Topology A: Linear Chain (used by ca-search.config.ts)**

```
Initial DAG Wave (nodes in edges[]):
  root-api
    ↓
  row-enrich
    ↓
  col-hydrate
    ↓
  columns

Lazy Nodes (in nodes[], NOT in edges[]):
  ca-detail-api    ← called by row-enrich per row
  members-api      ← called by col-hydrate per row
  proposed-api     ← called by col-hydrate per row
```

**Topology B: Alternative Fan-Out (both source from root independently)**

```
Initial DAG Wave (nodes in edges[]):
  root-api
    ├─→ row-enrich ─┐
    └─→ col-hydrate ┤
                    ↓
                 columns

Lazy Nodes (in nodes[], NOT in edges[]):
  ca-detail-api, members-api, proposed-api
```

**Key Insight:** In **both topologies**, `col-hydrate` node's `sourceNodeId` points to `root-api`, NOT to `row-enrich`.

The edge chain controls **execution order** (wave 1, wave 2, etc.), but `sourceNodeId` controls the **data source** (which rows are read for hydration). This means column hydration always operates on root rows, not enriched rows, regardless of edge topology.

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
// Column hydration supports per-column lazy gates. In THIS config, all columns are eager.
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
      "estimatedStart": $."Estimated Start Date",
      "estimatedEnd": $."Estimated Completion Date",
      "actualStart": $."Actual Start Date",
      "actualEnd": $."Actual Completion Date"
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
      "assignees":  $join(members.assignees, ", "),
      "reviewers":  $join(members.reviewers, ", "),
      "followers":  $join(members.followers, ", ")
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
        proposedChanges.(status & " → " & where.type),
        " | "
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

## mergeTransform: Multi-Field Merge

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
- `row.proposedCount` = the count number

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
