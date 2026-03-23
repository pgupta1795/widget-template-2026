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
  { from: "root-api", to: "column-hydrate" },
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

Simplified from engEnrichedConfig pattern (lazy status column example):

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
