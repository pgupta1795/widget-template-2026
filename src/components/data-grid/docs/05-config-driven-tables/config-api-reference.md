# Config API Reference

Complete schema for table configuration.

## Root Config

```typescript
{
  name: string;              // Unique table name
  description?: string;       // What this table does
  mode: "flat" | "paginated" | "infinite" | "tree";
  columns: ColumnConfig[];
  features: FeaturesConfig;
  dataSource: DataSourceConfig;
  ui?: UIConfig;
}
```

## ColumnConfig

```typescript
{
  id: string;                        // Field name in data
  type: "string" | "number" | "boolean" | "date" | "select" | "multi-value" | "code";
  label: string;                     // Display header
  width?: number;                    // Column width in pixels (default: auto)
  sortable?: boolean;                // Allow sort (default: true)
  filterable?: boolean;              // Allow filter (default: true)
  editable?: boolean;                // Allow inline edit (default: false)

  // For select columns:
  options?: Array<{
    label: string;
    value: string;
  }>;

  // For computed columns:
  expr?: string;                     // JSONata expression
}
```

## FeaturesConfig

```typescript
{
  sorting?: {
    enabled: boolean;
    defaultSort?: Array<{
      id: string;
      desc: boolean;
    }>;
  };

  filtering?: {
    enabled: boolean;
    filterRow?: boolean;  // Show filter inputs in header
    defaultFilters?: Array<{
      id: string;
      value: any;
    }>;
  };

  selection?: {
    enabled: boolean;
    initialSelected?: string[];
  };

  pinning?: {
    enabled: boolean;
    columnPinningLeft?: string[];
    columnPinningRight?: string[];
  };

  grouping?: {
    enabled: boolean;
    groupBy?: string[];
  };

  editing?: {
    enabled: boolean;
    onMutate?: (rowId: string, columnId: string, value: any) => Promise<any>;
  };

  virtualization?: {
    enabled: boolean;
    overscan?: number;  // Rows to render beyond viewport
  };
}
```

## DataSourceConfig

### Local Data

```typescript
{
  type: "local";
  data: Array<any>;
}
```

### Paginated

```typescript
{
  type: "paginated";
  fetchFn: (pageIndex: number) => Promise<{
    rows: Array<any>;
    total: number;
  }>;
}
```

### Infinite

```typescript
{
  type: "infinite";
  fetchFn: (pageParam?: any) => Promise<{
    rows: Array<any>;
    nextPage: any | null;
  }>;
}
```

### Tree

```typescript
{
  type: "tree";
  data: Array<any>;
  getSubRows?: string | ((row: any) => any[]);  // Path or function
  onExpand?: (rowId: string) => Promise<any[]>;  // Optional lazy load
}
```

## UIConfig

```typescript
{
  density?: "default" | "compact" | "loose";
  pageSize?: number;  // Rows per view (for virtualization)
}
```

---

## Usage Example

```tsx
import { ConfiguredTable } from "@/components/data-grid/table-engine";

const config = {
  name: "users",
  description: "User directory",
  mode: "flat",
  columns: [
    { id: "name", type: "string", label: "Name" },
    { id: "age", type: "number", label: "Age" },
  ],
  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
  },
  dataSource: {
    type: "local",
    data: [
      { id: "1", name: "Alice", age: 30 },
      { id: "2", name: "Bob", age: 25 },
    ],
  },
};

export default function App() {
  return <ConfiguredTable config={config} />;
}
```

---

## See Also

- [Config Basics](config-basics.md)
- [JSONata Transforms](jsonata-transforms.md)
- [Flat Table Config](flat-table-config.md)
- [Infinite Table Config](infinite-table-config.md)
- [Tree Table Config](tree-table-config.md)
