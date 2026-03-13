# API Reference

Complete reference for DataGrid component, columns, types, and hooks.

## DataGrid Component

```tsx
<DataGrid<TData>
  // Data (choose one)
  data?: TData[];                    // Local data (flat mode)
  queryFn?: (pageParam?: any) => Promise<{  // Server data (paginated/infinite/tree)
    rows: TData[];
    total?: number;                  // For paginated
    nextPage?: any;                  // For infinite
  }>;

  // Column Definition
  columns: ColumnDef<TData>[];       // TanStack column definitions

  // Mode
  mode?: "flat" | "paginated" | "infinite" | "tree";

  // Tree Options (tree mode only)
  getSubRows?: (row: TData) => TData[] | undefined;
  onExpand?: (rowId: string) => Promise<TData[]>;

  // Features
  features?: {
    sorting?: { enabled?: boolean; initialState?: SortingState };
    filtering?: { enabled?: boolean; filterRow?: boolean };
    selection?: { enabled?: boolean };
    pinning?: { enabled?: boolean };
    grouping?: { enabled?: boolean; groupBy?: string[] };
    editing?: { enabled?: boolean; onMutate?: (rowId: string, columnId: string, value: any) => Promise<any> };
    virtualization?: { enabled?: boolean };
  };

  // UI
  density?: "default" | "compact" | "loose";
  className?: string;
  style?: CSSProperties;
/>
```

## Column Factories

### stringColumn

```tsx
stringColumn(id: string, header: string, options?: {
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
})
```

### numberColumn

```tsx
numberColumn(id: string, header: string, options?: {
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  format?: (value: number) => string;
})
```

### dateColumn

```tsx
dateColumn(id: string, header: string, options?: {
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
  format?: (date: Date | string) => string;
})
```

### selectColumn

```tsx
selectColumn(
  id: string,
  header: string,
  options: Array<{ label: string; value: string }>,
  columnOptions?: {
    width?: number;
    sortable?: boolean;
    filterable?: boolean;
    editable?: boolean;
  }
)
```

### booleanColumn

```tsx
booleanColumn(id: string, header: string, options?: {
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
})
```

### multiValueColumn

```tsx
multiValueColumn(id: string, header: string, options?: {
  width?: number;
  sortable?: boolean;
  filterable?: boolean;
  editable?: boolean;
})
```

### codeColumn

```tsx
codeColumn(id: string, header: string, options?: {
  width?: number;
  language?: string;
  sortable?: boolean;
  filterable?: boolean;
})
```

## Hooks

### useDataGrid

```tsx
const gridInstance = useDataGrid<TData>({
  data?: TData[];
  queryFn?: (pageParam?: any) => Promise<...>;
  columns: ColumnDef<TData>[];
  mode?: "flat" | "paginated" | "infinite" | "tree";
  features?: FeaturesConfig;
  // ... other options
});

// Returns:
{
  table: Table<TData>;          // TanStack Table instance
  features: {
    sorting: SortingState;
    filtering: FilterValue;
    selection: RowSelectionState;
    // ... other feature state
  };
  isLoading: boolean;
  error: Error | null;
}
```

## Types

### SortingState

```tsx
Array<{ id: string; desc: boolean }>
```

### ColumnVisibilityState

```tsx
Record<string, boolean>
```

### RowSelectionState

```tsx
Record<string, boolean>
```

### FilterValue

```tsx
// Depends on column type
string | number | [number, number] | { from?: string; to?: string } | string[]
```

## ConfiguredTable (Config-Driven)

```tsx
import { ConfiguredTable } from "@/components/data-grid/table-engine";

<ConfiguredTable
  config={{
    name: string;
    mode: "flat" | "paginated" | "infinite" | "tree";
    columns: ColumnConfig[];
    features: FeaturesConfig;
    dataSource: DataSourceConfig;
  }}
/>
```

See [Config API Reference](05-config-driven-tables/config-api-reference.md) for full schema.

---

## Complete Example

```tsx
import { DataGrid } from "@/components/data-grid";
import { stringColumn, numberColumn } from "@/components/data-grid/columns";
import { useState } from "react";

const users = [
  { id: "1", name: "Alice", age: 30 },
  { id: "2", name: "Bob", age: 25 },
];

const columns = [
  stringColumn("name", "Name"),
  numberColumn("age", "Age"),
];

export default function App() {
  const [selection, setSelection] = useState({});

  return (
    <DataGrid
      data={users}
      columns={columns}
      mode="flat"
      features={{
        sorting: { enabled: true },
        filtering: { enabled: true, filterRow: true },
        selection: { enabled: true },
        editing: { enabled: true },
        virtualization: { enabled: true },
      }}
      onSelectionChange={setSelection}
    />
  );
}
```

---

## See Also

- [Quick Start](01-quick-start.md)
- [Features](03-features/)
- [Data Modes](04-data-modes-non-config/)
- [Config-Driven](05-config-driven-tables/)
- [Customization](06-customization/)
