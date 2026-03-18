# API Reference

Complete reference for DataGrid component, columns, types, and hooks.

## DataGrid Component

| Prop | Type | Description |
|------|------|-------------|
| `data` | `TData[]` | Local data (flat / tree modes). |
| `queryKey` | `QueryKey` | React Query key for paginated / infinite modes. |
| `queryFn` | `PaginatedQueryFn \| InfiniteQueryFn` | Fetch function for server-side modes. |
| `columns` | `GridColumnDef<TData>[]` | Column definitions — use column factories. |
| `mode` | `"flat" \| "paginated" \| "infinite" \| "tree"` | Operational mode. Default: `"flat"`. |
| `density` | `"compact" \| "normal" \| "comfortable"` | Row/cell spacing. Default: `"normal"`. |
| `features` | `GridFeaturesConfig` | Feature flags — sorting, filtering, selection, editing, etc. |
| `slots` | `GridSlots` | Custom render slots (toolbar, pagination, etc.). |
| `className` | `string` | CSS class on the root container. |
| `getSubRows` | `(row: TData) => TData[] \| undefined` | Resolve child rows (tree mode). |
| `onExpand` | `(row: GridRow) => Promise<GridRow[]> \| void` | Lazy-load children for a tree row. |
| `isRefetching` | `boolean` | External refetch indicator (spins the refresh icon). |
| `isFetchingNextPage` | `boolean` | Infinite scroll — next page loading indicator. |
| `isLoading` | `boolean` | Initial loading indicator (shows skeleton). |
| `hasNextPage` | `boolean` | Infinite scroll — whether more pages exist. |
| `fetchNextPage` | `() => void` | Infinite scroll — fetch the next page. |
| `onRefresh` | `() => void` | Called when the built-in `refresh` toolbar button is clicked. |
| `initialColumnVisibility` | `Record<string, boolean>` | Initial column hidden/visible state. Set automatically by `ConfiguredTable`. |
| `toolbarCommands` | `ToolbarCommand[]` | Toolbar command definitions. `undefined` = no toolbar. `[]` = empty bar. |
| `toolbarClassName` | `string` | CSS class merged onto the toolbar bar element only. |
| `onSearch` | `(paramName: string, query: string) => void` | Server-side search relay (called by search toolbar commands with `action` set). |
| `onExecuteNode` | `(nodeId: string) => Promise<GridRow[]>` | DAG API node executor — wired by `ConfiguredTable`. |
| `onAction` | `(actionId: string, row?: GridRow) => Promise<void>` | Row/cell/toolbar action handler — wired by `ConfiguredTable`. |

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
```

| Prop | Type | Description |
|------|------|-------------|
| `config` | `DAGTableConfig` | Full table configuration including DAG, columns, features, toolbar. |
| `className` | `string` | CSS class on the root container. |
| `params` | `Record<string, JsonPrimitive>` | Runtime params injected into the DAG (e.g. `{ nodeId: "abc" }`). |
| `toolbarCommands` | `ToolbarCommand[]` | Consumer toolbar overrides. Merged with `config.toolbarCommands` via `mergeToolbarCommands`. |
| `toolbarClassName` | `string` | CSS class merged onto the toolbar bar element. |

See [Config API Reference](05-config-driven-tables/config-api-reference.md) for full `DAGTableConfig` schema, including `toolbarCommands`.
See [Toolbar](08-toolbar.md) for full toolbar command reference.

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
- [Toolbar](08-toolbar.md)
- [Customization](06-customization/)
