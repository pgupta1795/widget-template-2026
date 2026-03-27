# Layout Engine Design
_Date: 2026-03-24_

## Overview

A configuration-driven layout engine that composes `ConfiguredTable`, `ConfiguredForm`, and `ConfiguredTabs` into full page views. Layout configs reference sibling config files by relative path. The Layout Engine manages all panel state via a `LayoutContext` and supports dynamic TanStack Router route registration from config.

---

## Goals

- Three layout types: `SplitLayout`, `StackLayout`, `SidebarLayout`
- `react-resizable-panels` for all resizable panel behavior
- `LayoutContext` owns all panel state — children call `useLayoutContext().togglePanel(id)`
- Dynamic route registration — a layout config registers its own TanStack Router route at bootstrap
- Layout config references table/form/tab configs by relative path — no inline embedding
- Configurable sizes, min/max constraints, collapsible panels, resizable handles

---

## Architecture

### LayoutEngine Dispatcher

Top-level component that reads `type` from config and renders the correct layout:

```ts
type LayoutType = "split" | "stack" | "sidebar";
```

```tsx
export function LayoutEngine({ config, params }: LayoutEngineProps) {
  switch (config.type) {
    case "split":   return <SplitLayout config={config} params={params} />;
    case "stack":   return <StackLayout config={config} params={params} />;
    case "sidebar": return <SidebarLayout config={config} params={params} />;
  }
}
```

### LayoutContext

Manages all panel state. Any child component accesses it without prop drilling:

```ts
interface LayoutContextValue {
  panels: Record<string, PanelState>;
  togglePanel: (panelId: string) => void;
  setPanelSize: (panelId: string, size: number) => void;
  // Route params (string from TanStack Router) merged with DnD params (JsonPrimitive)
  // Both are JsonPrimitive-compatible since route params are strings
  params: Record<string, JsonPrimitive>;
  setParams: (params: Record<string, JsonPrimitive>) => void;
}

interface PanelState {
  isCollapsed: boolean;
  size: number;
}
```

All `ConfiguredForm`, `ConfiguredTabs`, `ConfiguredTable` children receive `params` from `LayoutContext` — no prop threading required.

---

## Layout Types

### SplitLayout

Horizontal or vertical split with resizable panels:

```ts
interface SplitLayoutConfig {
  type: "split";
  direction: "horizontal" | "vertical";
  panels: SplitPanelConfig[];
}

interface SplitPanelConfig {
  id: string;
  defaultSize: number;      // percentage e.g. 75
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
  content: LayoutContentConfig;
}
```

### StackLayout

Vertical stacking using `react-resizable-panels` with a vertical `ResizablePanelGroup`:

```ts
interface StackPanelConfig {
  id: string;
  defaultSize: number;      // percentage — consistent with SplitLayout
  minSize?: number;
  collapsible?: boolean;
  content: LayoutContentConfig;
}
```

All layout types use `react-resizable-panels` consistently. There is no CSS-flex fallback.

### SidebarLayout

Main content + collapsible right (or left) side panel:

```ts
interface SidebarPanelConfig extends SplitPanelConfig {
  // inherits: id, defaultSize, minSize, collapsible
  defaultCollapsed?: boolean;
  // NOTE: no separate panelId — LayoutContext.togglePanel() uses the existing id field
}
```

---

## LayoutContentConfig

Each panel declares what it renders by content type + config path:

```ts
type LayoutContentType = "table" | "form" | "tabs" | "layout";

interface LayoutContentConfig {
  type: LayoutContentType;
  configPath: string;           // relative path e.g. "./ca-form.config.ts"
  acceptedDropTypes?: string[]; // if this panel accepts DnD objects
  dropParamName?: string;       // e.g. "nodeId"
}
```

`"layout"` type allows nested layouts (e.g. a `SplitLayout` panel containing a `StackLayout`).

---

## Route Registration

TanStack Router v1 uses **file-based routing** — routes cannot be registered programmatically at runtime. Each layout requires a corresponding route file. The Layout Engine provides a helper to minimize boilerplate:

```ts
// src/components/layout-engine/router/create-layout-route.ts
export function createLayoutRoute<TPath extends string>(
  routePath: TPath,
  config: DAGLayoutConfig
) {
  return createFileRoute(routePath)({
    component: () => <LayoutEngine config={config} params={useParams()} />,
  });
}
```

Each feature creates a thin route file:
```ts
// src/routes/xen/ca.$nodeId.tsx
import { createLayoutRoute } from '@/components/layout-engine';
import { caLayoutConfig } from '@/features/xen/configs/ca-layout.config';

export const Route = createLayoutRoute('/xen/ca/$nodeId', caLayoutConfig);
```

`layout-engine/bootstrap.ts` is removed — there is no auto-registration. Layout config `routePath` is a documentation field only, not used at runtime.

---

## DAGLayoutConfig Shape

Proper discriminated union — TypeScript narrows by `type`:

```ts
export type DAGLayoutConfig =
  | SplitLayoutConfig
  | StackLayoutConfig
  | SidebarLayoutConfig;

interface BaseLayoutConfig {
  layoutId: string;
  routePath: string;    // documentation only — used in createLayoutRoute() call
  title?: string;
}

export interface SplitLayoutConfig extends BaseLayoutConfig {
  type: "split";
  direction: "horizontal" | "vertical";
  panels: SplitPanelConfig[];
}

export interface StackLayoutConfig extends BaseLayoutConfig {
  type: "stack";
  panels: StackPanelConfig[];
}

export interface SidebarLayoutConfig extends BaseLayoutConfig {
  type: "sidebar";
  side?: "right" | "left";        // default: "right"
  mainPanel: SplitPanelConfig;
  sidePanel: SidebarPanelConfig;  // no redundant panelId — uses id from SplitPanelConfig
  acceptedDropTypes?: string[];   // top-level DnD; per-panel DnD not supported (avoids conflict)
  dropParamName?: string;
}
```

`LayoutContentConfig` does **not** declare `acceptedDropTypes` — DnD is a top-level layout concern only, declared once on the root layout config.

---

## layout-content-renderer Interface

```tsx
// content/layout-content-renderer.tsx
interface LayoutContentRendererProps {
  content: LayoutContentConfig;
  params: Record<string, JsonPrimitive>;
  onTogglePanel?: (panelId: string) => void;  // passed to ConfiguredForm as onToggleDetail
}

export function LayoutContentRenderer({ content, params, onTogglePanel }: LayoutContentRendererProps)
// Dispatches to ConfiguredTable, ConfiguredForm, ConfiguredTabs, or nested LayoutEngine
// based on content.type. Looks up config from tab-config-registry by content.configPath.
```

## Folder Structure

```
src/components/layout-engine/
├── core/
│   └── layout-context.tsx              # LayoutContext + useLayoutContext hook
├── layouts/
│   ├── split-layout.tsx                # horizontal/vertical resizable split
│   ├── stack-layout.tsx                # vertical resizable stack
│   └── sidebar-layout.tsx             # main + collapsible side panel
├── router/
│   └── create-layout-route.ts          # createLayoutRoute() helper for route files
├── content/
│   └── layout-content-renderer.tsx     # see interface above
├── types/
│   └── layout.types.ts
├── layout-engine.tsx                   # top-level dispatcher
└── index.ts                            # exports: LayoutEngine, createLayoutRoute, DAGLayoutConfig, useLayoutContext
```

## Public API (index.ts exports)

```ts
export { LayoutEngine } from './layout-engine';
export { createLayoutRoute } from './router/create-layout-route';
export { useLayoutContext } from './core/layout-context';
export type { DAGLayoutConfig, SplitLayoutConfig, StackLayoutConfig, SidebarLayoutConfig } from './types/layout.types';
```

---

## Panel State & togglePanel Flow

When `HeaderForm` ℹ icon is clicked:

1. `ConfiguredForm` fires `onToggleDetail()` callback
2. The `LayoutContentRenderer` wraps `ConfiguredForm` and passes:
   ```tsx
   <ConfiguredForm
     config={formConfig}
     params={layoutContext.params}
     onToggleDetail={() => layoutContext.togglePanel("side-panel")}
   />
   ```
3. `LayoutContext.togglePanel("side-panel")` flips `panels["side-panel"].isCollapsed`
4. `SidebarLayout` reads `panels["side-panel"].isCollapsed` and calls `panelRef.collapse()` / `panelRef.expand()` on the `react-resizable-panels` panel

---

## Example Config (Change Action Layout)

```ts
// src/features/xen/configs/ca-layout.config.ts
export const caLayoutConfig: DAGLayoutConfig = {
  layoutId: "ca-layout",
  routePath: "/xen/ca/$nodeId",
  type: "sidebar",
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
    id: "side-panel",      // used by layoutContext.togglePanel("side-panel")
    defaultSize: 25,
    minSize: 20,
    collapsible: true,
    defaultCollapsed: false,
    content: {
      type: "form",
      configPath: "./ca-form.config.ts",
    },
  },
};
```

The `HeaderForm` (rendered inside `ConfiguredForm` inside the side panel) fires `onToggleDetail` → `layoutContext.togglePanel("side-panel")` → panel collapses/expands.

The `ca-tabs.config.ts` (main panel) references `ca-search.config.ts` (table) as tab content.

---

## Styling

- All panels use glassmorphism (`bg-background/80 backdrop-blur-md`) consistent with existing design
- `ResizableHandle` from `src/components/ui/resizable.tsx` (already exists)
- Panel transitions: `transition-all duration-200` on collapse/expand
- `SidebarLayout` side panel: fixed minimum collapsed width of `0` (fully hidden when collapsed)
