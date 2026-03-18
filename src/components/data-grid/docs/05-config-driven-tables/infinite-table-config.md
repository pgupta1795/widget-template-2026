# Infinite Table via Config

Create a paginated table with infinite scroll using DAG configuration and server-side pagination.

---

## What Is Infinite Mode?

Infinite mode loads data incrementally as the user scrolls. Perfect for feeds, large lists, and cursor-based pagination.

**Use infinite when:**
- Large data sets (1000+ rows)
- Cursor or offset-based pagination
- User scrolls to load more
- Server can provide `nextPage` token

**Don't use infinite when:**
- All rows fit in memory → Use `flat` mode
- Server provides traditional page numbers → Use `paginated` mode
- Data is hierarchical → Use `tree` mode

---

## Pagination Strategies

| Strategy | Config | Example |
|----------|--------|---------|
| **Offset** | `type: "offset"`, `pageParam: "$skip"`, `pageSizeParam: "$top"` | `/api/items?$skip=0&$top=50` |
| **Cursor** | `type: "cursor"`, `pageParam: "cursor"`, `pageSizeParam: "limit"` | `/api/items?cursor=abc123&limit=50` |

---

## Example 1: Offset-Based Pagination

Fetch engineers with offset/limit pagination (e.g., `$skip` and `$top`):

```typescript
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

export const engineersInfiniteConfig: DAGTableConfig = {
  tableId: "engineers-infinite",
  mode: "infinite",

  dag: {
    nodes: [
      {
        id: "api-engineers",
        type: "api",
        config: {
          url: "/resources/v1/engineers/search",
          method: "GET",
          authAdapterId: "wafdata",
          queryParams: {
            // $top and $skip are injected automatically by useDAGTable
            $top: "50",
            $skip: '$:$exists($params.cursor) ? $params.cursor : "0"',
            // Server-side search from toolbar
            $filter: '$:$params.searchStr ?? ""',
            $orderBy: "name",
          },
          responseTransform: `
            members.{
              "id":         id,
              "name":       name,
              "email":      email,
              "department": dept,
              "title":      jobTitle,
              "active":     status = "active"
            }
          `,
          // Pagination config tells the engine how to track pages
          paginationConfig: {
            type: "offset",
            pageParam: "$skip",       // URL param name for offset
            pageSizeParam: "$top",    // URL param name for page size
          },
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            {
              field: "name",
              header: "Name",
              sortable: true,
              filterable: true,
              width: 150,
            },
            {
              field: "email",
              header: "Email",
              sortable: true,
              filterable: true,
              width: 200,
            },
            {
              field: "title",
              header: "Job Title",
              sortable: true,
              width: 150,
            },
            {
              field: "department",
              header: "Department",
              sortable: true,
              filterable: true,
              width: 120,
            },
            {
              field: "active",
              header: "Status",
              renderType: "badge",
              valueExpr: `active ? "🟢 Active" : "🔴 Inactive"`,
              width: 100,
            },
          ],
        },
      },
    ],

    edges: [{ from: "api-engineers", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
    selection: { enabled: true, mode: "multi" },
    virtualization: { enabled: true },
  },

  toolbarCommands: [
    {
      id: "search",
      type: "search",
      enabled: true,
      queryParamName: "searchStr", // Binds to $params.searchStr
      placeholder: "Search by name, email...",
    },
    { id: "spacer", type: "spacer", enabled: true },
    { id: "columnVisibility", type: "menu", enabled: true, label: "Columns", icon: "Columns3", commands: [] },
    { id: "density", type: "menu", enabled: true, icon: "AlignJustify", commands: [] },
    { id: "refresh", type: "command", enabled: true, icon: "RefreshCw" },
    { id: "export", type: "command", enabled: true, label: "Export", icon: "Download" },
  ],
};
```

### How Offset Pagination Works

1. **Initial load:** `useDAGTable` creates param `cursor: 0`
2. **User scrolls:** Table fetches next batch with `cursor: 50`
3. **Response:** API returns `{ members: [...], nextPage: 100 }` (or `nextPage: null` when done)
4. **Repeat:** Next scroll fetches with `cursor: 100`, etc.

The `nextPage` value from the API response becomes the `cursor` param for the next request.

---

## Example 2: Cursor-Based Pagination

For cursor-based APIs (e.g., GraphQL), use a cursor token:

```typescript
export const feedInfiniteConfig: DAGTableConfig = {
  tableId: "feed-infinite",
  mode: "infinite",

  dag: {
    nodes: [
      {
        id: "api-feed",
        type: "api",
        config: {
          url: "/api/feed",
          method: "GET",
          authAdapterId: "bearer",
          queryParams: {
            limit: "20",
            cursor: '$:$params.cursor ?? null', // Cursor token from server
          },
          responseTransform: `{
            "id": id,
            "author": author.name,
            "content": content,
            "timestamp": timestamp,
            "likes": $count(likedBy)
          }`,
          paginationConfig: {
            type: "cursor",
            pageParam: "cursor",    // URL param name for cursor
            pageSizeParam: "limit",
          },
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "author", header: "Author", width: 150 },
            { field: "content", header: "Post", width: 400 },
            { field: "timestamp", header: "Posted", type: "date", width: 150 },
            { field: "likes", header: "Likes", type: "number", width: 80 },
          ],
        },
      },
    ],

    edges: [{ from: "api-feed", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    selection: { enabled: true },
    virtualization: { enabled: true },
  },
};
```

---

## Example 3: Server-Side Search + Infinite Scroll

Combine search input with pagination:

```typescript
export const engineersSearchConfig: DAGTableConfig = {
  tableId: "eng-search",
  mode: "infinite",

  dag: {
    nodes: [
      {
        id: "root-api",
        type: "api",
        config: {
          url: "/resources/v1/modeler/dseng/dseng:EngItem/search",
          method: "GET",
          authAdapterId: "wafdata",
          queryParams: {
            $searchStr: '$:$params.searchStr ?? ""',    // From search toolbar
            $top: "50",
            $skip: '$:$exists($params.cursor) ? $params.cursor : "0"',
            $mask: "dskern:Mask.Default",
          },
          responseTransform: `
            member.{
              "id":           id,
              "name":         name,
              "title":        title,
              "type":         type,
              "revision":     revision,
              "state":        state,
              "owner":        owner,
              "organization": organization,
              "collabspace":  collabspace,
              "created":      created,
              "modified":     modified
            }
          `,
          paginationConfig: {
            type: "offset",
            pageParam: "$skip",
            pageSizeParam: "$top",
          },
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true, filterable: true },
            { field: "title", header: "Title", sortable: true, filterable: true },
            { field: "type", header: "Type" },
            { field: "state", header: "State", renderType: "badge" },
            { field: "owner", header: "Owner" },
            { field: "organization", header: "Organization" },
            { field: "created", header: "Created", type: "date" },
            { field: "modified", header: "Modified", type: "date" },
          ],
        },
      },
    ],

    edges: [{ from: "root-api", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
    selection: { enabled: true, mode: "multi" },
  },

  toolbarCommands: [
    {
      id: "search",
      type: "search",
      enabled: true,
      queryParamName: "searchStr",  // Binds to $params.searchStr
      placeholder: "Search by name, description...",
    },
    { id: "spacer", type: "spacer", enabled: true },
    {
      id: "columnVisibility",
      type: "menu",
      enabled: true,
      label: "Columns",
      icon: "Columns3",
      commands: [],
    },
    { id: "density", type: "menu", enabled: true, icon: "AlignJustify", commands: [] },
    { id: "refresh", type: "command", enabled: true, label: "Refresh", icon: "RefreshCw" },
    { id: "export", type: "command", enabled: true, label: "Export", icon: "Download" },
  ],
};
```

### Usage

```tsx
import { ConfiguredTable } from "@/components/data-grid/table-engine";
import { engineersSearchConfig } from "./configs/eng-search.config";

export function EngineersSearchPage() {
  return <ConfiguredTable config={engineersSearchConfig} />;
}
```

The search toolbar command automatically:
1. Updates `$params.searchStr` when user types
2. Triggers a refetch with the new search term
3. Resets pagination (starts from `cursor: 0`)

---

## API Response Format

Your API must return `nextPage` to indicate pagination:

```json
{
  "members": [
    { "id": "1", "name": "Alice", ... },
    { "id": "2", "name": "Bob", ... }
  ],
  "nextPage": "50"
}
```

When there are no more rows:
```json
{
  "members": [ ... ],
  "nextPage": null
}
```

The engine stops loading when `nextPage` is `null`.

---

## Key Config Fields

| Field | Purpose |
|-------|---------|
| `mode: "infinite"` | Enables infinite scroll |
| `paginationConfig.type` | `"offset"` or `"cursor"` |
| `paginationConfig.pageParam` | URL param name for offset/cursor |
| `paginationConfig.pageSizeParam` | URL param name for page size |
| `queryParamName: "searchStr"` | Binds search toolbar to `$params.searchStr` |

---

## Runtime Behavior

1. **Initial load:** Fetch first page (`cursor: 0` or `cursor: null`)
2. **User scrolls to bottom:** Fetch next page (cursor becomes `nextPage` from prior response)
3. **User searches:** Reset pagination, refetch with new search term
4. **User changes sort/filter:** Refetch current page
5. **Refetch button:** Re-run same query with same cursor

---

## See Also

- [Config Basics](config-basics.md) — DAG model and params
- [DAG Nodes](dag-nodes.md) — All node types
- [JSONata Transforms](jsonata-transforms.md) — Response shaping
- [Flat Table Config](flat-table-config.md) — Non-paginated tables
- [Tree Table Config](tree-table-config.md) — Hierarchies
- [Toolbar](../08-toolbar.md) — Search command reference
