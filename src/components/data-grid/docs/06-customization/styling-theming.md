# Styling & Theming

Customize DataGrid look and feel with CSS variables and density presets.

## CSS Variables

The grid exposes CSS variables for theming:

```css
/* Colors */
--grid-background: #ffffff;
--grid-border: #e5e7eb;
--grid-text: #1f2937;
--grid-text-secondary: #6b7280;

/* Spacing */
--grid-padding: 12px;
--grid-gap: 8px;

/* Density (set via feature flag) */
--grid-row-height: 40px;  /* compact: 32px, loose: 48px */
```

## Dark Mode

```css
@media (prefers-color-scheme: dark) {
  --grid-background: #1f2937;
  --grid-border: #374151;
  --grid-text: #f3f4f6;
  --grid-text-secondary: #d1d5db;
}
```

## Density Presets

```tsx
<DataGrid
  density="compact"   // 32px rows, tight spacing
  // or
  density="default"   // 40px rows, normal spacing (default)
  // or
  density="loose"     // 48px rows, spacious
  {...otherProps}
/>
```

## Custom Styles

Override with CSS:

```css
/* Wider columns */
.data-grid-header {
  --grid-padding: 16px;
}

/* Larger fonts */
.data-grid-cell {
  font-size: 16px;
}

/* Custom header background */
.data-grid-header {
  background-color: #3b82f6;
  color: white;
}
```

## See Also

- [API Reference](../07-api-reference.md) — Full styling options
