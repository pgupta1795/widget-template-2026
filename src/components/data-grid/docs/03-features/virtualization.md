# Virtualization

Render 10k+ rows smoothly with virtual scrolling. Only visible rows are in the DOM.

## What It Does

As you scroll, rows outside the viewport are removed from the DOM. Rows entering the viewport are added. This keeps memory low and scrolling smooth even with massive datasets.

## When to Use

Always enabled for flat mode by default. Essential when you have:
- 1k+ rows
- Large datasets
- Need smooth scrolling performance

## Config Example

```json
{
  "features": {
    "virtualization": {
      "enabled": true,
      "overscan": 10
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
    virtualization: {
      enabled: true,
      rowVirtualizeOptions: {
        overscan: 10,  // Render 10 rows beyond viewport
      },
    },
  }}
/>
```

## Performance

- **Flat mode with 10k rows**: Smooth scrolling, <50ms frame time
- **Column virtualization**: Also virtualizes columns for wide tables
- **Memory usage**: Constant (doesn't grow with row count)

## See Also

- [API Reference](../07-api-reference.md) — Full virtualization options

## Examples in Codebase

- `src/components/data-grid/features/virtualization/` — Implementation
- `src/demo/demo-page.tsx` — Live example
