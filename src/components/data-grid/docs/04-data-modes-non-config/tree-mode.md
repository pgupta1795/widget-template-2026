# Tree Mode (All Features)

Hierarchical rows with lazy async expansion.

## Overview

Use tree mode when:
- Data is hierarchical (org charts, file trees, category hierarchies)
- Children are pre-loaded or fetched on expand
- You want expand/collapse toggles on parent rows

## Full Example

```tsx
import { useState } from "react";
import { DataGrid } from "@/components/data-grid";
import {
  stringColumn,
  numberColumn,
  dateColumn,
  selectColumn,
  booleanColumn,
} from "@/columns";

// Sample hierarchical data
const departments = [
  {
    id: "eng",
    name: "Engineering",
    manager: "Alice Chen",
    headcount: 5,
    joinDate: "2020-01-15",
    budget: "500k",
    children: [
      {
        id: "eng-1",
        name: "John Doe",
        manager: "Alice Chen",
        headcount: 0,
        joinDate: "2020-06-01",
        budget: "120k",
        children: [],
      },
      {
        id: "eng-2",
        name: "Jane Smith",
        manager: "Alice Chen",
        headcount: 0,
        joinDate: "2021-03-15",
        budget: "130k",
        children: [],
      },
    ],
  },
  {
    id: "sales",
    name: "Sales",
    manager: "Carol White",
    headcount: 3,
    joinDate: "2019-01-01",
    budget: "300k",
    children: [
      {
        id: "sales-1",
        name: "Bob Johnson",
        manager: "Carol White",
        headcount: 0,
        joinDate: "2021-06-01",
        budget: "100k",
        children: [],
      },
    ],
  },
];

export default function TreeModeExample() {
  const [expanded, setExpanded] = useState({});

  const handleExpand = async (rowId) => {
    // Optionally fetch children from server for lazy loading
    console.log(`Expanding ${rowId}`);
    // In a real app, you might fetch:
    // const children = await fetchChildren(rowId);
    // return children;
    return [];  // Return empty if pre-loaded in data
  };

  const handleMutate = async (rowId, columnId, value) => {
    // Simulate server mutation
    console.log(`Updating ${rowId}.${columnId} to ${value}`);
    return { success: true };
  };

  return (
    <div style={{ height: "600px" }}>
      <DataGrid
        data={departments}
        columns={[
          stringColumn("name", "Name"),
          stringColumn("manager", "Manager"),
          numberColumn("headcount", "Headcount"),
          dateColumn("joinDate", "Join Date"),
          stringColumn("budget", "Budget"),
        ]}
        mode="tree"
        getSubRows={(row) => row.children || []}
        onExpand={handleExpand}
        features={{
          sorting: {
            enabled: true,
          },
          filtering: {
            enabled: true,
            filterRow: true,
          },
          selection: {
            enabled: true,
          },
          pinning: {
            enabled: true,
            columnPinningLeft: ["name"],
          },
          grouping: {
            enabled: true,
          },
          editing: {
            enabled: true,
            onMutate: handleMutate,
          },
          virtualization: {
            enabled: true,
          },
        }}
      />
    </div>
  );
}
```

## Data Shape

```tsx
{
  id: "eng",
  name: "Engineering",
  manager: "Alice",
  headcount: 5,
  // ... other fields matching your columns
  children: [
    {
      id: "eng-1",
      name: "John",
      manager: "Alice",
      headcount: 0,
      children: [],
    },
    {
      id: "eng-2",
      name: "Jane",
      manager: "Alice",
      headcount: 0,
      children: [],
    },
  ],
}
```

## Expand Toggle

The first column automatically shows:
- Expand/collapse button on parent rows
- Nothing on leaf rows
- Indentation based on nesting level

## Lazy Loading Children

To fetch children on expand instead of pre-loading:

```tsx
const handleExpand = async (rowId) => {
  // Fetch from server
  const response = await fetch(`/api/items/${rowId}/children`);
  const children = await response.json();
  return children;
};

<DataGrid
  data={departments}
  columns={columns}
  mode="tree"
  getSubRows={(row) => row.children || []}
  onExpand={handleExpand}  // Called when user clicks expand
/>
```

## Example API Implementation

```tsx
// Backend (Node.js / Express example)
app.get("/api/items/:id/children", async (req, res) => {
  const { id } = req.params;

  // Fetch from database
  const children = await db.query(
    "SELECT * FROM items WHERE parent_id = ?",
    [id]
  );

  res.json(children);
});
```

## Pre-Loaded vs. Lazy-Loaded

### Pre-Loaded Children

Include all children in initial data:

```tsx
const data = [
  {
    id: "1",
    name: "Parent",
    children: [
      { id: "1-1", name: "Child 1", children: [] },
      { id: "1-2", name: "Child 2", children: [] },
    ],
  },
];

<DataGrid
  data={data}
  mode="tree"
  getSubRows={(row) => row.children || []}
/>
```

### Lazy-Loaded Children

Fetch on expand:

```tsx
const data = [
  {
    id: "1",
    name: "Parent (click expand)",
    children: [],  // Start empty
  },
];

const handleExpand = async (rowId) => {
  const children = await fetchChildren(rowId);
  return children;
};

<DataGrid
  data={data}
  mode="tree"
  getSubRows={(row) => row.children || []}
  onExpand={handleExpand}
/>
```

## Features in Tree Mode

- ✅ **Sorting**: Sorts within each level
- ✅ **Filtering**: Filters all rows regardless of parent expansion
- ✅ **Selection**: Select individual or all rows
- ✅ **Pinning**: Pin columns or rows
- ✅ **Grouping**: Group within expanded parent rows
- ✅ **Editing**: Edit any cell inline
- ✅ **Virtualization**: Renders only visible rows for performance

## Common Use Cases

### Org Chart

```tsx
const departments = [
  {
    id: "cto",
    name: "CTO",
    title: "Chief Technology Officer",
    children: [
      {
        id: "eng",
        name: "Engineering Director",
        title: "Lead Engineer",
        children: [
          { id: "eng-1", name: "Engineer 1", title: "Senior Engineer", children: [] },
          { id: "eng-2", name: "Engineer 2", title: "Junior Engineer", children: [] },
        ],
      },
    ],
  },
];
```

### File Browser

```tsx
const files = [
  {
    id: "src",
    name: "src/",
    type: "folder",
    size: "256 KB",
    children: [
      { id: "src-app", name: "App.tsx", type: "file", size: "5.2 KB", children: [] },
      { id: "src-index", name: "index.ts", type: "file", size: "1.3 KB", children: [] },
    ],
  },
];
```

### Category Hierarchy

```tsx
const categories = [
  {
    id: "electronics",
    name: "Electronics",
    productCount: 150,
    children: [
      { id: "phones", name: "Phones", productCount: 45, children: [] },
      { id: "laptops", name: "Laptops", productCount: 30, children: [] },
    ],
  },
];
```

## See Also

- [Progressive Walkthrough](../02-progressive-walkthrough.md) — Step 4
- [Tree Expansion Feature](../03-features/tree-expansion.md)
- [Data Modes Overview](#overview)
- [API Reference](../07-api-reference.md)
