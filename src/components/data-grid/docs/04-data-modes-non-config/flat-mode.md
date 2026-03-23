# Flat Mode (All Features)

Local data, all features enabled. No server calls.

## Overview

Use flat mode when:
- All data fits in memory
- You want client-side sorting, filtering, grouping
- No pagination or lazy loading needed

## Full Example with All Features

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

// Sample data
const users = [
  {
    id: "1",
    name: "Alice Chen",
    email: "alice@example.com",
    age: 30,
    department: "Engineering",
    role: "Senior Engineer",
    joinDate: "2020-03-15",
    active: true,
  },
  {
    id: "2",
    name: "Bob Smith",
    email: "bob@example.com",
    age: 25,
    department: "Design",
    role: "Designer",
    joinDate: "2022-01-10",
    active: true,
  },
  {
    id: "3",
    name: "Carol White",
    email: "carol@example.com",
    age: 35,
    department: "Sales",
    role: "Sales Lead",
    joinDate: "2019-06-01",
    active: false,
  },
  // ... more rows
];

// Define columns
const columns = [
  stringColumn("name", "Name"),
  stringColumn("email", "Email"),
  numberColumn("age", "Age"),
  selectColumn("department", "Department", [
    { label: "Engineering", value: "Engineering" },
    { label: "Design", value: "Design" },
    { label: "Sales", value: "Sales" },
  ]),
  selectColumn("role", "Role", [
    { label: "Senior Engineer", value: "Senior Engineer" },
    { label: "Engineer", value: "Engineer" },
    { label: "Designer", value: "Designer" },
    { label: "Sales Lead", value: "Sales Lead" },
  ]),
  dateColumn("joinDate", "Join Date"),
  booleanColumn("active", "Active"),
];

export default function FlatModeExample() {
  const [rowSelection, setRowSelection] = useState({});

  const handleMutate = async (rowId, columnId, value) => {
    // Simulate server mutation
    console.log(`Updating ${rowId}.${columnId} to ${value}`);
    return { success: true };
  };

  return (
    <div style={{ height: "600px" }}>
      <DataGrid
        data={users}
        columns={columns}
        mode="flat"
        features={{
          sorting: {
            enabled: true,
            initialState: { sorting: [{ id: "name", desc: false }] },
          },
          filtering: {
            enabled: true,
            filterRow: true,
          },
          selection: {
            enabled: true,
            onSelectionChange: setRowSelection,
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

## Features Enabled

- ✅ **Sorting**: Click headers to sort
- ✅ **Filtering**: Filter inputs in header row
- ✅ **Selection**: Row checkboxes
- ✅ **Pinning**: Name column pinned left
- ✅ **Grouping**: Group by department
- ✅ **Editing**: Double-click cells to edit
- ✅ **Virtualization**: Smooth scrolling for large datasets

## Data Requirements

```tsx
// Each row is an object
{
  id: "1",           // Required: unique identifier
  name: "Alice",     // Match column field names
  age: 30,
  email: "...",
  // ... other fields
}
```

## See Also

- [Progressive Walkthrough](../02-progressive-walkthrough.md) — Step 1
- [Feature Reference](../03-features/)
- [API Reference](../07-api-reference.md)
