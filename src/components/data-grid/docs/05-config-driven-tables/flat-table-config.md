# Flat Table via Config

Create a flat table using DAG configuration with an API node or transform node.

---

## What Is Flat Mode?

Flat mode loads all rows into memory. Supports client-side sorting, filtering, grouping, selection, and inline editing. No pagination.

**Use flat when:**
- Data set is small (< 5000 rows)
- All rows fit in memory
- You want instant client-side sort/filter
- You don't need server-side pagination

**Don't use flat when:**
- Data set is huge (> 10k rows) → Use `infinite` mode
- Rows are paginated server-side → Use `paginated` mode
- Data is hierarchical → Use `tree` mode

---

## Example 1: Fetch from API

Fetch engineers from a server, display with sorting and filtering:

```typescript
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

export const engineersConfig: DAGTableConfig = {
  tableId: "engineers-flat",
  mode: "flat",

  dag: {
    nodes: [
      {
        id: "api-engineers",
        type: "api",
        config: {
          url: "/resources/v1/engineers",
          method: "GET",
          authAdapterId: "wafdata",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          responseTransform: `
            members.{
              "id":         id,
              "name":       name,
              "email":      email,
              "department": dept,
              "title":      jobTitle,
              "salary":     $number(compensation),
              "joinYear":   $number($substring(joinDate, 0, 4)),
              "active":     status = "active"
            }
          `,
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
              type: "string",
              sortable: true,
              filterable: true,
              width: 150,
            },
            {
              field: "email",
              header: "Email",
              type: "string",
              sortable: true,
              filterable: true,
              width: 200,
            },
            {
              field: "title",
              header: "Job Title",
              type: "string",
              sortable: true,
              filterable: true,
              width: 150,
            },
            {
              field: "department",
              header: "Department",
              type: "string",
              sortable: true,
              filterable: true,
              width: 120,
            },
            {
              field: "salary",
              header: "Salary",
              type: "number",
              sortable: true,
              width: 120,
              valueExpr: `"$" & $string(salary)`, // Format as currency
              classNameCell: "text-right font-semibold",
            },
            {
              field: "joinYear",
              header: "Joined",
              type: "number",
              sortable: true,
              width: 100,
            },
            {
              field: "active",
              header: "Status",
              type: "boolean",
              renderType: "badge",
              valueExpr: `active ? "🟢 Active" : "🔴 Inactive"`,
              width: 120,
            },
          ],
        },
      },
    ],

    edges: [{ from: "api-engineers", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    sorting: {
      enabled: true,
      defaultSort: [{ id: "name", desc: false }], // Initial sort by name
    },
    filtering: {
      enabled: true,
      filterRow: true, // Show filter inputs in header
    },
    selection: {
      enabled: true,
      mode: "multi", // Allow multiple row selection
    },
    pinning: {
      enabled: true,
      columnPinningLeft: ["name"], // Keep name visible while scrolling
    },
    virtualization: {
      enabled: true,
      overscan: 5,
    },
  },

  density: "normal",
};
```

### Usage

```tsx
import { ConfiguredTable } from "@/components/data-grid/table-engine";
import { engineersConfig } from "./configs/engineers.config";

export function EngineersPage() {
  const [selected, setSelected] = useState([]);

  return (
    <ConfiguredTable
      config={engineersConfig}
      onSelectionChange={setSelected}
    />
  );
}
```

---

## Example 2: Static Local Data

Use a transform node to provide constant data:

```typescript
export const sampleTeamsConfig: DAGTableConfig = {
  tableId: "teams-static",
  mode: "flat",

  dag: {
    nodes: [
      {
        id: "local-data",
        type: "transform",
        config: {
          sourceNodeId: "dummy", // Reference unused; transform uses static data
          expression: `[
            { "id": "team-1", "name": "Frontend", "lead": "Alice", "members": 5, "status": "active" },
            { "id": "team-2", "name": "Backend", "lead": "Bob", "members": 8, "status": "active" },
            { "id": "team-3", "name": "DevOps", "lead": "Carol", "members": 3, "status": "active" },
            { "id": "team-4", "name": "QA", "lead": "David", "members": 4, "status": "inactive" }
          ]`,
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Team Name", sortable: true, width: 150 },
            { field: "lead", header: "Lead", sortable: true, width: 150 },
            { field: "members", header: "Members", type: "number", sortable: true, width: 100 },
            {
              field: "status",
              header: "Status",
              renderType: "badge",
              valueExpr: `status = "active" ? "🟢 Active" : "🔴 Inactive"`,
              width: 120,
            },
          ],
        },
      },
    ],

    edges: [{ from: "local-data", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
    selection: { enabled: true },
  },
};
```

---

## Example 3: Transform + Enrich

Fetch from API, then transform to compute derived fields:

```typescript
export const enrichedEngineersConfig: DAGTableConfig = {
  tableId: "engineers-enriched",
  mode: "flat",

  dag: {
    nodes: [
      {
        id: "api-engineers",
        type: "api",
        config: {
          url: "/api/engineers",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `members.{
            "id": id,
            "name": name,
            "salary": $number(compensation),
            "joinDate": joinDate,
            "dept": department
          }`,
        },
      },

      {
        id: "enrich",
        type: "transform",
        config: {
          sourceNodeId: "api-engineers",
          expression: `
            $.{
              "id": id,
              "name": $uppercase(name), // Transform name
              "salary": salary,
              "joinYear": $number($substring(joinDate, 0, 4)),
              "yearsAtCompany": 2024 - $number($substring(joinDate, 0, 4)),
              "level": salary > 100000 ? "Senior" : "Junior",
              "department": dept
            }
          `,
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Engineer", sortable: true },
            { field: "salary", header: "Salary", type: "number", sortable: true },
            { field: "yearsAtCompany", header: "Tenure (yrs)", type: "number", sortable: true },
            {
              field: "level",
              header: "Level",
              type: "select",
              selectOptions: [
                { label: "Junior", value: "Junior" },
                { label: "Senior", value: "Senior" },
              ],
            },
          ],
        },
      },
    ],

    edges: [
      { from: "api-engineers", to: "enrich" },
      { from: "enrich", to: "columns" },
    ],
    rootNodeId: "columns",
  },

  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
  },
};
```

---

## Key Sections

### API Node Config

| Field | Purpose |
|-------|---------|
| `url` | API endpoint (can use `$:$params.x` for runtime params) |
| `method` | GET, POST, PUT, DELETE, PATCH |
| `authAdapterId` | `"wafdata"` for WAFData auth, `"bearer"` for token, `"none"` for public |
| `responseTransform` | JSONata to reshape API response into rows |
| `headers` | Custom HTTP headers |

### Column Definition

| Field | Purpose |
|-------|---------|
| `field` | Row property name |
| `header` | Column header label |
| `type` | Data type: `string`, `number`, `date`, `boolean`, `select` |
| `sortable` | Allow sorting (default: true) |
| `filterable` | Allow column filtering (default: true) |
| `width` | Column width in pixels |
| `valueExpr` | JSONata to transform cell value before display |
| `renderType` | Visual style: `badge`, `boolean`, `date`, `code` |
| `classNameCell` | Tailwind CSS classes for cell styling |
| `pinned` | Pin column: `"left"` or `"right"` |

### Features

| Feature | Purpose |
|---------|---------|
| `sorting` | Click headers to sort |
| `filtering` | Filter row + column-specific filters |
| `selection` | Row checkboxes (single or multi) |
| `pinning` | Pin columns/rows to side |
| `virtualization` | Virtual scroll for performance |

---

## With Runtime Parameters

Pass search or filter terms from your component:

```tsx
const [search, setSearch] = useState("");

<ConfiguredTable
  config={engineersConfig}
  params={{ searchStr: search }}
/>
```

In config, use `$:$params.searchStr` to reference it. When params change, the table refetches automatically.

---

## See Also

- [Config Basics](config-basics.md) — DAG model and params
- [DAG Nodes](dag-nodes.md) — All node types
- [JSONata Transforms](jsonata-transforms.md) — Expressions
- [Infinite Table Config](infinite-table-config.md) — Paginated data
- [Tree Table Config](tree-table-config.md) — Hierarchies
