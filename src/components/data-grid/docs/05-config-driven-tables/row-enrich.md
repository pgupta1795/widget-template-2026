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
