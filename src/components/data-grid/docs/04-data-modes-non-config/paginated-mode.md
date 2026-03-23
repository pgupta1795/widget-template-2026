# Paginated Mode (All Features)

Server-driven page loading. Request pages from API.

## Overview

Use paginated mode when:
- Data is too large for one request
- You want to control page size
- Server returns total row count
- You need page controls (first, prev, next, last)

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

export default function PaginatedModeExample() {
  const [pagination, setPagination] = useState({
    pageIndex: 0,
    pageSize: 10,
  });

  const fetchPage = async (pageIndex = 0) => {
    // Call your API
    const pageSize = 10;
    const response = await fetch(
      `/api/users?page=${pageIndex}&limit=${pageSize}`
    );
    const { rows, total } = await response.json();

    return {
      rows,
      total,
    };
  };

  const handleMutate = async (rowId, columnId, value) => {
    // Simulate server mutation
    console.log(`Updating ${rowId}.${columnId} to ${value}`);
    return { success: true };
  };

  return (
    <div style={{ height: "600px" }}>
      <DataGrid
        queryFn={fetchPage}
        columns={[
          stringColumn("name", "Name"),
          stringColumn("email", "Email"),
          numberColumn("age", "Age"),
          selectColumn("department", "Department", [
            { label: "Engineering", value: "Engineering" },
            { label: "Design", value: "Design" },
            { label: "Sales", value: "Sales" },
          ]),
          dateColumn("joinDate", "Join Date"),
          booleanColumn("active", "Active"),
        ]}
        mode="paginated"
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

## API Contract

Your `queryFn` should accept a page index and return:

```tsx
async (pageIndex: number) => {
  return {
    rows: Array,      // Rows for this page
    total: number,    // Total row count across all pages
  };
}
```

## Example API Implementation

```tsx
// Backend (Node.js / Express example)
app.get("/api/users", (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const offset = page * limit;

  // Fetch from database
  const rows = db.users.slice(offset, offset + limit);
  const total = db.users.length;

  res.json({ rows, total });
});
```

## Pagination Controls

The DataGrid automatically renders:
- Page size selector (default: 10, 20, 50)
- First, Previous, Next, Last buttons
- Current page indicator (e.g., "Page 1 of 5")

No additional setup required.

## See Also

- [Progressive Walkthrough](../02-progressive-walkthrough.md) — Step 6
- [Data Modes Overview](#overview)
- [API Reference](../07-api-reference.md)
