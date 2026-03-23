# Actions: Row and Cell Buttons

Define action buttons that operate on table rows using the `action` node and lazy API nodes.

---

## Overview

Actions are user-triggered operations on rows or cells:
- **Row actions** — Buttons in a trailing action column (delete, approve, export)
- **Cell actions** — Buttons within specific cells (edit, link, view)

Each action references a lazy API node that executes when clicked.

---

## Architecture

### ActionNode
Defines row and cell actions declaratively. Does NOT execute APIs; only registers the actions for the toolbar/table to call.

### Lazy API Nodes
Separate API nodes (NOT in `edges[]`) that execute when an action is clicked. Each action references one via `apiNodeId`.

### Execution Flow
1. User clicks action button
2. DAG finds the lazy API node
3. API executes with row context (row data available in params)
4. Table refetches after success

---

## ActionDef Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | `string` | ✓ | Unique action ID |
| `label` | `string` | ✓ | Button label ("Delete", "Approve") |
| `icon` | `string` | — | lucide-react icon name (e.g., "Trash2", "CheckCircle") |
| `apiNodeId` | `string` | ✓ | ID of lazy API node to execute |
| `confirmMessage` | `string` | — | Confirmation dialog text |
| `visibilityExpr` | `JsonataExpr` | — | JSONata with `$row` context. Show only if true. |
| `disabledExpr` | `JsonataExpr` | — | JSONata with `$row` context. Disable only if true. |

---

## Example 1: Simple Row Delete Action

```typescript
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

export const deleteActionConfig: DAGTableConfig = {
  tableId: "users-with-delete",
  mode: "flat",

  dag: {
    nodes: [
      {
        id: "api-users",
        type: "api",
        config: {
          url: "/api/users",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `users.{ "id": id, "name": name, "email": email, "status": status }`,
        },
      },

      // Lazy node: delete user by ID
      {
        id: "delete-user-api",
        type: "api",
        config: {
          url: "/api/users/{userId}",
          method: "DELETE",
          authAdapterId: "wafdata",
          // No responseTransform needed; on success, table refetches
        },
      },

      // Lazy node: archive user (instead of delete)
      {
        id: "archive-user-api",
        type: "api",
        config: {
          url: "/api/users/{userId}/archive",
          method: "POST",
          authAdapterId: "wafdata",
        },
      },

      {
        id: "actions",
        type: "action",
        config: {
          rowActions: [
            {
              id: "delete",
              label: "Delete",
              icon: "Trash2",
              apiNodeId: "delete-user-api",
              confirmMessage: "Are you sure you want to delete this user?",
              // Only show delete for non-archived users
              disabledExpr: '$:$row.status = "archived"',
            },
            {
              id: "archive",
              label: "Archive",
              icon: "Archive",
              apiNodeId: "archive-user-api",
              confirmMessage: "Archive this user?",
              // Only show for active users
              visibilityExpr: '$:$row.status = "active"',
            },
          ],
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true },
            { field: "email", header: "Email" },
            { field: "status", header: "Status" },
          ],
          actionNodeId: "actions", // Append action column
        },
      },
    ],

    edges: [
      { from: "api-users", to: "actions" },
      { from: "actions", to: "columns" },
    ],
    rootNodeId: "columns",
  },

  features: {
    selection: { enabled: true },
  },
};
```

### How It Works

1. User clicks "Delete" button on a row
2. System looks up `delete-user-api` node
3. Evaluates `disabledExpr` with `$row` context:
   - If status = "archived", button is disabled
4. Shows confirmation dialog: "Are you sure...?"
5. On confirm, executes: `DELETE /api/users/{userId}`
   - `{userId}` is replaced from the row's `id` field
6. On success, table refetches

---

## Example 2: Conditional Actions (Multi-State Approval)

Show different actions based on row state:

```typescript
{
  id: "actions",
  type: "action",
  config: {
    rowActions: [
      {
        id: "approve",
        label: "Approve",
        icon: "CheckCircle",
        apiNodeId: "approve-api",
        // Only show for pending requests
        visibilityExpr: '$:$row.status = "pending"',
      },
      {
        id: "reject",
        label: "Reject",
        icon: "XCircle",
        apiNodeId: "reject-api",
        // Only show for pending requests
        visibilityExpr: '$:$row.status = "pending"',
      },
      {
        id: "withdraw",
        label: "Withdraw Approval",
        icon: "Undo",
        apiNodeId: "withdraw-api",
        // Only show for approved requests
        visibilityExpr: '$:$row.status = "approved"',
        confirmMessage: "Withdraw approval? This cannot be undone.",
      },
    ],
  },
}
```

---

## Example 3: Bulk Actions via Toolbar

Use a toolbar `menu` command to run actions on selected rows:

```typescript
export const bulkActionConfig: DAGTableConfig = {
  tableId: "users-bulk",
  mode: "flat",

  dag: {
    nodes: [
      {
        id: "api-users",
        type: "api",
        config: {
          url: "/api/users",
          method: "GET",
          authAdapterId: "wafdata",
          responseTransform: `users.{ "id": id, "name": name }`,
        },
      },

      {
        id: "activate-users-api",
        type: "api",
        config: {
          url: "/api/users/bulk-activate",
          method: "POST",
          authAdapterId: "wafdata",
          body: { "userIds": [] }, // Caller fills this in
        },
      },

      {
        id: "deactivate-users-api",
        type: "api",
        config: {
          url: "/api/users/bulk-deactivate",
          method: "POST",
          authAdapterId: "wafdata",
          body: { "userIds": [] },
        },
      },

      {
        id: "actions",
        type: "action",
        config: {
          rowActions: [], // No per-row actions
        },
      },

      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true },
          ],
        },
      },
    ],

    edges: [
      { from: "api-users", to: "actions" },
      { from: "actions", to: "columns" },
    ],
    rootNodeId: "columns",
  },

  features: {
    selection: { enabled: true, mode: "multi" },
  },

  toolbarCommands: [
    {
      id: "bulk-actions",
      type: "menu",
      enabled: true,
      label: "Bulk Actions",
      icon: "Zap",
      commands: [
        {
          id: "activate",
          type: "command",
          label: "Activate Selected",
          handler: async (ctx) => {
            const selected = ctx.selectedRows;
            if (selected.length === 0) {
              alert("Select users first");
              return;
            }
            const ids = selected.map((r) => r.id);
            // Call activate API with selected IDs
            await ctx.executeApiNode("activate-users-api", {
              userIds: ids,
            });
            ctx.refetch();
          },
        },
        {
          id: "deactivate",
          type: "command",
          label: "Deactivate Selected",
          handler: async (ctx) => {
            const selected = ctx.selectedRows;
            if (selected.length === 0) {
              alert("Select users first");
              return;
            }
            const ids = selected.map((r) => r.id);
            await ctx.executeApiNode("deactivate-users-api", {
              userIds: ids,
            });
            ctx.refetch();
          },
        },
      ],
    },
  ],
};
```

---

## Example 4: Cell Actions (Inline Edit Links)

Put action buttons inside data cells:

```typescript
{
  id: "actions",
  type: "action",
  config: {
    cellActions: [
      {
        id: "edit",
        label: "Edit",
        icon: "Edit",
        apiNodeId: "edit-user-api", // Or launch a modal instead
        // Only show for active users
        visibilityExpr: '$:$row.status = "active"',
      },
    ],
  },
},

{
  id: "columns",
  type: "column",
  config: {
    columns: [
      { field: "name", header: "Name" },
      {
        field: "email",
        header: "Email",
        // Render as a link/button field
        renderType: "custom",
        // Toolbar context provides the edit action
      },
    ],
  },
}
```

---

## ToolbarContext for Actions

When a toolbar command `handler(ctx)` is called, `ctx` includes:

| Property | Type | Description |
|----------|------|-------------|
| `selectedRows` | `GridRow[]` | Currently selected rows |
| `rows` | `GridRow[]` | All visible rows |
| `table` | `Table` | TanStack Table instance |
| `executeApiNode(nodeId, params?)` | `Promise<void>` | Execute a lazy API node (params appended to row context) |
| `refetch()` | `Promise<void>` | Refetch the entire table |
| `setRows(rows)` | `void` | Replace all rows |
| `isLoading` | `boolean` | Loading state |
| `selectedRows` | `GridRow[]` | Selected rows (alias for convenience) |

---

## Lazy API Node Requirements

Each lazy API node:
1. **Not in edges[]** — Only executed on demand
2. **References row data** — Can access `{fieldName}` in URL or use `$row` context
3. **Handles success** — On success, table refetches (unless action sets custom behavior)
4. **Handles errors** — Failed requests display error toast

Example lazy node:
```typescript
{
  id: "delete-user-api",
  type: "api",
  config: {
    url: "/api/users/{id}",  // {id} replaced from row
    method: "DELETE",
    authAdapterId: "wafdata",
  },
}
```

When action fires on a row with `id: "user-123"`, the URL becomes `/api/users/user-123`.

---

## Visibility and Disabled Rules

Both `visibilityExpr` and `disabledExpr` use JSONata with `$row` context:

### Show/Hide Based on State
```jsonata
$:$row.status = "pending"  // Only show for pending
$:$row.status != "archived"  // Hide for archived
$:$count($row.children) > 0  // Only if has children
```

### Disable Based on State
```jsonata
$:$row.isLocked = true  // Disable if locked
$:$row.dept != "eng"    // Disable for non-eng
```

### Complex Conditions
```jsonata
$:$row.status = "approved" AND $row.author = $currentUser
```

---

## Icons

Use lucide-react icon names:
- `"Trash2"` — Delete
- `"CheckCircle"` — Approve
- `"XCircle"` — Reject
- `"Edit"` — Edit
- `"Eye"` — View
- `"Download"` — Export
- `"Archive"` — Archive
- `"Send"` — Send
- `"Undo"` — Undo
- `"Lock"` — Lock
- `"Unlock"` — Unlock

Full list: https://lucide.dev/

---

## See Also

- [Config Basics](config-basics.md) — DAG model
- [DAG Nodes](dag-nodes.md) — Action node details
- [Toolbar](../08-toolbar.md) — Toolbar command patterns
- [JSONata Transforms](jsonata-transforms.md) — visibilityExpr/disabledExpr syntax
