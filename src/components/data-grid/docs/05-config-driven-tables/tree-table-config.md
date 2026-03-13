# Tree Table via Config

Define a hierarchical table using JSON config.

## Overview

Tree mode: hierarchical rows with expand/collapse and optional lazy-load.

## Full Config Example

```json
{
  "name": "org-tree",
  "description": "Organization chart with hierarchy",
  "mode": "tree",

  "columns": [
    {
      "id": "name",
      "type": "string",
      "label": "Name",
      "width": 150
    },
    {
      "id": "title",
      "type": "string",
      "label": "Title",
      "width": 150
    },
    {
      "id": "department",
      "type": "string",
      "label": "Department",
      "width": 120
    },
    {
      "id": "reports",
      "type": "number",
      "label": "Direct Reports",
      "width": 100
    }
  ],

  "features": {
    "sorting": { "enabled": true },
    "filtering": { "enabled": true },
    "selection": { "enabled": true }
  },

  "dataSource": {
    "type": "tree",
    "data": [
      {
        "id": "ceo",
        "name": "Alice Chen",
        "title": "CEO",
        "department": "Executive",
        "reports": 2,
        "children": [
          {
            "id": "cto",
            "name": "Bob Smith",
            "title": "CTO",
            "department": "Engineering",
            "reports": 3,
            "children": [
              {
                "id": "eng-lead",
                "name": "Carol White",
                "title": "Engineering Lead",
                "department": "Engineering",
                "reports": 5,
                "children": []
              }
            ]
          }
        ]
      }
    ],
    "getSubRows": "children",
    "onExpand": null
  },

  "ui": {
    "density": "default"
  }
}
```

## Data Structure

Hierarchical rows with `children`:

```json
{
  "id": "node-1",
  "name": "Parent",
  "title": "Manager",
  "children": [
    { "id": "node-2", "name": "Child 1", "title": "Engineer", "children": [] },
    { "id": "node-3", "name": "Child 2", "title": "Designer", "children": [] }
  ]
}
```

## Lazy Loading

To fetch children on expand:

```json
{
  "dataSource": {
    "type": "tree",
    "data": [ /* root nodes */ ],
    "getSubRows": "children",
    "onExpand": "fetchChildren"
  }
}
```

Then implement `fetchChildren`:

```tsx
const fetchChildren = async (parentId) => {
  const response = await fetch(`/api/org/${parentId}/children`);
  const children = await response.json();
  return children;
};
```

## See Also

- [Config Basics](config-basics.md)
- [Raw Props Alternative](../04-data-modes-non-config/tree-mode.md)
- [API Reference](config-api-reference.md)
