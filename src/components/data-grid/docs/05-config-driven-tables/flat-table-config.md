# Flat Table via Config

Define a flat table using JSON config.

## Overview

Flat mode: local data, client-side sorting/filtering/grouping.

## Full Config Example

```json
{
  "name": "users-flat",
  "description": "Employee directory with local data",
  "mode": "flat",

  "columns": [
    {
      "id": "name",
      "type": "string",
      "label": "Name",
      "width": 150,
      "sortable": true,
      "filterable": true
    },
    {
      "id": "email",
      "type": "string",
      "label": "Email",
      "width": 200,
      "sortable": true,
      "filterable": true
    },
    {
      "id": "age",
      "type": "number",
      "label": "Age",
      "width": 80,
      "sortable": true,
      "filterable": true
    },
    {
      "id": "department",
      "type": "select",
      "label": "Department",
      "width": 120,
      "options": [
        { "label": "Engineering", "value": "eng" },
        { "label": "Sales", "value": "sales" },
        { "label": "Marketing", "value": "marketing" }
      ]
    },
    {
      "id": "active",
      "type": "boolean",
      "label": "Active",
      "width": 80
    }
  ],

  "features": {
    "sorting": {
      "enabled": true,
      "defaultSort": [{ "id": "name", "desc": false }]
    },
    "filtering": {
      "enabled": true,
      "filterRow": true
    },
    "selection": {
      "enabled": true
    },
    "pinning": {
      "enabled": true,
      "columnPinningLeft": ["name"]
    },
    "grouping": {
      "enabled": true,
      "groupBy": []
    },
    "editing": {
      "enabled": true
    },
    "virtualization": {
      "enabled": true
    }
  },

  "dataSource": {
    "type": "local",
    "data": [
      {
        "id": "1",
        "name": "Alice Chen",
        "email": "alice@example.com",
        "age": 30,
        "department": "eng",
        "active": true
      },
      {
        "id": "2",
        "name": "Bob Smith",
        "email": "bob@example.com",
        "age": 25,
        "department": "sales",
        "active": true
      }
    ]
  },

  "ui": {
    "density": "default",
    "pageSize": 20
  }
}
```

## Using the Config

```tsx
import { ConfiguredTable } from "@/components/data-grid/table-engine";

const config = { /* as above */ };

export default function UserDirectory() {
  return <ConfiguredTable config={config} />;
}
```

## What Each Section Does

### Columns
- `id` — Field name in data
- `type` — Column type (string, number, boolean, select, date, etc.)
- `label` — Display header
- `width` — Column width in pixels
- `sortable` — Allow sorting
- `filterable` — Allow filtering

### Features
- `sorting` — Enable/disable sort by header click
- `filtering` — Enable/disable column filters
- `selection` — Enable/disable row checkboxes
- `pinning` — Pin columns left/right
- `grouping` — Group by columns
- `editing` — Inline edit cells
- `virtualization` — Virtual scroll for performance

### DataSource
- `type` — "local" for in-memory data
- `data` — Array of row objects

### UI
- `density` — "default", "compact", "loose"
- `pageSize` — Rows per view (for virtualization)

## See Also

- [Config Basics](config-basics.md)
- [Raw Props Alternative](../04-data-modes-non-config/flat-mode.md)
- [API Reference](config-api-reference.md)
