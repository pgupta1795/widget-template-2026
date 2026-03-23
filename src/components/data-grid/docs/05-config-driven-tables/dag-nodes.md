# DAG Nodes Reference

Complete reference for all eight node types. For each type: purpose, config fields, example, output.

---

## API Node

**Purpose:** Fetch data from an HTTP endpoint and shape the response.

### Config Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | `string` \| `JsonataExpr` | ✓ | Endpoint URL. Can use `$:$params.x` |
| `method` | `GET` \| `POST` \| `PUT` \| `DELETE` \| `PATCH` | ✓ | HTTP method |
| `authAdapterId` | `string` | ✓ | Auth strategy: `"wafdata"`, `"bearer"`, `"none"` |
| `queryParams` | `Record<string, string \| JsonataExpr>` | — | URL search params |
| `body` | `JsonValue` \| `JsonataExpr` | — | Request body (JSON or JSONata) |
| `formParams` | `Record<string, string \| JsonataExpr>` | — | Form-encoded params |
| `fileParams` | `Array<{ fieldName: string; sourceKey: string }>` | — | File upload fields |
| `headers` | `Record<string, string>` | — | Custom HTTP headers |
| `responseTransform` | `string` (JSONata) | — | Transform API response → rows. Input is response data. |
| `paginationConfig` | `{ type: "offset" \| "cursor" \| "page"; pageParam: string; pageSizeParam: string; totalKey?: string }` | — | Pagination setup |

### Output

```typescript
{
  rows: GridRow[];
  total?: number;        // for paginated mode
  nextPage?: string | null;  // for infinite mode
}
```

### Example: Fetch and Shape

```typescript
{
  id: "api-engineers",
  type: "api",
  config: {
    url: "/resources/v1/engineers",
    method: "GET",
    authAdapterId: "wafdata",
    queryParams: {
      $top: "50",
      $skip: '$:$exists($params.cursor) ? $params.cursor : "0"',
      $filter: '$:$params.searchStr ?? ""',
    },
    responseTransform: `
      members.{
        "id": id,
        "name": name,
        "email": email,
        "salary": $number(compensation),
        "level": department
      }
    `,
    paginationConfig: {
      type: "offset",
      pageParam: "$skip",
      pageSizeParam: "$top",
    },
  },
}
```

---

## Transform Node

**Purpose:** Transform or enrich rows using JSONata. Useful for mapping fields, computing values, filtering.

### Config Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceNodeId` | `string` | ✓ | ID of a prior `api` or `merge` node |
| `expression` | `string` (JSONata) | ✓ | JSONata transform. Input is array of rows. |

### Output

```typescript
GridRow[]  // Transformed rows
```

### Example: Compute and Remap

```typescript
{
  id: "transform-enrich",
  type: "transform",
  config: {
    sourceNodeId: "api-engineers",
    expression: `$.{
      "id": id,
      "fullName": firstName & " " & lastName,
      "email": email,
      "yearsAtCompany": 2024 - $number($substring(joinDate, 0, 4)),
      "isManager": $count(directReports) > 0
    }`,
  },
}
```

---

## Column Node

**Purpose:** Define table columns. Maps row fields to display columns with types, headers, styling.

### Config Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `columns` | `ColumnDef[]` | ✓ | Array of column definitions |
| `actionNodeId` | `string` | — | ID of action node; appends action column |

### ColumnDef Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `field` | `string` | ✓ | Row property name |
| `header` | `string` | ✓ | Column header label |
| `type` | `"string"` \| `"number"` \| `"date"` \| `"boolean"` \| `"select"` \| `"multi-value"` \| `"code"` | — | Column data type |
| `sortable` | `boolean` | — | Allow sorting (default: true) |
| `filterable` | `boolean` | — | Allow filtering (default: true) |
| `editable` | `boolean` \| `DepthRule` | — | Allow inline edit |
| `renderType` | `"badge"` \| `"boolean"` \| `"date"` \| `"code"` \| `"custom"` | — | Cell render style |
| `valueExpr` | `string` (JSONata) | — | Per-cell transform. Input is row object. |
| `selectOptions` | `Array<{ label: string; value: string }>` | — | Options for select type |
| `width` | `number` | — | Column width in pixels |
| `pinned` | `"left"` \| `"right"` | — | Pin column to side |
| `hidden` | `boolean` | — | Hide by default |
| `classNameHeader` | `string` (Tailwind) | — | Header cell classes |
| `classNameCell` | `string` (Tailwind) | — | Data cell classes |

### Output

```typescript
{
  columns: GridColumnDef[];
  visibility: Record<string, boolean>;
}
```

### Example: Full Column Definition

```typescript
{
  id: "columns",
  type: "column",
  config: {
    columns: [
      {
        field: "name",
        header: "Engineer Name",
        sortable: true,
        filterable: true,
        width: 200,
        pinned: "left",
      },
      {
        field: "email",
        header: "Email",
        type: "string",
        sortable: true,
      },
      {
        field: "salary",
        header: "Compensation",
        type: "number",
        valueExpr: `"$" & $string(salary)`, // Per-cell format
        classNameCell: "text-right font-semibold",
      },
      {
        field: "level",
        header: "Seniority",
        type: "select",
        selectOptions: [
          { label: "Junior", value: "junior" },
          { label: "Senior", value: "senior" },
          { label: "Lead", value: "lead" },
        ],
      },
      {
        field: "active",
        header: "Status",
        type: "boolean",
        renderType: "badge",
      },
      {
        field: "yearsAtCompany",
        header: "Tenure",
        type: "number",
        hidden: true, // Hide by default, user can show via column visibility menu
      },
    ],
    actionNodeId: "actions", // Append row action buttons
  },
}
```

---

## Merge Node

**Purpose:** Combine rows from multiple API/transform sources using concat, join, or positional merge.

### Config Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sourceNodeIds` | `string[]` | ✓ | IDs of `api` or `transform` nodes |
| `strategy` | `"concat"` \| `"join"` \| `"merge"` | ✓ | Merge strategy |
| `joinKey` | `string` | (conditional) | Field name for join strategy |

### Output

```typescript
GridRow[]  // Merged rows
```

### Strategies

| Strategy | Behavior | Use Case |
|----------|----------|----------|
| **concat** | Flatten arrays. Append all sources. | Combine two lists: projects + tasks |
| **join** | SQL-like join on `joinKey`. Left-outer. | Enrich primary rows with secondary data |
| **merge** | Positional zip (index-based). Take `id` from first source. | Parallel API fetches of same structure |

### Example: Join Engineers with Project Assignments

```typescript
{
  id: "merge-engineers-projects",
  type: "merge",
  config: {
    sourceNodeIds: ["api-engineers", "api-assignments"],
    strategy: "join",
    joinKey: "engineerId", // engineers.engineerId = assignments.engineerId
  },
}
```

After merge, each engineer row has all assignment fields attached.

---

## RowExpand Node

**Purpose:** Enable lazy-loading of child rows. For tree hierarchies or expandable detail rows.

### Config Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `childApiNodeId` | `string` | ✓ | ID of a lazy (NOT in edges) `api` node |
| `childKeyExpr` | `JsonataExpr` | ✓ | JSONata to extract param value from row. E.g., `$:$row.id` |
| `childQueryParam` | `string` | ✓ | URL query param name to inject the value into |
| `triggerOnExpand` | `boolean` | — | Auto-fetch when expanding (default: true) |
| `infiniteLoad` | `boolean` | — | Support infinite scroll within expanded rows |
| `maxDepth` | `number` | — | Max nesting depth |

### Output

```typescript
{
  expandHandler: (row: GridRow) => Promise<GridRow[]>;
}
```

### Example: Tree Expansion

```typescript
{
  id: "root-api",
  type: "api",
  config: {
    url: "/api/org/structure",
    method: "GET",
    authAdapterId: "wafdata",
  },
},

{
  id: "row-expand",
  type: "rowExpand",
  config: {
    childApiNodeId: "child-api", // Lazy node, NOT in edges[]
    childKeyExpr: '$:$row.id',    // Extract parent ID from row
    childQueryParam: "parentId",  // Inject into API query param
    triggerOnExpand: true,
  },
},

{
  id: "child-api",  // Lazy node
  type: "api",
  config: {
    url: "/api/org/{parentId}/children", // {parentId} replaced from childQueryParam
    method: "GET",
    authAdapterId: "wafdata",
  },
},

{
  id: "columns",
  type: "column",
  config: { columns: [...] },
}
```

When a row expands, `childKeyExpr` extracts its `id`, passes it to `child-api` as `?parentId=...`, and fetches children.

---

## Action Node

**Purpose:** Define row-level and cell-level action buttons. E.g., delete, edit, approve.

### Config Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rowActions` | `ActionDef[]` | — | Buttons that act on the entire row |
| `cellActions` | `ActionDef[]` | — | Buttons within specific cells |

### ActionDef Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✓ | Unique action ID |
| `label` | `string` | ✓ | Button label |
| `icon` | `string` | — | lucide-react icon name (e.g., "Trash2", "Edit", "CheckCircle") |
| `apiNodeId` | `string` | ✓ | ID of a lazy `api` node to execute |
| `confirmMessage` | `string` | — | Show confirm dialog before executing |
| `visibilityExpr` | `JsonataExpr` | — | JSONata with `$row` context. Default visible. |
| `disabledExpr` | `JsonataExpr` | — | JSONata with `$row` context. Default enabled. |

### Output

```typescript
{
  rowActions: ActionDef[];
  cellActions: ActionDef[];
}
```

### Example: Delete and Approve Actions

```typescript
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
        confirmMessage: "Are you sure?",
        disabledExpr: '$:$row.status = "archived"', // Can't delete archived
      },
      {
        id: "approve",
        label: "Approve",
        icon: "CheckCircle",
        apiNodeId: "approve-api",
        visibilityExpr: '$:$row.status = "pending"', // Only for pending rows
      },
    ],
  },
},

{
  id: "delete-api", // Lazy node
  type: "api",
  config: {
    url: "/api/engineers/{engineerId}",
    method: "DELETE",
    authAdapterId: "wafdata",
  },
},

{
  id: "approve-api", // Lazy node
  type: "api",
  config: {
    url: "/api/engineers/{engineerId}/approve",
    method: "POST",
    authAdapterId: "wafdata",
  },
},
```

When a user clicks "Delete", the `delete-api` node executes with the row's ID, then the table refetches.

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

## Full Node Type Reference

| Node Type | Executes On Initial Wave | Can Be Lazy | Output Type | Typical Use |
|-----------|--------------------------|-----------|-------------|------------|
| **api** | Yes (if in edges) | Yes (if not in edges) | `ApiNodeOutput` | Fetch data, action handlers |
| **transform** | Yes (if in edges) | No | `GridRow[]` | Enrich/map rows |
| **column** | Yes (if in edges) | No | `ColumnNodeOutput` | Define columns |
| **merge** | Yes (if in edges) | No | `GridRow[]` | Combine multiple sources |
| **rowExpand** | Yes (if in edges) | No | `RowExpandOutput` | Tree expansion, lazy children |
| **action** | Yes (if in edges) | No | `ActionOutput` | Row/cell action buttons |
| **rowEnrich** | Yes (if in edges) | Yes (via `triggerEnrich()`) | `RowEnrichNodeOutput` | Enrich every root row via per-row API call (eager or trigger-gated) |
| **columnHydrate** | Yes (if in edges) | Yes (per-column via `triggerHydrate(columnId)`) | `ColumnHydrateNodeOutput` | Hydrate per-column cells from independent API calls (per-column lazy gate) |

---

## Node Dependencies and Edges

- **Edges define initial-wave execution** — Only nodes in edges[] execute on load
- **Lazy nodes execute on-demand** — Action nodes, expand children, toolbar commands
- **Source dependencies** — Transform, merge, rowExpand reference prior nodes via `sourceNodeId` or `childApiNodeId`
- **No circular deps** — DAG validator checks for cycles

---

## See Also

- [Config Basics](config-basics.md) — DAG execution model
- [JSONata Transforms](jsonata-transforms.md) — Expression syntax for transforms
- [Parallel Merges](parallel-merge.md) — Real-world multi-API examples
- [Actions](actions.md) — Row/cell button patterns
- [Full API Reference](config-api-reference.md) — Complete schema
