# Selection

Checkbox rows to select, track selections for bulk actions.

## What It Does

Each row has a checkbox. Click to select/deselect. Click the header checkbox to select/deselect all visible rows. Selected row IDs are tracked and accessible.

## When to Use

Use selection when you need to:
- Perform bulk actions (delete, export, update multiple rows)
- Track which rows the user is interested in
- Combine with other features (delete selected, email selected contacts)

## Config Example

```json
{
  "features": {
    "selection": {
      "enabled": true,
      "initialSelected": ["1", "2"]
    }
  }
}
```

## Raw Props Example

```tsx
const [rowSelection, setRowSelection] = useState({});

<DataGrid
  data={data}
  columns={columns}
  mode="flat"
  features={{
    selection: {
      enabled: true,
      onSelectionChange: (selected) => setRowSelection(selected),
    },
  }}
/>
```

## Access Selected Rows

```tsx
const selectedIds = Object.keys(rowSelection).filter(
  (key) => rowSelection[key] === true
);
console.log("Selected row IDs:", selectedIds);
```

## See Also

- [Progressive Walkthrough](../02-progressive-walkthrough.md) — Step 3
- [API Reference](../07-api-reference.md) — Full selection options

## Examples in Codebase

- `src/components/data-grid/features/selection/` — Implementation
- `src/demo/demo-page.tsx` — Live example
