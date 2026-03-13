# Pinning

Pin columns left/right and rows top/bottom to keep them visible while scrolling.

## What It Does

- **Pin columns left**: Column stays visible when scrolling horizontally
- **Pin columns right**: Column stays visible on the right
- **Pin rows top**: Rows stay visible when scrolling vertically
- **Pin rows bottom**: Rows stay visible at bottom

Pinned areas have a subtle shadow border.

## When to Use

- Pin the ID or name column left so it's always visible
- Pin totals row at the bottom
- Pin header rows at top

## Config Example

```json
{
  "features": {
    "pinning": {
      "enabled": true,
      "defaultPinned": {
        "left": ["name"],
        "right": ["actions"]
      }
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
    pinning: {
      enabled: true,
      columnPinningRight: ["actions"],  // Pin actions column right
    },
  }}
/>
```

## See Also

- [API Reference](../07-api-reference.md) — Full pinning options

## Examples in Codebase

- `src/components/data-grid/features/pinning/` — Implementation
- `src/demo/demo-page.tsx` — Live example
