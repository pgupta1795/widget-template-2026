# Config API Reference

Complete, accurate schema for `DAGTableConfig` and all node types. For examples, see the scenario-specific docs.

---

## DAGTableConfig (Root)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `tableId` | `string` | ✓ | Unique table ID. Used in React Query cache keys. |
| `mode` | `"flat"` \| `"paginated"` \| `"infinite"` \| `"tree"` | ✓ | Data loading strategy. |
| `dag` | `DAGConfig` | ✓ | Node graph: all nodes, edges, root node ID. |
| `features` | `DAGFeaturesConfig` | — | Feature flags (sorting, filtering, etc.). |
| `density` | `"compact"` \| `"normal"` \| `"comfortable"` | — | Initial row density. |
| `toolbarCommands` | `SerializableToolbarCommand[]` | — | Toolbar button/menu definitions. |

---

## DAGConfig

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `nodes` | `DAGNode[]` | ✓ | All nodes: api, transform, column, merge, rowExpand, action, rowEnrich, columnHydrate. Includes lazy nodes. |
| `edges` | `{ from: string; to: string }[]` | ✓ | Initial-wave dependencies. Lazy nodes NOT listed here. |
| `rootNodeId` | `string` | ✓ | Final node ID to render. Usually a `column` node. |

---

## Node Types

### ApiNode

```typescript
{
  id: string;
  type: "api";
  config: ApiNodeConfig;
}
```

**ApiNodeConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | `string` \| `JsonataExpr` | ✓ | Endpoint URL. Use `$:$params.x` to reference params. |
| `method` | `"GET"` \| `"POST"` \| `"PUT"` \| `"DELETE"` \| `"PATCH"` | ✓ | HTTP method. |
| `authAdapterId` | `string` | ✓ | Auth strategy: `"wafdata"`, `"bearer"`, `"none"`. |
| `queryParams` | `Record<string, string \| JsonataExpr>` | — | URL query parameters. |
| `body` | `JsonValue` \| `JsonataExpr` | — | Request body (JSON or JSONata). |
| `formParams` | `Record<string, string \| JsonataExpr>` | — | Form-encoded parameters. |
| `fileParams` | `Array<{ fieldName: string; sourceKey: string }>` | — | File upload fields. |
| `headers` | `Record<string, string>` | — | Custom HTTP headers. |
| `responseTransform` | `string` (JSONata) | — | JSONata to transform API response → rows. |
| `paginationConfig` | `PaginationConfig` | — | Pagination setup for infinite/paginated modes. |

**PaginationConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | `"offset"` \| `"cursor"` \| `"page"` | ✓ | Pagination strategy. |
| `pageParam` | `string` | ✓ | URL param name for offset/cursor/page. |
| `pageSizeParam` | `string` | ✓ | URL param name for page size. |
| `totalKey` | `string` | — | JSON path in response for total count (e.g., `"meta.total"`). |

**ApiNodeOutput:**

```typescript
{
  rows: GridRow[];
  total?: number;        // For paginated mode
  nextPage?: string | null;  // For infinite mode
}
```

---

### TransformNode

```typescript
{
  id: string;
  type: "transform";
  config: TransformNodeConfig;
}
```

**TransformNodeConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceNodeId` | `string` | ✓ | Prior node ID (api or merge). |
| `expression` | `string` (JSONata) | ✓ | JSONata to transform rows. Input is array. |

**Output:** `GridRow[]`

---

### ColumnNode

```typescript
{
  id: string;
  type: "column";
  config: ColumnNodeConfig;
}
```

**ColumnNodeConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `columns` | `ColumnDef[]` | ✓ | Array of column definitions. |
| `actionNodeId` | `string` | — | ID of action node to append action column. |

**ColumnDef:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field` | `string` | ✓ | Row property name. |
| `header` | `string` | ✓ | Column header label. |
| `type` | `"string"` \| `"number"` \| `"date"` \| `"boolean"` \| `"select"` \| `"multi-value"` \| `"code"` | — | Data type. |
| `sortable` | `boolean` | — | Allow sorting (default: true). |
| `filterable` | `boolean` | — | Allow filtering (default: true). |
| `editable` | `boolean` \| `DepthRule` | — | Allow inline edit. |
| `renderType` | `"badge"` \| `"boolean"` \| `"date"` \| `"code"` \| `"custom"` | — | Cell render style. |
| `valueExpr` | `string` (JSONata) | — | Per-cell transform. Input is row object. |
| `selectOptions` | `Array<{ label: string; value: string }>` | — | Options for select type. |
| `width` | `number` | — | Column width in pixels. |
| `pinned` | `"left"` \| `"right"` | — | Pin column to side. |
| `hidden` | `boolean` | — | Hide by default. |
| `classNameHeader` | `string` | — | Tailwind CSS classes for header cell. |
| `classNameCell` | `string` | — | Tailwind CSS classes for data cell. |

**ColumnNodeOutput:**

```typescript
{
  columns: GridColumnDef[];
  visibility: Record<string, boolean>;
}
```

---

### MergeNode

```typescript
{
  id: string;
  type: "merge";
  config: MergeNodeConfig;
}
```

**MergeNodeConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceNodeIds` | `string[]` | ✓ | Prior node IDs (api or transform). |
| `strategy` | `"concat"` \| `"join"` \| `"merge"` | ✓ | Merge strategy. |
| `joinKey` | `string` | — | Field name for join strategy. Required if strategy is `"join"`. |

**Strategies:**
- `"concat"` — Flatten arrays. Append all sources.
- `"join"` — Left-outer join on `joinKey`.
- `"merge"` — Positional zip (index-based).

**Output:** `GridRow[]`

---

### RowExpandNode

```typescript
{
  id: string;
  type: "rowExpand";
  config: RowExpandNodeConfig;
}
```

**RowExpandNodeConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `childApiNodeId` | `string` | ✓ | ID of lazy API node to fetch children. |
| `childKeyExpr` | `JsonataExpr` | ✓ | JSONata to extract param from row (e.g., `$:$row.id`). |
| `childQueryParam` | `string` | ✓ | URL query param name to inject value into. |
| `triggerOnExpand` | `boolean` | — | Auto-fetch on expand (default: true). |
| `infiniteLoad` | `boolean` | — | Support infinite scroll within expanded rows. |
| `maxDepth` | `number` | — | Max nesting depth. |

**Output:**

```typescript
{
  expandHandler: (row: GridRow) => Promise<GridRow[]>;
}
```

---

### ActionNode

```typescript
{
  id: string;
  type: "action";
  config: ActionNodeConfig;
}
```

**ActionNodeConfig:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rowActions` | `ActionDef[]` | — | Row-level action buttons. |
| `cellActions` | `ActionDef[]` | — | Cell-level action buttons. |

**ActionDef:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✓ | Unique action ID. |
| `label` | `string` | ✓ | Button label. |
| `icon` | `string` | — | lucide-react icon name. |
| `apiNodeId` | `string` | ✓ | ID of lazy API node to execute. |
| `confirmMessage` | `string` | — | Confirmation dialog text. |
| `visibilityExpr` | `JsonataExpr` | — | JSONata with `$row` context. Show if true. |
| `disabledExpr` | `JsonataExpr` | — | JSONata with `$row` context. Disable if true. |

**Output:**

```typescript
{
  rowActions: ActionDef[];
  cellActions: ActionDef[];
}
```

---

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

## Features Config

**DAGFeaturesConfig extends GridFeaturesConfig:**

| Feature | Type | Description |
|---------|------|-------------|
| `sorting` | `{ enabled?: boolean; defaultSort?: Array<{ id: string; desc: boolean }> }` | Sorting. |
| `filtering` | `{ enabled?: boolean; filterRow?: boolean; defaultFilters?: Array<{ id: string; value: any }> }` | Filtering. |
| `selection` | `{ enabled?: boolean; mode?: "single" \| "multi"; initialSelected?: string[] }` | Row selection. |
| `pinning` | `{ enabled?: boolean; columnPinningLeft?: string[]; columnPinningRight?: string[] }` | Pin columns/rows. |
| `grouping` | `{ enabled?: boolean; groupBy?: string[] }` | Row grouping. |
| `editing` | `{ enabled?: boolean; onMutate?: (rowId, colId, value) => Promise<any> }` | Inline edit. |
| `virtualization` | `{ enabled?: boolean; overscan?: number }` | Virtual scroll. |
| `columnOrdering` | `{ enabled?: boolean }` | Reorder columns (engine-only). |
| `columnResizing` | `{ enabled?: boolean }` | Resize columns (engine-only). |
| `columnVisibility` | `{ enabled?: boolean }` | Show/hide columns (engine-only). |

---

## JSONataExpr

A JSONata expression string prefixed with `$:`:

```typescript
type JsonataExpr = `$:${string}`;
```

**Examples:**
- `$:$params.searchStr` — Access param
- `$:$row.id` — Access row field
- `$:name & " " & email` — Concatenation
- `$:status = "active"` — Boolean condition

---

## SerializableToolbarCommand

See [Toolbar Reference](../08-toolbar.md) for complete details.

**Types:** `"command"`, `"menu"`, `"search"`, `"spacer"`, `"separator"`

**Common fields:** `id`, `enabled`, `align`, `label`, `icon`, `className`, `disabled`

---

## Complete Example

```typescript
const config: DAGTableConfig = {
  tableId: "engineers",
  mode: "infinite",

  dag: {
    nodes: [
      {
        id: "api-engineers",
        type: "api",
        config: {
          url: "/api/engineers",
          method: "GET",
          authAdapterId: "wafdata",
          queryParams: {
            $search: '$:$params.searchStr ?? ""',
            $top: "50",
            $skip: '$:$params.cursor ?? "0"',
          },
          responseTransform: `members.{ "id": id, "name": name, "email": email }`,
          paginationConfig: {
            type: "offset",
            pageParam: "$skip",
            pageSizeParam: "$top",
          },
        },
      },

      {
        id: "delete-api",
        type: "api",
        config: {
          url: "/api/engineers/{id}",
          method: "DELETE",
          authAdapterId: "wafdata",
        },
      },

      {
        id: "actions",
        type: "action",
        config: {
          rowActions: [
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              apiNodeId: "delete-api",
              confirmMessage: "Delete this engineer?",
            },
          ],
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true },
            { field: "email", header: "Email" },
          ],
          actionNodeId: "actions",
        },
      },
    ],

    edges: [
      { from: "api-engineers", to: "actions" },
      { from: "actions", to: "columns" },
    ],
    rootNodeId: "columns",
  },

  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
    selection: { enabled: true },
  },

  toolbarCommands: [
    {
      id: "search",
      type: "search",
      enabled: true,
      queryParamName: "searchStr",
      placeholder: "Search...",
    },
    { id: "spacer", type: "spacer", enabled: true },
    { id: "refresh", type: "command", enabled: true, icon: "RefreshCw" },
  ],
};
```

---

## See Also

- [Config Basics](config-basics.md) — DAG model
- [DAG Nodes](dag-nodes.md) — Detailed node explanations
- [Flat Table Config](flat-table-config.md) — Example
- [Infinite Table Config](infinite-table-config.md) — Example
- [Tree Table Config](tree-table-config.md) — Example
- [Parallel Merges](parallel-merge.md) — Multiple APIs
- [Actions](actions.md) — Row/cell buttons
- [JSONata Transforms](jsonata-transforms.md) — Expression syntax
- [Toolbar Reference](../08-toolbar.md) — Toolbar commands
