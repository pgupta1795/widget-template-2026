# Custom Editors

Create inline edit UI for custom column types.

## Overview

When a user double-clicks a cell to edit, the grid uses an editor component. Built-in editors exist for string, number, date, select, boolean, etc.

For custom columns, create a custom editor.

## Example: Star Rating Editor

```tsx
// src/components/data-grid/editors/rating-editor.tsx
import { useState } from "react";

export interface RatingEditorProps {
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
}

export function RatingEditor({ value, onChange, onBlur }: RatingEditorProps) {
  const [hovered, setHovered] = useState(0);

  return (
    <div
      style={{ display: "flex", gap: "4px" }}
      onBlur={onBlur}
      tabIndex={0}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{
            cursor: "pointer",
            fontSize: "24px",
            opacity: star <= (hovered || value) ? 1 : 0.5,
          }}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => {
            onChange(star);
            onBlur();
          }}
        >
          ⭐
        </span>
      ))}
    </div>
  );
}
```

## Register in getEditor

```tsx
// src/components/data-grid/editors/get-editor.ts
import { RatingEditor } from "./rating-editor";

export function getEditor(columnMeta: any) {
  const type = columnMeta?.type;

  switch (type) {
    case "rating":
      return RatingEditor;
    // ... other editors
  }
}
```

## Editor Contract

Custom editor must accept:

```tsx
{
  value: any;           // Current cell value
  onChange: (value: any) => void;
  onBlur: () => void;
  onEscape?: () => void;  // Optional: cancel edit
}
```

## See Also

- [Custom Columns](custom-columns.md) — Pair with custom column renderer
- [Editing Feature](../03-features/editing.md) — How editing works
- [API Reference](../07-api-reference.md) — Editor contract
