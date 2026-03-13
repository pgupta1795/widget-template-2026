# Infinite Table via Config

Define an infinite-scroll table using JSON config and server fetch.

## Overview

Infinite mode: cursor/offset-based incremental loading.

## Full Config Example

```json
{
  "name": "feed-infinite",
  "description": "Social feed with infinite scroll",
  "mode": "infinite",

  "columns": [
    {
      "id": "author",
      "type": "string",
      "label": "Author",
      "width": 150
    },
    {
      "id": "content",
      "type": "string",
      "label": "Content",
      "width": 400
    },
    {
      "id": "timestamp",
      "type": "date",
      "label": "Posted",
      "width": 150
    },
    {
      "id": "likes",
      "type": "number",
      "label": "Likes",
      "width": 80
    }
  ],

  "features": {
    "sorting": { "enabled": true },
    "filtering": { "enabled": true },
    "selection": { "enabled": true },
    "virtualization": { "enabled": true }
  },

  "dataSource": {
    "type": "infinite",
    "fetchFn": "fetchFeed",
    "pageParamName": "cursor"
  },

  "ui": {
    "density": "default",
    "pageSize": 20
  }
}
```

## Fetch Function

Implement `fetchFeed` in your handler:

```tsx
const fetchFeed = async (cursor = null) => {
  const response = await fetch(`/api/feed?cursor=${cursor}&limit=20`);
  const { posts, nextCursor } = await response.json();

  return {
    rows: posts,
    nextPage: nextCursor || null,  // null when done
  };
};
```

## Data Structure

Each row in your response:
```json
{
  "id": "post-123",
  "author": "Alice",
  "content": "Great day today!",
  "timestamp": "2024-01-15T10:30:00Z",
  "likes": 42
}
```

## See Also

- [Config Basics](config-basics.md)
- [Raw Props Alternative](../04-data-modes-non-config/infinite-mode.md)
- [API Reference](config-api-reference.md)
