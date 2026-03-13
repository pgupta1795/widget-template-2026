# Infinite Mode (All Features)

Cursor/offset-based incremental loading. Load as user scrolls.

## Overview

Use infinite mode when:
- Data arrives as a stream (social feed, comments)
- You don't want page controls
- You want to load more on scroll
- Server returns a cursor/next page identifier

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

export default function InfiniteModeExample() {
  const fetchMore = async (pageParam = 0) => {
    // Simulate server fetch
    // In real app, pageParam might be a cursor string
    const offset = pageParam * 10;
    const limit = 10;

    const response = await fetch(
      `/api/users?offset=${offset}&limit=${limit}`
    );
    const { rows, hasMore } = await response.json();

    return {
      rows,
      nextPage: hasMore ? offset + limit : null,
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
        queryFn={fetchMore}
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
        mode="infinite"
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

Your `queryFn` should accept a page parameter and return:

```tsx
async (pageParam) => {
  return {
    rows: Array,        // Rows for this batch
    nextPage: any,      // Next page param (or null if done)
  };
}
```

## Example API Implementation

```tsx
// Backend (Node.js / Express example)
app.get("/api/users", (req, res) => {
  const offset = parseInt(req.query.offset) || 0;
  const limit = parseInt(req.query.limit) || 10;

  // Fetch from database
  const rows = db.users.slice(offset, offset + limit);
  const hasMore = offset + limit < db.users.length;

  res.json({
    rows,
    hasMore,
  });
});
```

## Scroll Behavior

- User scrolls down table
- Last rows are visible on screen
- `queryFn` is called with the `nextPage` value from previous response
- More rows are appended to the table
- Process repeats until `nextPage` is null (no more data)

## No Pagination Controls

Unlike paginated mode, infinite mode does not render:
- Page size selector
- First/Last/Previous/Next buttons
- Page indicator

Users simply scroll and load more automatically.

## Loading States

The grid shows:
- Loading skeleton when fetching initial data
- Loading indicator at bottom when fetching more rows
- Empty state if no rows found

## Cursor-Based Pagination

For cursor-based APIs, return the cursor as `nextPage`:

```tsx
async (cursor = null) => {
  const response = await fetch(`/api/users?cursor=${cursor}`);
  const { rows, nextCursor, hasMore } = await response.json();

  return {
    rows,
    nextPage: hasMore ? nextCursor : null,
  };
}
```

## See Also

- [Progressive Walkthrough](../02-progressive-walkthrough.md) — Step 5
- [Data Modes Overview](#overview)
- [API Reference](../07-api-reference.md)
