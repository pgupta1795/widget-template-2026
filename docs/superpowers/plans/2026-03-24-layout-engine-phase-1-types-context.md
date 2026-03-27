# Layout Engine — Phase 1: Types + LayoutContext

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create all Layout Engine TypeScript types and the `LayoutContext` (React context + hook) that owns panel state and params.

**Architecture:** `LayoutContext` is a React context that holds panel open/closed state (keyed by panel ID), `params`, and `togglePanel`. All layout child components (form, tabs, table) access it via `useLayoutContext()` — zero prop drilling. The types use a proper discriminated union (`SplitLayoutConfig | StackLayoutConfig | SidebarLayoutConfig`). Tab Engine Phase 1 must be complete.

**Tech Stack:** React 19, TypeScript 5

**Spec:** `docs/superpowers/specs/2026-03-24-layout-engine-design.md`

**Next phase:** `docs/superpowers/plans/2026-03-24-layout-engine-phase-2-layouts.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/layout-engine/types/layout.types.ts` | Create — all layout type interfaces |
| `src/components/layout-engine/core/layout-context.tsx` | Create — LayoutContext + useLayoutContext |
| `src/components/layout-engine/index.ts` | Create — public barrel |

---

## Task 1: `layout.types.ts`

**File:** `src/components/layout-engine/types/layout.types.ts`

- [ ] Create:

```ts
// src/components/layout-engine/types/layout.types.ts
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

// ── Content Config ────────────────────────────────────────────────────────────

export type LayoutContentType = "table" | "form" | "tabs" | "layout";

export interface LayoutContentConfig {
  /** Content type — dispatched to ConfiguredTable/Form/Tabs/LayoutEngine */
  type: LayoutContentType;
  /**
   * Key for TabConfigRegistry lookup.
   * Must match a registerConfig() call at feature bootstrap time.
   * e.g. "./ca-form.config.ts"
   */
  configPath: string;
}

// ── Panel Configs ─────────────────────────────────────────────────────────────

export interface BasePanelConfig {
  /** Unique ID used with useLayoutContext().togglePanel(id) */
  id: string;
  /** Initial size as a percentage (react-resizable-panels) */
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
  collapsible?: boolean;
  content: LayoutContentConfig;
}

export interface SidebarPanelConfig extends BasePanelConfig {
  /** Whether the side panel starts collapsed */
  defaultCollapsed?: boolean;
}

// ── Layout Configs (discriminated union) ──────────────────────────────────────

interface BaseLayoutConfig {
  layoutId: string;
  /**
   * TanStack Router route path — for documentation and createLayoutRoute() helper.
   * e.g. "/xen/ca/$nodeId"
   */
  routePath: string;
  title?: string;
}

export interface SplitLayoutConfig extends BaseLayoutConfig {
  type: "split";
  direction: "horizontal" | "vertical";
  panels: BasePanelConfig[];
}

export interface StackLayoutConfig extends BaseLayoutConfig {
  type: "stack";
  panels: BasePanelConfig[];
}

export interface SidebarLayoutConfig extends BaseLayoutConfig {
  type: "sidebar";
  side?: "right" | "left";
  mainPanel: BasePanelConfig;
  sidePanel: SidebarPanelConfig;
  /** Accepted drag-and-drop object types — consumed by the feature route/Layout Engine */
  acceptedDropTypes?: string[];
  /** Param name for the dropped object's ID */
  dropParamName?: string;
}

export type DAGLayoutConfig =
  | SplitLayoutConfig
  | StackLayoutConfig
  | SidebarLayoutConfig;

// ── Context Types ─────────────────────────────────────────────────────────────

export interface PanelState {
  isCollapsed: boolean;
  size: number;
}

export interface LayoutContextValue {
  panels: Record<string, PanelState>;
  togglePanel: (panelId: string) => void;
  setPanelSize: (panelId: string, size: number) => void;
  /** Merged route params + DnD params — JsonPrimitive (route params are strings) */
  params: Record<string, JsonPrimitive>;
  setParams: (params: Record<string, JsonPrimitive>) => void;
}
```

---

## Task 2: `layout-context.tsx`

**File:** `src/components/layout-engine/core/layout-context.tsx`

- [ ] Create:

```tsx
// src/components/layout-engine/core/layout-context.tsx
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import type { DAGLayoutConfig, LayoutContextValue, PanelState } from "../types/layout.types";

const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayoutContext(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) {
    throw new Error("useLayoutContext must be used inside <LayoutContextProvider>");
  }
  return ctx;
}

interface LayoutContextProviderProps {
  config: DAGLayoutConfig;
  initialParams?: Record<string, JsonPrimitive>;
  children: React.ReactNode;
}

export function LayoutContextProvider({
  config,
  initialParams = {},
  children,
}: LayoutContextProviderProps) {
  // Initialise panel states from config
  const [panels, setPanels] = useState<Record<string, PanelState>>(() => {
    const initial: Record<string, PanelState> = {};

    if (config.type === "split" || config.type === "stack") {
      for (const panel of config.panels) {
        initial[panel.id] = { isCollapsed: false, size: panel.defaultSize };
      }
    } else if (config.type === "sidebar") {
      initial[config.mainPanel.id] = { isCollapsed: false, size: config.mainPanel.defaultSize };
      initial[config.sidePanel.id] = {
        isCollapsed: config.sidePanel.defaultCollapsed ?? false,
        size: config.sidePanel.defaultSize,
      };
    }
    return initial;
  });

  const [params, setParamsState] = useState<Record<string, JsonPrimitive>>(initialParams);

  const togglePanel = useCallback((panelId: string) => {
    setPanels((prev) => {
      const current = prev[panelId];
      if (!current) return prev;
      return { ...prev, [panelId]: { ...current, isCollapsed: !current.isCollapsed } };
    });
  }, []);

  const setPanelSize = useCallback((panelId: string, size: number) => {
    setPanels((prev) => {
      const current = prev[panelId];
      if (!current) return prev;
      return { ...prev, [panelId]: { ...current, size } };
    });
  }, []);

  const setParams = useCallback((next: Record<string, JsonPrimitive>) => {
    setParamsState(next);
  }, []);

  const value = useMemo<LayoutContextValue>(
    () => ({ panels, togglePanel, setPanelSize, params, setParams }),
    [panels, togglePanel, setPanelSize, params, setParams],
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}
```

---

## Task 3: `index.ts` barrel (types only for now)

**File:** `src/components/layout-engine/index.ts`

- [ ] Create:

```ts
// src/components/layout-engine/index.ts
export type {
  DAGLayoutConfig,
  SplitLayoutConfig,
  StackLayoutConfig,
  SidebarLayoutConfig,
  LayoutContentConfig,
  BasePanelConfig,
  SidebarPanelConfig,
  LayoutContextValue,
  PanelState,
} from "./types/layout.types";
export { useLayoutContext, LayoutContextProvider } from "./core/layout-context";
// LayoutEngine, createLayoutRoute exported in Phase 2 and 3
```

---

## Task 4: Verify and commit

- [ ] Run `npm run check` — zero errors.
- [ ] Run `npm run build` — must succeed.

- [ ] Commit:

```bash
git add src/components/layout-engine/
git commit -m "feat(layout-engine): add layout types and LayoutContext (phase 1)"
```
