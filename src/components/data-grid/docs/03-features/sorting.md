# Sorting

Click column headers to sort ascending/descending/clear.

## What It Does

Sorting organizes rows by one or more columns. Click a header to:
- First click: Sort ascending
- Second click: Sort descending
- Third click: Clear sort

## When to Use

Always enabled by default. Use when rows need to be ordered by user choice (names A→Z, prices low→high, dates newest first, etc.).

## Config Example

```json
{
  "features": {
    "sorting": {
      "enabled": true,
      "defaultSort": [
        { "id": "name", "desc": false }
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
    sorting: {
      enabled: true,
      initialState: {
        sorting: [{ id: "name", desc: false }],
      },
    },
  }}
/>
```

## Behavior

- **Single-column sort** (default): Click a header to sort by that column. Clicking another header replaces the sort.
- **Multi-column sort** (with Shift): Hold Shift and click headers to add secondary sorts.
- **Sort direction**: Icon in header shows ↑ (ascending), ↓ (descending), or none (unsorted).
- **Reset**: Click a sorted header 3 times to clear the sort.

## See Also

- [Progressive Walkthrough](../02-progressive-walkthrough.md) — Step 1
- [API Reference](../07-api-reference.md) — Full sorting options

## Examples in Codebase

- `src/components/data-grid/features/sorting/` — Implementation
- `src/demo/demo-page.tsx` — Live example
