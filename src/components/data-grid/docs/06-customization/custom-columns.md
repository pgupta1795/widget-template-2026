# Custom Columns

Create column types beyond the built-in defaults.

## Overview

Built-in types: string, number, boolean, date, select, multi-value, code.

Need something custom? Extend the column factory pattern.

## Example: Password Column (Masked Text)

```tsx
// src/components/data-grid/columns/password-column.tsx
import { ColumnDef } from "@tanstack/react-table";
import { PasswordCell } from "./password-cell";

export function passwordColumn(
  id: string,
  header: string
): ColumnDef<any> {
  return {
    accessorKey: id,
    header,
    cell: (info) => <PasswordCell value={info.getValue()} />,
    size: 180,
    meta: {
      type: "password",
      filterable: false,  // Don't filter passwords
      editable: false,    // Can't edit inline
    },
  };
}

// src/components/data-grid/columns/password-cell.tsx
export function PasswordCell({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
      <span>{show ? value : "●●●●●●●●"}</span>
      <button onClick={() => setShow(!show)}>
        {show ? "Hide" : "Show"}
      </button>
    </div>
  );
}
```

Then use it:

```tsx
const columns = [
  stringColumn("username", "Username"),
  passwordColumn("password", "Password"),  // Custom!
];

<DataGrid data={data} columns={columns} mode="flat" />
```

## Example: Star Rating Column

```tsx
// src/components/data-grid/columns/rating-column.tsx
import { ColumnDef } from "@tanstack/react-table";

export function ratingColumn(id: string, header: string): ColumnDef<any> {
  return {
    accessorKey: id,
    header,
    cell: (info) => <RatingCell value={info.getValue()} />,
    size: 100,
    meta: {
      type: "rating",
      editable: true,  // Can edit the rating
    },
  };
}

// src/components/data-grid/columns/rating-cell.tsx
export function RatingCell({ value }: { value: number }) {
  return (
    <div style={{ display: "flex", gap: "2px" }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} style={{ cursor: "pointer", fontSize: "20px" }}>
          {star <= value ? "⭐" : "☆"}
        </span>
      ))}
    </div>
  );
}
```

## Key Concepts

1. **Column Definition** — TanStack `ColumnDef<TData>` object
2. **Accessors** — How to get the value from row data
3. **Cell Renderer** — React component to display the cell
4. **Meta** — Grid-specific metadata (type, editable, filterable, etc.)
5. **Size** — Column width in pixels

## See Also

- [API Reference](../07-api-reference.md) — ColumnDef contract
- [Custom Editors](custom-editors.md) — Pair with custom editor for inline edit
- [Raw Props Alternative](../04-data-modes-non-config/flat-mode.md) — See columns in action
