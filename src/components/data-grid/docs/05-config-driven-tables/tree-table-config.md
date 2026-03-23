# Tree Table via Config

Create a hierarchical table with expandable rows using DAG configuration and the `rowExpand` node.

---

## What Is Tree Mode?

Tree mode displays hierarchical data with parent-child relationships. Rows can expand to show children. Children can be pre-loaded or fetched lazily on expand.

**Use tree when:**
- Data is hierarchical (org chart, file tree, categories)
- Rows have variable depth
- You want expand/collapse UI
- Children might load asynchronously

---

## Key Concepts

### Root Data
The initial rows fetched by the root API node. These are top-level parents.

### Child API
A separate API node (marked as lazy, NOT in `edges[]`) that fetches children for a given parent.

### Child Key Expression
JSONata expression evaluated on each row to extract the parent ID, passed to the child API.

---

## Example 1: Static Hierarchy (Pre-loaded Children)

All children are returned in the initial API response:

```typescript
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

export const orgChartConfig: DAGTableConfig = {
  tableId: "org-chart",
  mode: "tree",

  dag: {
    nodes: [
      // Root API returns entire tree structure
      {
        id: "api-org",
        type: "api",
        config: {
          url: "/api/org/structure",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `
            (
              $buildTree := function($rows, $parentId) {
                $rows[$parentId = "root"].{
                  "id": id,
                  "name": name,
                  "title": title,
                  "reports": $count($rows[$parentId = id]),
                  "children": $buildTree($rows, id)
                }
              };
              $buildTree($rows, "root")
            )
          `,
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true },
            { field: "title", header: "Title", sortable: true },
            { field: "reports", header: "Direct Reports", type: "number" },
          ],
        },
      },
    ],

    edges: [{ from: "api-org", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    sorting: { enabled: true },
    selection: { enabled: true },
  },
};
```

---

## Example 2: Lazy-Load Children on Expand

Children are fetched from the server when the user expands a row:

```typescript
export const expandableOrgChartConfig: DAGTableConfig = {
  tableId: "org-expandable",
  mode: "tree",

  dag: {
    nodes: [
      // Root API returns only top-level managers
      {
        id: "root-api",
        type: "api",
        config: {
          url: "/api/org/roots",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `
            managers.{
              "id": id,
              "name": name,
              "title": title,
              "department": dept
            }
          `,
        },
      },

      // Lazy child API: fetches children for a given parent
      // NOT in edges[] — only executed when row expands
      {
        id: "child-api",
        type: "api",
        config: {
          url: "/api/org/{managerId}/reports",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `
            employees.{
              "id": id,
              "name": name,
              "title": title,
              "department": dept
            }
          `,
        },
      },

      // rowExpand node: configures lazy loading
      {
        id: "row-expand",
        type: "rowExpand",
        config: {
          childApiNodeId: "child-api",      // Lazy API to call
          childKeyExpr: "$:$row.id",         // Extract parent ID from row
          childQueryParam: "managerId",      // URL param name to inject
          triggerOnExpand: true,             // Auto-fetch on expand
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true },
            { field: "title", header: "Title" },
            { field: "department", header: "Department" },
          ],
          actionNodeId: "actions", // Optional: action buttons
        },
      },
    ],

    edges: [
      { from: "root-api", to: "row-expand" },
      { from: "row-expand", to: "columns" },
    ],
    rootNodeId: "columns",
  },

  features: {
    sorting: { enabled: true },
    selection: { enabled: true },
  },
};
```

### How Lazy Loading Works

1. User clicks expand arrow on a row
2. `rowExpand` node extracts the row's `id` via `childKeyExpr` → `"abc123"`
3. Injects it into the child API URL: `/api/org/abc123/reports`
4. Fetches children: `GET /api/org/abc123/reports`
5. Inserts result rows as children in the tree

---

## Example 3: Deep Expand with Toolbar Action

Allow users to expand all levels at once via a toolbar button:

```typescript
export const deepExpandConfig: DAGTableConfig = {
  tableId: "eng-expand",
  mode: "tree",

  dag: {
    nodes: [
      {
        id: "root-api",
        type: "api",
        config: {
          url: "/resources/v1/modeler/dseng/expand",
          method: "POST",
          authAdapterId: "wafdata",
          body: {
            expandDepth: 1, // Expand 1 level initially
            filters: { active: true },
          },
          responseTransform: `
            (
              $buildHierarchy := function($items) {
                $items.{
                  "id": id,
                  "name": name,
                  "type": type,
                  "children": $buildHierarchy(children) ?? []
                }
              };
              $buildHierarchy(items)
            )
          `,
        },
      },

      // Lazy node: expand all levels (depth -1 = unlimited)
      {
        id: "expand-all-api",
        type: "api",
        config: {
          url: "/resources/v1/modeler/dseng/expand",
          method: "POST",
          authAdapterId: "wafdata",
          body: {
            expandDepth: -1, // Unlimited depth
            filters: { active: true },
          },
        },
      },

      {
        id: "row-expand",
        type: "rowExpand",
        config: {
          childApiNodeId: "expand-all-api",
          childKeyExpr: "$:$row.id",
          childQueryParam: "itemId",
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Item Name", sortable: true },
            { field: "type", header: "Type" },
          ],
        },
      },
    ],

    edges: [
      { from: "root-api", to: "row-expand" },
      { from: "row-expand", to: "columns" },
    ],
    rootNodeId: "columns",
  },

  features: {
    selection: { enabled: true, mode: "multi" },
  },

  toolbarCommands: [
    {
      id: "expand-all",
      type: "command",
      enabled: true,
      label: "Expand All",
      icon: "ChevronDown",
      handler: async (ctx) => {
        // Check if already expanded
        const expanded = ctx.table.getState().expanded;
        if (Object.keys(expanded).length > 0) {
          // Already expanded — collapse
          ctx.table.toggleAllRowsExpanded(false);
          return;
        }
        // Expand all: execute the deep expand API
        const result = await ctx.executeApiNode("expand-all-api");
        if (result && result.length > 0) {
          ctx.setRows(result);
          ctx.table.toggleAllRowsExpanded(true);
        }
      },
    },
    { id: "spacer", type: "spacer", enabled: true },
    { id: "refresh", type: "command", enabled: true, icon: "RefreshCw" },
  ],
};
```

### Usage

```tsx
import { ConfiguredTable } from "@/components/data-grid/table-engine";
import { deepExpandConfig } from "./configs/eng-expand.config";

export function EngineersExpandPage() {
  return <ConfiguredTable config={deepExpandConfig} />;
}
```

When the user clicks "Expand All":
1. Handler calls `ctx.executeApiNode("expand-all-api")`
2. API returns the full tree (all levels)
3. `ctx.setRows(result)` replaces table rows
4. `ctx.table.toggleAllRowsExpanded(true)` expands all UI rows

---

## rowExpand Node Config

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `childApiNodeId` | `string` | ✓ | ID of lazy API node to fetch children |
| `childKeyExpr` | `JsonataExpr` | ✓ | JSONata to extract parent ID from row (e.g., `$:$row.id`) |
| `childQueryParam` | `string` | ✓ | URL query param name (e.g., `"parentId"`) |
| `triggerOnExpand` | `boolean` | — | Auto-fetch on expand (default: true) |
| `infiniteLoad` | `boolean` | — | Support infinite scroll within expanded rows |
| `maxDepth` | `number` | — | Max nesting depth |

---

## Child API Node Requirements

The child API must:
1. Accept the `childQueryParam` as a URL parameter
2. Return rows in the same shape as root data
3. Have a `responseTransform` to shape the response

Example:
```typescript
{
  id: "child-api",
  type: "api",
  config: {
    url: "/api/org/{managerId}/reports", // {managerId} comes from childQueryParam
    method: "GET",
    authAdapterId: "wafdata",
    responseTransform: `employees.{ "id": id, "name": name, ... }`,
  },
}
```

---

## Toolbar Integration for Expand Actions

Use `handler(ctx)` in a toolbar command to:
- Call `ctx.executeApiNode(lazyNodeId)` to fetch deep data
- Call `ctx.setRows(newRows)` to replace table rows
- Call `ctx.table.toggleAllRowsExpanded(true/false)` to expand/collapse UI

---

## ToolbarContext for Tree Operations

| Property | Type | Description |
|----------|------|-------------|
| `table` | `Table` | TanStack Table instance (has `toggleAllRowsExpanded`, etc.) |
| `rows` | `GridRow[]` | Current visible rows |
| `executeApiNode(nodeId)` | `Promise<GridRow[]>` | Execute a lazy API node |
| `setRows(rows)` | `void` | Replace table rows |
| `loadingRowIds` | `Set<string>` | IDs of rows currently loading children |

---

## See Also

- [Config Basics](config-basics.md) — DAG model
- [DAG Nodes](dag-nodes.md) — rowExpand node details
- [Flat Table Config](flat-table-config.md) — Non-hierarchical tables
- [Infinite Table Config](infinite-table-config.md) — Paginated tables
- [Toolbar](../08-toolbar.md) — Toolbar command reference
- [Actions](actions.md) — Row action patterns
