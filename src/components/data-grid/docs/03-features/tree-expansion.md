# Tree Expansion

Hierarchical rows with expand/collapse toggles and lazy async child loading.

## What It Does

Rows can have children. Click the expand arrow to show/hide children. Children can be:
- Pre-loaded in data
- Fetched asynchronously on expand

## When to Use

Use tree mode when data is hierarchical:
- Org charts (employees under managers)
- File explorers (folders and files)
- Category hierarchies

## Config Example

```json
{
  "mode": "tree",
  "features": {
    "tree": {
      "enabled": true,
      "getSubRows": "children",
      "onExpand": {
        "handler": "fetchChildren"
      }
    }
  }
}
```

## Raw Props Example

```tsx
const data = [
  {
    id: 1,
    name: "Alice",
    children: [
      { id: 11, name: "Alice Child 1" },
    ],
  },
];

const handleExpand = async (rowId) => {
  // Fetch children from server
  const children = await fetchChildren(rowId);
  return children;
};

<DataGrid
  data={data}
  columns={columns}
  mode="tree"
  getSubRows={(row) => row.children}
  onExpand={handleExpand}
/>
```

## Data Shape

Each row can have a `children` property (array of rows):

```tsx
{
  id: 1,
  name: "Parent",
  children: [
    { id: 11, name: "Child 1" },
    { id: 12, name: "Child 2" },
  ],
}
```

## See Also

- [Progressive Walkthrough](../02-progressive-walkthrough.md) — Step 4
- [Tree Mode (full example)](../04-data-modes-non-config/tree-mode.md)
- [API Reference](../07-api-reference.md) — Full tree options

## Examples in Codebase

- `src/components/data-grid/features/tree/` — Implementation
- `src/demo/demo-page.tsx` — Live example
