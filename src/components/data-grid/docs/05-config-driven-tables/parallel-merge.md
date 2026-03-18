# Parallel APIs and Merge Strategies

Fetch from multiple APIs in parallel and combine their results using the `merge` node.

---

## DAG Wave Execution

The DAG engine organizes nodes into **execution waves**. Nodes in the same wave with no dependencies run **in parallel** using `Promise.all()`.

Example DAG:
```
Wave 0:  api-engineers    api-projects
              │               │
              └───────┬───────┘
                      ↓
Wave 1:          merge-data
                      │
                      ↓
Wave 2:           columns
```

Both APIs fetch simultaneously, improving performance.

---

## Merge Strategies

| Strategy | Behavior | Use Case | Example |
|----------|----------|----------|---------|
| **concat** | Flatten arrays. Append all sources. | Combine two independent lists | Projects + Tasks → single list |
| **join** | Left-outer join on `joinKey`. | Enrich rows from primary source with secondary data | Engineers + Assignments → enrich each engineer |
| **merge** | Positional zip (index-based). Use `id` from first source. | Parallel fetches of same structure | Primary data + backup data |

---

## Example 1: Concat Strategy

Combine two independent lists (projects and tasks) into one flat table:

```typescript
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

export const projectsTasksConfig: DAGTableConfig = {
  tableId: "projects-tasks",
  mode: "flat",

  dag: {
    nodes: [
      // Wave 0: Fetch projects (parallel)
      {
        id: "api-projects",
        type: "api",
        config: {
          url: "/api/projects",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `
            projects.{
              "id": id,
              "name": name,
              "type": "project",
              "owner": owner,
              "status": status,
              "start": startDate
            }
          `,
        },
      },

      // Wave 0: Fetch tasks (parallel with projects)
      {
        id: "api-tasks",
        type: "api",
        config: {
          url: "/api/tasks",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `
            tasks.{
              "id": id,
              "name": name,
              "type": "task",
              "owner": assignee,
              "status": status,
              "start": createdDate
            }
          `,
        },
      },

      // Wave 1: Merge both lists
      {
        id: "merged",
        type: "merge",
        config: {
          sourceNodeIds: ["api-projects", "api-tasks"],
          strategy: "concat", // Flatten into one list
        },
      },

      // Wave 2: Define columns
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true },
            {
              field: "type",
              header: "Type",
              renderType: "badge",
              valueExpr: `type = "project" ? "📊 Project" : "✓ Task"`,
              width: 100,
            },
            { field: "owner", header: "Owner", sortable: true },
            {
              field: "status",
              header: "Status",
              renderType: "badge",
              width: 120,
            },
            { field: "start", header: "Start Date", type: "date" },
          ],
        },
      },
    ],

    edges: [
      { from: "api-projects", to: "merged" },
      { from: "api-tasks", to: "merged" },
      { from: "merged", to: "columns" },
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

## Example 2: Join Strategy

Enrich engineers with project assignments on `engineerId`:

```typescript
export const engineersProjectsConfig: DAGTableConfig = {
  tableId: "engineers-projects",
  mode: "flat",

  dag: {
    nodes: [
      // Wave 0: Fetch primary data (engineers)
      {
        id: "api-engineers",
        type: "api",
        config: {
          url: "/api/engineers",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `
            members.{
              "engineerId": id,
              "name": name,
              "email": email,
              "department": dept,
              "salary": $number(compensation)
            }
          `,
        },
      },

      // Wave 0: Fetch secondary data (assignments)
      {
        id: "api-assignments",
        type: "api",
        config: {
          url: "/api/assignments",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `
            assignments.{
              "engineerId": engineer_id,
              "projectName": project_name,
              "hoursAllocated": hours,
              "role": role
            }
          `,
        },
      },

      // Wave 1: Join engineers ← assignments on engineerId
      // Each engineer row gets all matching assignment fields
      {
        id: "merged",
        type: "merge",
        config: {
          sourceNodeIds: ["api-engineers", "api-assignments"],
          strategy: "join",
          joinKey: "engineerId", // Join on this field
        },
      },

      // Wave 2: Define columns
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Engineer", sortable: true },
            { field: "email", header: "Email" },
            { field: "department", header: "Dept", sortable: true },
            { field: "projectName", header: "Assigned Project" },
            {
              field: "hoursAllocated",
              header: "Hours",
              type: "number",
              valueExpr: `hoursAllocated ?? 0`,
            },
            { field: "role", header: "Role" },
            {
              field: "salary",
              header: "Salary",
              type: "number",
              valueExpr: `"$" & $string(salary)`,
              classNameCell: "text-right",
            },
          ],
        },
      },
    ],

    edges: [
      { from: "api-engineers", to: "merged" },
      { from: "api-assignments", to: "merged" },
      { from: "merged", to: "columns" },
    ],
    rootNodeId: "columns",
  },

  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
    selection: { enabled: true },
  },
};
```

**Join Behavior:**
- Left-outer join: All engineers appear, even if no assignments
- Multiple matches: Each engineer-assignment pair becomes a row (duplication)
- Missing assignment fields: `null`

Example merge output:
```json
[
  { "engineerId": "1", "name": "Alice", "email": "alice@...", "department": "eng", "salary": 120000, "projectName": "ProjectA", "hoursAllocated": 40, "role": "Lead" },
  { "engineerId": "1", "name": "Alice", "email": "alice@...", "department": "eng", "salary": 120000, "projectName": "ProjectB", "hoursAllocated": 20, "role": "Contributor" },
  { "engineerId": "2", "name": "Bob", "email": "bob@...", "department": "eng", "salary": 100000, "projectName": null, "hoursAllocated": null, "role": null }
]
```

Alice appears twice (one per project), Bob appears once (no assignments).

---

## Example 3: Merge Strategy (Positional Zip)

Combine two APIs with identical structure side-by-side (rarely used):

```typescript
export const primaryBackupConfig: DAGTableConfig = {
  tableId: "primary-backup",
  mode: "flat",

  dag: {
    nodes: [
      {
        id: "api-primary",
        type: "api",
        config: {
          url: "/api/primary-data",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `data.{ "id": id, "value": value }`,
        },
      },

      {
        id: "api-backup",
        type: "api",
        config: {
          url: "/api/backup-data",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `data.{ "id": id, "value": value }`,
        },
      },

      {
        id: "merged",
        type: "merge",
        config: {
          sourceNodeIds: ["api-primary", "api-backup"],
          strategy: "merge", // Positional zip
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "id", header: "ID" },
            { field: "value", header: "Value" },
          ],
        },
      },
    ],

    edges: [
      { from: "api-primary", to: "merged" },
      { from: "api-backup", to: "merged" },
      { from: "merged", to: "columns" },
    ],
    rootNodeId: "columns",
  },
};
```

---

## Example 4: Three-Way Merge + Transform

Fetch from three APIs, merge, then compute derived fields:

```typescript
export const fullProfileConfig: DAGTableConfig = {
  tableId: "full-profile",
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
          responseTransform: `members.{ "id": id, "name": name, "email": email }`,
        },
      },

      {
        id: "api-assignments",
        type: "api",
        config: {
          url: "/api/assignments",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `assignments.{ "engineerId": engineer_id, "projectCount": $count(projects), "hours": total_hours }`,
        },
      },

      {
        id: "api-reviews",
        type: "api",
        config: {
          url: "/api/reviews",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `reviews.{ "engineerId": engineer_id, "rating": average_rating, "reviewCount": $count(reviews) }`,
        },
      },

      {
        id: "merged-all",
        type: "merge",
        config: {
          sourceNodeIds: ["api-engineers", "api-assignments", "api-reviews"],
          strategy: "join",
          joinKey: "id", // or "engineerId" for assignments/reviews
        },
      },

      {
        id: "enrich",
        type: "transform",
        config: {
          sourceNodeId: "merged-all",
          expression: `
            $.{
              "id": id,
              "name": name,
              "email": email,
              "projectCount": projectCount ?? 0,
              "rating": rating ?? 0,
              "utilization": $round((hours ?? 0) / 40 * 100, 1),
              "score": (rating ?? 0) * 10 + (projectCount ?? 0) * 5
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
            { field: "projectCount", header: "Projects", type: "number" },
            { field: "rating", header: "Avg Rating", type: "number" },
            { field: "utilization", header: "Utilization %", type: "number" },
            { field: "score", header: "Score", type: "number", sortable: true },
          ],
        },
      },
    ],

    edges: [
      { from: "api-engineers", to: "merged-all" },
      { from: "api-assignments", to: "merged-all" },
      { from: "api-reviews", to: "merged-all" },
      { from: "merged-all", to: "enrich" },
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

## Performance Benefits

- **Parallel fetching:** Multiple APIs execute simultaneously
- **Single refetch:** One React Query key per table (no N+1 queries)
- **Declarative:** Config is portable and reusable

---

## Join Semantics

### Left-Outer Join (Current Behavior)
- All rows from the first source appear
- Unmatched rows get `null` for second source fields
- Duplicate rows if multiple matches in second source

### Null Handling
Use `?? ` (coalesce) in JSONata to provide defaults:
```jsonata
hoursAllocated ?? 0  // Default to 0 if null
```

---

## See Also

- [Config Basics](config-basics.md) — DAG execution model
- [DAG Nodes](dag-nodes.md) — Merge node details
- [JSONata Transforms](jsonata-transforms.md) — Transform after merge
- [Flat Table Config](flat-table-config.md) — Single API example
- [Infinite Table Config](infinite-table-config.md) — Paginated merges
