# Filtering

Column-specific filters narrow rows by criteria.

## What It Does

Each column can have a filter UI (text input, number range, date picker, etc.). Filter values are shown as badges. Clear a filter to reset.

## When to Use

Use filtering when you want users to narrow data:
- Search text fields (contains, starts with)
- Number ranges (between, greater than, less than)
- Date ranges (from/to)
- Dropdowns (single or multi-select)
- Boolean (true/false/all)

## Config Example

```json
{
  "features": {
    "filtering": {
      "enabled": true,
      "defaultFilters": [
        { "id": "name", "value": { "operator": "contains", "value": "Alice" } }
      ]
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
    filtering: {
      enabled: true,
      filterRow: true,  // Show filter inputs in header row
    },
  }}
/>
```

## Filter Value Shapes

- **String/Code**: `{ value: string, operator: 'contains' | 'startsWith' }`
- **Number**: `[min: number, max: number]` (range)
- **Date**: `{ from?: string, to?: string }` (ISO strings)
- **Multi-value**: `string[]` (array of tags)
- **Select**: `string[]` (array of option values)
- **Boolean**: `'true' | 'false'` (undefined = show all)

## See Also

- [Progressive Walkthrough](../02-progressive-walkthrough.md) — Step 2
- [API Reference](../07-api-reference.md) — Full filtering options

## Examples in Codebase

- `src/components/data-grid/features/filtering/` — Implementation
- `src/demo/demo-page.tsx` — Live example
