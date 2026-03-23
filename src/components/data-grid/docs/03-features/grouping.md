# Grouping

Group rows by column values, expand/collapse groups.

## What It Does

Rows are grouped by a column value. Each group has a header showing the group value and row count. Click to expand/collapse a group.

## When to Use

Use grouping when you want to organize rows by category:
- Group users by department
- Group transactions by date
- Group products by category

## Config Example

```json
{
  "features": {
    "grouping": {
      "enabled": true,
      "groupBy": ["department"]
    }
  }
}
```

## Raw Props Example

```tsx
<DataGrid
  data={data}
  columns={columns}
  mode="flat"
  features={{
    grouping: {
      enabled: true,
      groupBy: ["department"],
    },
  }}
/>
```

## See Also

- [API Reference](../07-api-reference.md) — Full grouping options

## Examples in Codebase

- `src/components/data-grid/features/grouping/` — Implementation
- `src/demo/demo-page.tsx` — Live example
