# Custom Features

Write feature hooks to extend grid behavior.

## Overview

Features are modular hooks that add behavior:
- Sorting, filtering, selection (built-in)
- Custom aggregation, export, validation (your code)

## Example: Export to CSV Feature

```tsx
// src/components/data-grid/features/export/use-export.ts
import { Table } from "@tanstack/react-table";

export function useExport<TData extends Record<string, any>>(
  table: Table<TData>
) {
  const exportCSV = () => {
    const rows = table.getRowModel().rows;
    const columns = table.getVisibleLeafColumns();

    // Build CSV header
    const header = columns.map((col) => col.columnDef.header).join(",");

    // Build CSV rows
    const csv = rows
      .map((row) =>
        columns
          .map((col) => {
            const value = row.getValue(col.id);
            return typeof value === "string" ? `"${value}"` : value;
          })
          .join(",")
      )
      .join("\n");

    // Download
    const blob = new Blob([header + "\n" + csv], {
      type: "text/csv",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "data.csv";
    link.click();
  };

  return { exportCSV };
}
```

Then use it in your component:

```tsx
import { useExport } from "@/components/data-grid/features/export/use-export";

export function MyGrid() {
  const table = useDataGrid(/* ... */);
  const { exportCSV } = useExport(table.table);

  return (
    <div>
      <button onClick={exportCSV}>Export CSV</button>
      <DataGrid table={table} />
    </div>
  );
}
```

## Key Concepts

1. **Hook Pattern** — Features are React hooks
2. **Table Instance** — Hooks receive the TanStack `Table` instance
3. **Row/Column Access** — Use `table.getRowModel()`, `table.getVisibleLeafColumns()`, etc.
4. **State Management** — Manage feature state locally or in context

## See Also

- [Editing Feature](../03-features/editing.md) — Example of a built-in feature
- [API Reference](../07-api-reference.md) — Table instance methods
