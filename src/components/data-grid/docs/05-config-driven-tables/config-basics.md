# Config Basics

Declarative table configuration using the DAG (Directed Acyclic Graph) model.

## What Is Config-Driven?

Instead of writing imperative React code, you declare a table's structure as a JSON configuration object. Pass it to `<ConfiguredTable>` and get a fully-featured table with sorting, filtering, server-side pagination, hierarchies, and more.

## Raw Props vs Config

| Aspect | Raw Props (`<DataGrid>`) | Config (`<ConfiguredTable>`) |
|--------|------------------------|---------------------------|
| **Approach** | Imperative React | Declarative JSON |
| **Control** | Maximum flexibility | Structured schema |
| **Reusability** | Per-component | Portable config objects |
| **Server-side** | Possible but complex | Native, designed for it |
| **Code length** | Longer JSX | Concise JSON |
| **Learning curve** | Component API depth dive | Schema + examples |

**Choose config if:** Your table comes from a server, you want reusable definitions, or you prefer declarative over imperative.

**Choose raw props if:** You need maximum customization, tight coupling to business logic, or it's a one-off feature.

---

## The DAG Model

A **DAG** is a graph of typed nodes connected by edges. Tables execute nodes in topological order (dependencies first) and within each "wave" **in parallel**.

### Eight Node Types

| Type | Purpose | Example |
|------|---------|---------|
| **api** | Fetch data from an HTTP endpoint | `GET /resources/v1/members` |
| **transform** | Transform/enrich rows via JSONata | Map API fields, compute values |
| **column** | Define table columns from row data | Headers, types, renderTypes |
| **merge** | Combine rows from multiple sources | Join/concat two API endpoints |
| **rowExpand** | Lazy-load children per row | Tree hierarchy, expandable rows |
| **action** | Define row/cell actions (buttons) | Delete, edit, approve buttons |
| **rowEnrich** | Enrich every root row via per-row API call | `GET /api/items/{id}/details`, merge results |
| **columnHydrate** | Hydrate per-column cells from independent API calls | Members column, status column with per-column lazy gates |

### Execution Model

Nodes in the same "wave" (with no dependencies between them) execute in parallel via `Promise.all()`. A node can depend on another via edges. Example:

```
Wave 0 (initial):  api-engineers    api-projects
                        │                 │
                        └─────────┬───────┘
                                  ↓
Wave 1:                      merge-data
                                  │
                                  ↓
Wave 2:                      columns
```

Here, the two API nodes run in parallel, then the merge waits, then the columns node renders.

---

## Minimal Example: "Hello World" Config

Fetch engineers from an API, display name and email:

```typescript
import { ConfiguredTable } from "@/components/data-grid/table-engine";
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

const helloWorldConfig: DAGTableConfig = {
  tableId: "engineers",
  mode: "flat",

  dag: {
    nodes: [
      // Wave 0: Fetch data
      {
        id: "api-engineers",
        type: "api",
        config: {
          url: "/api/v1/engineers",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `members.{
            "id": id,
            "name": name,
            "email": email,
            "department": dept
          }`,
        },
      },

      // Wave 1: Define columns
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true },
            { field: "email", header: "Email", filterable: true },
            { field: "department", header: "Department" },
          ],
        },
      },
    ],

    // api-engineers → columns
    edges: [{ from: "api-engineers", to: "columns" }],
    rootNodeId: "columns",
  },

  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
    selection: { enabled: true },
  },
};

export default function EngineersTable() {
  return <ConfiguredTable config={helloWorldConfig} />;
}
```

---

## Runtime Parameters (Params)

Pass data from your component into the config via the `params` prop:

```tsx
const [searchTerm, setSearchTerm] = useState("");

<ConfiguredTable
  config={config}
  params={{ searchStr: searchTerm, deptId: "engineering" }}
/>
```

In the config, reference params with `$:` prefix inside JSONata expressions:

```typescript
queryParams: {
  $filter: '$:$params.searchStr ?? ""',
  $deptId: '$:$params.deptId',
}
```

When `params` changes, the table refetches automatically.

---

## Core Config Structure

```typescript
interface DAGTableConfig {
  tableId: string;                    // Unique key for React Query caching
  mode: "flat" | "paginated" | "infinite" | "tree";
  dag: {
    nodes: DAGNode[];                // All nodes: api, transform, column, etc.
    edges: { from: string; to: string }[]; // Initial-wave dependencies
    rootNodeId: string;              // The final node to render (usually column node)
  };
  features?: {
    sorting?: { enabled: true; defaultSort?: [...] };
    filtering?: { enabled: true; filterRow?: true };
    selection?: { enabled: true; mode?: "single" | "multi" };
    // ... see config-api-reference.md for full feature set
  };
  density?: "compact" | "normal" | "comfortable";
  toolbarCommands?: SerializableToolbarCommand[];
}
```

### Key Concepts

- **tableId** — Used in React Query keys. Change it to bust the cache.
- **mode** — Controls data loading: `flat` (all in memory), `infinite` (cursor-based), `paginated`, `tree`.
- **dag.nodes** — All nodes including lazy ones. Lazy nodes are NOT in edges.
- **dag.edges** — Only initial-wave dependencies. Lazy nodes are discovered at runtime.
- **rootNodeId** — Usually the `column` node (final output is rendered columns).

---

## Scenarios

### 1. Static Local Data
Use a transform node to supply constant data:

```typescript
{
  id: "local-data",
  type: "transform",
  config: {
    sourceNodeId: "seed-api", // dummy, won't execute
    expression: `[
      { "id": "1", "name": "Alice", "email": "alice@example.com" },
      { "id": "2", "name": "Bob", "email": "bob@example.com" }
    ]`,
  },
}
```

### 2. Server Data with Filtering
Use query params to pass filter state to the API:

```typescript
queryParams: {
  $filter: '$:$params.searchStr ?? ""',
  $status: '$:$params.status ?? "active"',
}
```

### 3. Parallel APIs + Merge
See [Parallel Merges](parallel-merge.md) — two API nodes execute simultaneously, then merge their results.

### 4. Hierarchical Data with Lazy Expansion
See [Tree Table Config](tree-table-config.md) — use `rowExpand` node for lazy child loading.

### 5. Row and Cell Actions
See [Actions](actions.md) — define delete, edit, approve buttons per row.

---

## Next Steps

- **Learn all node types** → [DAG Nodes](dag-nodes.md)
- **Learn JSONata transforms** → [JSONata Transforms](jsonata-transforms.md)
- **Full API reference** → [Config API Reference](config-api-reference.md)
- **Flat/paginated example** → [Flat Table Config](flat-table-config.md)
- **Infinite scroll** → [Infinite Table Config](infinite-table-config.md)
- **Hierarchies** → [Tree Table Config](tree-table-config.md)
- **Parallel APIs** → [Parallel Merges](parallel-merge.md)
- **Row/cell buttons** → [Actions](actions.md)

---

## Design Philosophy

1. **Data-first** — Table structure comes from config, not code. Perfect for server-side definitions.
2. **Composable** — Nodes chain together via edges. Reuse nodes across tables.
3. **Lazy-friendly** — Nodes not in the DAG root path don't execute until needed.
4. **Parallelism** — Wave execution means multiple APIs fetch simultaneously.
5. **Transformable** — JSONata expressions power dynamic field mapping and computed columns.

---

## See Also

- [DataGrid Raw Props](../04-data-modes-non-config/flat-mode.md) — Compare with imperative approach
- [Toolbar Reference](../08-toolbar.md) — Buttons, search, menus, custom handlers
- [Full API Reference](config-api-reference.md) — Complete schema
