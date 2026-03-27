# Layout Engine — Phase 3: `createLayoutRoute` Helper + CA Layout Config + Route

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create `createLayoutRoute()` helper, the CA layout config, and the `/xen/ca/$nodeId` route. Wire DnD drop context so dragging a Change Action object sets `LayoutContext.params`. Update the xen feature bootstrap to register the layout config.

**Architecture:** `createLayoutRoute()` is a thin wrapper around TanStack Router's `createFileRoute` that injects the layout config and maps route params to `LayoutContext.params`. The CA layout config (`ca-layout.config.ts`) is a `SidebarLayoutConfig` referencing `ca-tabs.config.ts` (main) and `ca-form.config.ts` (side). The `use-3dx-drop-zone` hook (already exists) updates `LayoutContext.params` when an object is dropped. Layout Engine Phase 2 must be complete.

**Tech Stack:** React 19, TanStack Router v1, react-resizable-panels, `use-3dx-drop-zone` hook (existing)

**Spec:** `docs/superpowers/specs/2026-03-24-layout-engine-design.md`

**Prev phase:** `docs/superpowers/plans/2026-03-24-layout-engine-phase-2-layouts.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/layout-engine/router/create-layout-route.ts` | Create — createFileRoute wrapper |
| `src/features/xen/configs/ca-layout.config.ts` | Create — CA sidebar layout config |
| `src/routes/xen/ca.$nodeId.tsx` | Create — route file for CA object view |
| `src/features/xen/bootstrap.ts` | Modify — register ca-layout.config.ts |
| `src/components/layout-engine/index.ts` | Modify — export createLayoutRoute |

---

## Task 1: `create-layout-route.ts`

**File:** `src/components/layout-engine/router/create-layout-route.ts`

- [ ] Create:

```ts
// src/components/layout-engine/router/create-layout-route.ts
import { createFileRoute } from "@tanstack/react-router";
import type { DAGLayoutConfig } from "../types/layout.types";
import { LayoutEngine } from "../layout-engine";
import { createElement } from "react";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

/**
 * Thin wrapper around createFileRoute that injects a DAGLayoutConfig.
 *
 * Usage (in a route file):
 *   export const Route = createLayoutRoute('/xen/ca/$nodeId', caLayoutConfig);
 *
 * TanStack Router still requires a physical route file — this just reduces boilerplate.
 */
export function createLayoutRoute(
  routePath: string,
  config: DAGLayoutConfig,
) {
  return createFileRoute(routePath as never)({
    component: function LayoutRouteComponent() {
      // Access TanStack Router params via useParams
      // We use a dynamic import pattern to avoid importing useParams at module level
      const { useParams } = require("@tanstack/react-router");
      const routeParams = useParams({ strict: false }) as Record<string, string>;

      // Route params are strings — compatible with JsonPrimitive
      const params = routeParams as Record<string, JsonPrimitive>;

      return createElement(LayoutEngine, { config, params });
    },
  });
}
```

---

## Task 2: CA Layout config

**File:** `src/features/xen/configs/ca-layout.config.ts`

- [ ] Create:

```ts
// src/features/xen/configs/ca-layout.config.ts
import type { SidebarLayoutConfig } from "@/components/layout-engine";

export const caLayoutConfig: SidebarLayoutConfig = {
  layoutId: "ca-layout",
  routePath: "/xen/ca/$nodeId",
  title: "Change Action",
  type: "sidebar",
  side: "right",
  acceptedDropTypes: ["ChangeAction"],
  dropParamName: "nodeId",

  mainPanel: {
    id: "main",
    defaultSize: 75,
    minSize: 40,
    content: {
      type: "tabs",
      configPath: "./ca-tabs.config.ts",
    },
  },

  sidePanel: {
    id: "side-panel",
    defaultSize: 25,
    minSize: 0,
    maxSize: 50,
    collapsible: true,
    defaultCollapsed: false,
    content: {
      type: "form",
      configPath: "./ca-form.config.ts",
    },
  },
};
```

---

## Task 3: Create route directory and route file

TanStack Router v1 uses file-based routing. A route at `/xen/ca/$nodeId` requires a file at `src/routes/xen/ca.$nodeId.tsx`.

- [ ] Create the directory `src/routes/xen/` if it doesn't exist:

```bash
mkdir -p "src/routes/xen"
```

- [ ] Create `src/routes/xen/ca.$nodeId.tsx`:

```tsx
// src/routes/xen/ca.$nodeId.tsx
import { createLayoutRoute } from "@/components/layout-engine";
import { caLayoutConfig } from "@/features/xen/configs/ca-layout.config";

export const Route = createLayoutRoute("/xen/ca/$nodeId", caLayoutConfig);
```

- [ ] Run `npm run dev:widget` briefly — TanStack Router's file-based plugin will regenerate `src/routeTree.gen.ts` to include the new route.

- [ ] Run `npm run check` — zero errors (the new route will appear in `routeTree.gen.ts`).

---

## Task 4: Wire DnD to LayoutContext params

The xen route (`src/routes/xen.tsx`) uses the existing `use-3dx-drop-zone` hook. We need the CA layout route to also respond to dropped objects by updating `LayoutContext.params`.

- [ ] Open `src/routes/xen/ca.$nodeId.tsx` and update it to wrap the layout with a drop zone that calls `setParams`:

```tsx
// src/routes/xen/ca.$nodeId.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { caLayoutConfig } from "@/features/xen/configs/ca-layout.config";
import { LayoutEngine } from "@/components/layout-engine";
import { LayoutContextProvider, useLayoutContext } from "@/components/layout-engine";
import { use3dxDropZone } from "@/hooks/use-3dx-drop-zone";

export const Route = createFileRoute("/xen/ca/$nodeId")({
  component: CaObjectView,
});

function CaObjectView() {
  const { nodeId } = Route.useParams();
  return (
    <LayoutContextProvider
      config={caLayoutConfig}
      initialParams={{ nodeId }}
    >
      <CaObjectViewInner />
    </LayoutContextProvider>
  );
}

function CaObjectViewInner() {
  const { setParams } = useLayoutContext();
  const navigate = useNavigate();

  // Update params when a CA object is dropped onto the widget
  use3dxDropZone({
    acceptedTypes: caLayoutConfig.acceptedDropTypes ?? [],
    onDrop: (droppedObject) => {
      const id = droppedObject.objectId ?? droppedObject.id ?? "";
      if (id) {
        setParams({ nodeId: id });
        // Optionally navigate to the new node ID
        void navigate({ to: "/xen/ca/$nodeId", params: { nodeId: id } });
      }
    },
  });

  return <LayoutEngine config={caLayoutConfig} />;
}
```

> **Note:** Check `src/hooks/use-3dx-drop-zone.ts` for the exact `onDrop` callback signature and `droppedObject` shape. Adjust field names (`objectId`, `id`, etc.) to match what the existing hook provides.

---

## Task 5: Register CA layout config in xen bootstrap

**File:** `src/features/xen/bootstrap.ts`

- [ ] Add the layout config registration:

```ts
import { caLayoutConfig } from "./configs/ca-layout.config";

// In bootstrapXenFeature():
registerConfig("./ca-layout.config.ts", caLayoutConfig);
```

---

## Task 6: Export `createLayoutRoute` from index

**File:** `src/components/layout-engine/index.ts`

- [ ] Add:

```ts
export { createLayoutRoute } from "./router/create-layout-route";
```

---

## Task 7: Navigation link (optional smoke test)

- [ ] Open `src/routes/xen.tsx` (the existing xen route). Add a navigation link to the new CA view for testing purposes:

```tsx
// Somewhere in the xen route component, add a test link:
import { Link } from "@tanstack/react-router";

<Link to="/xen/ca/$nodeId" params={{ nodeId: "test-id" }} className="text-sm text-primary underline">
  Open CA View (test)
</Link>
```

---

## Task 8: Verify end-to-end

- [ ] Run `npm run check` — zero errors.
- [ ] Run `npm run build` — must succeed.
- [ ] Run `npm run dev:widget`.
- [ ] Navigate to `/xen/ca/test-id` — the sidebar layout should render with the main panel (tabs) and side panel (form) visible.
- [ ] Click the ℹ icon in the form header — the side panel should collapse/expand.
- [ ] Drag the side panel handle — it should resize.

---

## Task 9: Commit

```bash
git add src/components/layout-engine/router/ \
        src/features/xen/configs/ca-layout.config.ts \
        src/routes/xen/ \
        src/features/xen/bootstrap.ts \
        src/components/layout-engine/index.ts
git commit -m "feat(layout-engine): add createLayoutRoute, CA layout config, xen route (phase 3)"
```
