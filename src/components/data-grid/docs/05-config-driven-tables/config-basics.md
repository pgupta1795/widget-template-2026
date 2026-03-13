# Config Basics

When to use config vs raw props. What is declarative table configuration?

## Raw Props vs Config

| Aspect | Raw Props | Config |
|--------|-----------|--------|
| **Control** | Maximum, component-first | Data-first, declarative |
| **Code** | Longer, imperative JSX | JSON, concise |
| **Learn** | Component API deep dive | JSON schema, easier onboarding |
| **Flexibility** | Anything goes | Structured schema |
| **Server-side** | Possible but complex | Natural, designed for it |

## What Is Config?

Configuration is a JSON object that declares:
1. **Columns** — What fields to show, types, labels
2. **Features** — Which features to enable (sorting, filtering, etc.)
3. **Data Source** — How to fetch data (local, paginated, infinite, tree)
4. **UI** — Density, column widths, defaults

Instead of writing JSX, you define a config object:

```json
{
  "name": "users",
  "mode": "flat",
  "columns": [
    { "id": "name", "type": "string", "label": "Name", "width": 150 },
    { "id": "age", "type": "number", "label": "Age", "width": 100 },
  ],
  "features": {
    "sorting": { "enabled": true },
    "filtering": { "enabled": true },
  },
  "dataSource": {
    "type": "local",
    "data": [
      { "id": "1", "name": "Alice", "age": 30 },
    ],
  },
}
```

Then pass it to the `ConfiguredTable`:

```tsx
import { ConfiguredTable } from "@/components/data-grid/table-engine";

<ConfiguredTable config={config} />
```

## When to Use Config

**Use config if:**
- Your table config comes from a server or database
- You want to reuse table definitions across apps
- You prefer declarative over imperative
- You want to enable/disable features via JSON

**Use raw props if:**
- You need maximum control and customization
- Your table structure is tightly coupled to business logic
- You're building a one-off feature

## Config Structure Overview

```json
{
  "name": "table-name",
  "description": "What this table does",
  "mode": "flat|paginated|infinite|tree",

  "columns": [
    { "id": "...", "type": "...", "label": "...", ... }
  ],

  "features": {
    "sorting": { "enabled": true },
    "filtering": { "enabled": true },
    ...
  },

  "dataSource": {
    "type": "local|paginated|infinite|tree",
    "data": [...] or "fetchFn": "...",
    ...
  },

  "ui": {
    "density": "default|compact|loose",
    "pageSize": 10,
    ...
  }
}
```

## Next Steps

- [JSONata Transforms](jsonata-transforms.md) — Learn how to map data to columns
- [Flat Table Config](flat-table-config.md) — Full working example
- [Infinite Table Config](infinite-table-config.md) — Cursor-based loading
- [Tree Table Config](tree-table-config.md) — Hierarchical data

## See Also

- [Raw Props: Flat Mode](../04-data-modes-non-config/flat-mode.md) — Compare with raw props
- [API Reference](../07-api-reference.md) — Full config schema

---

## Design Philosophy

Configuration-driven tables follow these principles:

1. **Data-first** — Table structure comes from config, not code
2. **Server-friendly** — Configs can be versioned and deployed independently
3. **Reusable** — Same config runs in multiple apps or contexts
4. **Validated** — Config schema ensures correctness
5. **Transformable** — JSONata expressions power dynamic field mapping

This enables use cases like:
- Server-side table definitions: API returns config, UI renders it
- Multi-tenant tables: Different configs per tenant
- Feature flagging: Enable/disable features via config
- A/B testing: Different configs for different users
