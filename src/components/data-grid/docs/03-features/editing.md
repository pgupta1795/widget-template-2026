# Editing

Inline edit cells with async mutation support.

## What It Does

Double-click a cell to edit. Press Enter to save or Escape to cancel. Changes are sent to your mutation handler. Pending/error states are shown.

## When to Use

Use editing when you want users to update data directly in the grid:
- Edit user names, emails, addresses
- Update product prices, quantities
- Change statuses

## Config Example

```json
{
  "features": {
    "editing": {
      "enabled": true,
      "onMutate": {
        "handler": "updateRow"
      }
    }
  }
}
```

## Raw Props Example

```tsx
const handleMutate = async (rowId, columnId, value) => {
  // Send to server
  const result = await updateApi(rowId, columnId, value);
  return result;
};

<DataGrid
  data={data}
  columns={columns}
  mode="flat"
  features={{
    editing: {
      enabled: true,
      onMutate: handleMutate,
    },
  }}
/>
```

## Editor Types

Each column type has a corresponding editor:
- `stringColumn` → text input
- `numberColumn` → number input
- `dateColumn` → date picker
- `selectColumn` → dropdown
- `booleanColumn` → toggle
- `multiValueColumn` → tag input
- `codeColumn` → code editor

## See Also

- [Custom Editors](../06-customization/custom-editors.md) — Create your own
- [API Reference](../07-api-reference.md) — Full editing options

## Examples in Codebase

- `src/components/data-grid/features/editing/` — Implementation
- `src/components/data-grid/editors/` — Editor components
- `src/demo/demo-page.tsx` — Live example
