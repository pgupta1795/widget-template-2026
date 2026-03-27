# Layout Engine — Phase 2: Layout Components + LayoutContentRenderer

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `LayoutContentRenderer`, `SplitLayout`, `StackLayout`, `SidebarLayout`, and the top-level `LayoutEngine` dispatcher. All use `react-resizable-panels` and read panel state from `LayoutContext`.

**Architecture:** All three layout components use `react-resizable-panels` (`ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle` from the existing shadcn/ui wrapper). `LayoutContentRenderer` looks up configs from `TabConfigRegistry` and dispatches to `ConfiguredTable`, `ConfiguredForm`, `ConfiguredTabs`, or a nested `LayoutEngine`. Panel collapse/expand is driven by `LayoutContext.panels` state and synced to `react-resizable-panels` via refs. Layout Engine Phase 1 must be complete.

**Tech Stack:** React 19, react-resizable-panels v4, shadcn/ui resizable, lucide-react, tailwind v4

**Spec:** `docs/superpowers/specs/2026-03-24-layout-engine-design.md`

**Prev phase:** `docs/superpowers/plans/2026-03-24-layout-engine-phase-1-types-context.md`

**Next phase:** `docs/superpowers/plans/2026-03-24-layout-engine-phase-3-route-config.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/layout-engine/content/layout-content-renderer.tsx` | Create — dispatches to child engines |
| `src/components/layout-engine/layouts/split-layout.tsx` | Create — horizontal/vertical split |
| `src/components/layout-engine/layouts/stack-layout.tsx` | Create — vertical resizable stack |
| `src/components/layout-engine/layouts/sidebar-layout.tsx` | Create — main + collapsible side |
| `src/components/layout-engine/layout-engine.tsx` | Create — top-level dispatcher |
| `src/components/layout-engine/index.ts` | Modify — export LayoutEngine |

---

## Task 1: `layout-content-renderer.tsx`

**File:** `src/components/layout-engine/content/layout-content-renderer.tsx`

- [ ] Create:

```tsx
// src/components/layout-engine/content/layout-content-renderer.tsx
import { Empty } from "@/components/ui/empty";
import { getConfig } from "@/components/tab-engine/core/tab-config-registry";
import { ConfiguredTable } from "@/components/data-grid/table-engine";
import { ConfiguredForm } from "@/components/form-engine";
import { ConfiguredTabs } from "@/components/tab-engine";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import type { DAGTableConfig } from "@/components/data-grid/table-engine/types/table.types";
import type { DAGFormConfig } from "@/components/form-engine/types/form.types";
import type { DAGTabConfig } from "@/components/tab-engine/types/tab.types";
import type { DAGLayoutConfig, LayoutContentConfig } from "../types/layout.types";
import { useLayoutContext } from "../core/layout-context";

interface LayoutContentRendererProps {
  content: LayoutContentConfig;
  /** Panel ID — used for toggling the detail panel from ConfiguredForm's ℹ icon */
  panelId?: string;
}

export function LayoutContentRenderer({ content, panelId }: LayoutContentRendererProps) {
  const { params, togglePanel } = useLayoutContext();

  const config = getConfig(content.configPath);

  if (!config) {
    return (
      <Empty
        message={`Content not available: "${content.configPath}" not registered.`}
      />
    );
  }

  switch (content.type) {
    case "table":
      return (
        <ConfiguredTable
          config={config as DAGTableConfig}
          params={params}
          className="h-full"
        />
      );

    case "form":
      return (
        <ConfiguredForm
          config={config as DAGFormConfig}
          params={params}
          panelOnly={true}
          onToggleDetail={panelId ? () => togglePanel(panelId) : undefined}
        />
      );

    case "tabs":
      return (
        <ConfiguredTabs
          config={config as DAGTabConfig}
          params={params}
          className="h-full"
        />
      );

    case "layout": {
      // Lazy import to avoid circular dependency
      const { LayoutEngine } = require("../layout-engine");
      return <LayoutEngine config={config as DAGLayoutConfig} />;
    }

    default:
      return <Empty message={`Unknown content type: "${content.type}"`} />;
  }
}
```

---

## Task 2: `split-layout.tsx`

**File:** `src/components/layout-engine/layouts/split-layout.tsx`

- [ ] Create:

```tsx
// src/components/layout-engine/layouts/split-layout.tsx
import { useEffect, useRef } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useLayoutContext } from "../core/layout-context";
import { LayoutContentRenderer } from "../content/layout-content-renderer";
import type { SplitLayoutConfig } from "../types/layout.types";

interface SplitLayoutProps {
  config: SplitLayoutConfig;
}

export function SplitLayout({ config }: SplitLayoutProps) {
  const { panels, togglePanel, setPanelSize } = useLayoutContext();
  const panelRefs = useRef<Record<string, ImperativePanelHandle | null>>({});

  // Sync LayoutContext collapse state → react-resizable-panels
  useEffect(() => {
    for (const panel of config.panels) {
      const ref = panelRefs.current[panel.id];
      if (!ref) continue;
      const state = panels[panel.id];
      if (!state) continue;
      if (state.isCollapsed && !ref.isCollapsed()) ref.collapse();
      if (!state.isCollapsed && ref.isCollapsed()) ref.expand();
    }
  }, [panels, config.panels]);

  return (
    <ResizablePanelGroup
      direction={config.direction}
      className="h-full w-full"
      onLayout={(sizes) => {
        config.panels.forEach((panel, i) => {
          setPanelSize(panel.id, sizes[i] ?? panel.defaultSize);
        });
      }}
    >
      {config.panels.map((panel, index) => (
        <>
          {index > 0 && <ResizableHandle key={`handle-${panel.id}`} withHandle />}
          <ResizablePanel
            key={panel.id}
            ref={(el) => { panelRefs.current[panel.id] = el; }}
            defaultSize={panel.defaultSize}
            minSize={panel.minSize ?? 10}
            maxSize={panel.maxSize}
            collapsible={panel.collapsible}
            onCollapse={() => {
              // Keep context in sync when user drags panel closed
              const state = panels[panel.id];
              if (state && !state.isCollapsed) togglePanel(panel.id);
            }}
            onExpand={() => {
              const state = panels[panel.id];
              if (state && state.isCollapsed) togglePanel(panel.id);
            }}
          >
            <LayoutContentRenderer content={panel.content} panelId={panel.id} />
          </ResizablePanel>
        </>
      ))}
    </ResizablePanelGroup>
  );
}
```

---

## Task 3: `stack-layout.tsx`

**File:** `src/components/layout-engine/layouts/stack-layout.tsx`

- [ ] Create (vertical direction, same pattern as SplitLayout):

```tsx
// src/components/layout-engine/layouts/stack-layout.tsx
import { useEffect, useRef } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useLayoutContext } from "../core/layout-context";
import { LayoutContentRenderer } from "../content/layout-content-renderer";
import type { StackLayoutConfig } from "../types/layout.types";

interface StackLayoutProps {
  config: StackLayoutConfig;
}

export function StackLayout({ config }: StackLayoutProps) {
  const { panels, togglePanel, setPanelSize } = useLayoutContext();
  const panelRefs = useRef<Record<string, ImperativePanelHandle | null>>({});

  useEffect(() => {
    for (const panel of config.panels) {
      const ref = panelRefs.current[panel.id];
      if (!ref) continue;
      const state = panels[panel.id];
      if (!state) continue;
      if (state.isCollapsed && !ref.isCollapsed()) ref.collapse();
      if (!state.isCollapsed && ref.isCollapsed()) ref.expand();
    }
  }, [panels, config.panels]);

  return (
    <ResizablePanelGroup
      direction="vertical"
      className="h-full w-full"
      onLayout={(sizes) => {
        config.panels.forEach((panel, i) => {
          setPanelSize(panel.id, sizes[i] ?? panel.defaultSize);
        });
      }}
    >
      {config.panels.map((panel, index) => (
        <>
          {index > 0 && <ResizableHandle key={`handle-${panel.id}`} withHandle />}
          <ResizablePanel
            key={panel.id}
            ref={(el) => { panelRefs.current[panel.id] = el; }}
            defaultSize={panel.defaultSize}
            minSize={panel.minSize ?? 10}
            maxSize={panel.maxSize}
            collapsible={panel.collapsible}
            onCollapse={() => {
              const state = panels[panel.id];
              if (state && !state.isCollapsed) togglePanel(panel.id);
            }}
            onExpand={() => {
              const state = panels[panel.id];
              if (state && state.isCollapsed) togglePanel(panel.id);
            }}
          >
            <LayoutContentRenderer content={panel.content} panelId={panel.id} />
          </ResizablePanel>
        </>
      ))}
    </ResizablePanelGroup>
  );
}
```

---

## Task 4: `sidebar-layout.tsx`

**File:** `src/components/layout-engine/layouts/sidebar-layout.tsx`

- [ ] Create:

```tsx
// src/components/layout-engine/layouts/sidebar-layout.tsx
import { useEffect, useRef } from "react";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useLayoutContext } from "../core/layout-context";
import { LayoutContentRenderer } from "../content/layout-content-renderer";
import type { SidebarLayoutConfig } from "../types/layout.types";

interface SidebarLayoutProps {
  config: SidebarLayoutConfig;
}

export function SidebarLayout({ config }: SidebarLayoutProps) {
  const { panels, togglePanel, setPanelSize } = useLayoutContext();
  const mainRef = useRef<ImperativePanelHandle | null>(null);
  const sideRef = useRef<ImperativePanelHandle | null>(null);

  const sideState = panels[config.sidePanel.id];

  // Sync LayoutContext.togglePanel → react-resizable-panels
  useEffect(() => {
    if (!sideRef.current || !sideState) return;
    if (sideState.isCollapsed && !sideRef.current.isCollapsed()) {
      sideRef.current.collapse();
    } else if (!sideState.isCollapsed && sideRef.current.isCollapsed()) {
      sideRef.current.expand();
    }
  }, [sideState]);

  // Direction: right side panel = main first, side second
  // Left side panel = side first, main second
  const isRightSide = (config.side ?? "right") === "right";

  const mainPanel = (
    <ResizablePanel
      key={config.mainPanel.id}
      ref={mainRef}
      defaultSize={config.mainPanel.defaultSize}
      minSize={config.mainPanel.minSize ?? 30}
      maxSize={config.mainPanel.maxSize}
    >
      <LayoutContentRenderer
        content={config.mainPanel.content}
        panelId={config.mainPanel.id}
      />
    </ResizablePanel>
  );

  const sidePanel = (
    <ResizablePanel
      key={config.sidePanel.id}
      ref={sideRef}
      defaultSize={config.sidePanel.defaultSize}
      minSize={config.sidePanel.minSize ?? 0}
      maxSize={config.sidePanel.maxSize ?? 50}
      collapsible={config.sidePanel.collapsible ?? true}
      onCollapse={() => {
        if (sideState && !sideState.isCollapsed) togglePanel(config.sidePanel.id);
      }}
      onExpand={() => {
        if (sideState && sideState.isCollapsed) togglePanel(config.sidePanel.id);
      }}
      onResize={(size) => setPanelSize(config.sidePanel.id, size)}
    >
      <LayoutContentRenderer
        content={config.sidePanel.content}
        panelId={config.sidePanel.id}
      />
    </ResizablePanel>
  );

  return (
    <ResizablePanelGroup
      direction="horizontal"
      className="h-full w-full"
    >
      {isRightSide ? (
        <>
          {mainPanel}
          <ResizableHandle withHandle />
          {sidePanel}
        </>
      ) : (
        <>
          {sidePanel}
          <ResizableHandle withHandle />
          {mainPanel}
        </>
      )}
    </ResizablePanelGroup>
  );
}
```

---

## Task 5: `layout-engine.tsx` dispatcher

**File:** `src/components/layout-engine/layout-engine.tsx`

- [ ] Create:

```tsx
// src/components/layout-engine/layout-engine.tsx
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import { LayoutContextProvider } from "./core/layout-context";
import { SplitLayout } from "./layouts/split-layout";
import { StackLayout } from "./layouts/stack-layout";
import { SidebarLayout } from "./layouts/sidebar-layout";
import type { DAGLayoutConfig } from "./types/layout.types";

export interface LayoutEngineProps {
  config: DAGLayoutConfig;
  /** Initial params (e.g. from TanStack Router route params or dropped object) */
  params?: Record<string, JsonPrimitive>;
}

export function LayoutEngine({ config, params = {} }: LayoutEngineProps) {
  return (
    <LayoutContextProvider config={config} initialParams={params}>
      <LayoutEngineInner config={config} />
    </LayoutContextProvider>
  );
}

function LayoutEngineInner({ config }: { config: DAGLayoutConfig }) {
  switch (config.type) {
    case "split":
      return <SplitLayout config={config} />;
    case "stack":
      return <StackLayout config={config} />;
    case "sidebar":
      return <SidebarLayout config={config} />;
    default: {
      const _exhaustive: never = config;
      return null;
    }
  }
}
```

---

## Task 6: Export `LayoutEngine` from index

**File:** `src/components/layout-engine/index.ts`

- [ ] Add to existing exports:

```ts
export { LayoutEngine } from "./layout-engine";
export type { LayoutEngineProps } from "./layout-engine";
```

---

## Task 7: Verify and commit

- [ ] Run `npm run check` — zero errors.
- [ ] Run `npm run build` — must succeed.

- [ ] Commit:

```bash
git add src/components/layout-engine/
git commit -m "feat(layout-engine): add layout components, LayoutEngine dispatcher (phase 2)"
```
