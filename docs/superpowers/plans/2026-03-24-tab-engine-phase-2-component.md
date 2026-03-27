# Tab Engine — Phase 2: `ConfiguredTabs` Component + CA Config

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `useTabDisplay` hook, `ConfiguredTabs` component with `cva` indicator variants, icon support, and a sample CA tabs config.

**Architecture:** `useTabDisplay` evaluates `displayExpression` per tab using the extended `evaluateExpr` with `extraBindings`. `ConfiguredTabs` uses shadcn/ui `<Tabs>` as the base primitive with `cva` variants for indicator style. Tab content is rendered by looking up the config from `TabConfigRegistry` and dispatching to `TabContentRegistry`. Phase 1 must be complete.

**Tech Stack:** React 19, TanStack Query v5, shadcn/ui Tabs, lucide-react, class-variance-authority, tailwind v4

**Spec:** `docs/superpowers/specs/2026-03-24-tab-engine-design.md`

**Prev phase:** `docs/superpowers/plans/2026-03-24-tab-engine-phase-1-registry.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/tab-engine/hooks/use-tab-display.ts` | Create — displayExpression evaluator |
| `src/components/tab-engine/configured-tabs.tsx` | Create — main component |
| `src/components/tab-engine/index.ts` | Modify — export ConfiguredTabs |
| `src/features/xen/configs/ca-tabs.config.ts` | Create — sample CA tabs config |
| `src/features/xen/bootstrap.ts` | Create — registers xen configs |
| `src/main.tsx` | Modify — call xen feature bootstrap |

---

## Task 1: `use-tab-display.ts` hook

**File:** `src/components/tab-engine/hooks/use-tab-display.ts`

- [ ] Create:

```ts
// src/components/tab-engine/hooks/use-tab-display.ts
import { useEffect, useState } from "react";
import { evaluateExpr } from "@/components/data-grid/table-engine/jsonata-evaluator";
import { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import type { TabItemConfig } from "../types/tab.types";

export interface UseTabDisplayResult {
  /** Tabs that passed their displayExpression (or had none) */
  visibleTabs: TabItemConfig[];
  /** Resolved active tab ID — falls back to first visible non-disabled tab */
  activeTabId: string;
}

export function useTabDisplay(
  tabs: TabItemConfig[],
  params: Record<string, JsonPrimitive>,
  defaultTabId?: string,
): UseTabDisplayResult {
  const [visibleTabs, setVisibleTabs] = useState<TabItemConfig[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function evaluate() {
      const ctx = new NodeContext(params);
      const results: TabItemConfig[] = [];

      for (const tab of tabs) {
        if (!tab.displayExpression) {
          results.push(tab);
          continue;
        }
        try {
          const visible = await evaluateExpr<boolean>(
            tab.displayExpression,
            ctx,
            {},
            { tab: { id: tab.id, label: tab.label } }, // $tab binding
          );
          if (visible) results.push(tab);
        } catch {
          // On expression error, show the tab (fail-open)
          results.push(tab);
        }
      }

      if (!cancelled) setVisibleTabs(results);
    }

    void evaluate();
    return () => { cancelled = true; };
  }, [tabs, params]);

  // Resolve active tab ID
  const firstVisible = visibleTabs.find((t) => !t.disabled);
  const requestedTab = defaultTabId
    ? visibleTabs.find((t) => t.id === defaultTabId && !t.disabled)
    : undefined;
  const activeTabId = (requestedTab ?? firstVisible)?.id ?? "";

  return { visibleTabs, activeTabId };
}
```

---

## Task 2: Tab trigger CVA variants

- [ ] Create `src/components/tab-engine/tab-trigger-variants.ts`:

```ts
// src/components/tab-engine/tab-trigger-variants.ts
import { cva } from "class-variance-authority";

export const tabTriggerVariants = cva(
  // Base styles — applied to all triggers regardless of indicator style
  "inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      indicatorStyle: {
        underline: [
          "border-b-2 border-transparent rounded-none",
          "data-[state=active]:border-primary data-[state=active]:text-foreground",
          "text-muted-foreground hover:text-foreground",
        ],
        filled: [
          "rounded-md",
          "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
        ],
        pill: [
          "rounded-full",
          "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
          "text-muted-foreground hover:text-foreground hover:bg-muted",
        ],
      },
    },
    defaultVariants: {
      indicatorStyle: "underline",
    },
  },
);
```

---

## Task 3: `configured-tabs.tsx`

**File:** `src/components/tab-engine/configured-tabs.tsx`

- [ ] Create:

```tsx
// src/components/tab-engine/configured-tabs.tsx
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveIcon } from "@/components/data-grid/toolbar/icon-resolver";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import { getConfig } from "./core/tab-config-registry";
import { tabContentRegistry } from "./core/tab-content-registry";
import { useTabDisplay } from "./hooks/use-tab-display";
import { tabTriggerVariants } from "./tab-trigger-variants";
import type { DAGTabConfig } from "./types/tab.types";
import { Empty } from "@/components/ui/empty";

export interface ConfiguredTabsProps {
  config: DAGTabConfig;
  params?: Record<string, JsonPrimitive>;
  defaultTabId?: string;
  onTabChange?: (tabId: string) => void;
  className?: string;
}

export function ConfiguredTabs({
  config,
  params = {},
  defaultTabId,
  onTabChange,
  className,
}: ConfiguredTabsProps) {
  const { visibleTabs, activeTabId } = useTabDisplay(config.tabs, params, defaultTabId);
  const indicatorStyle = config.indicatorStyle ?? "underline";

  if (visibleTabs.length === 0) {
    return <Empty message="No content available." />;
  }

  return (
    <Tabs
      defaultValue={activeTabId}
      onValueChange={onTabChange}
      className={cn("flex h-full flex-col", className)}
    >
      {/* Tab List */}
      <TabsList
        className={cn(
          "h-auto w-full justify-start rounded-none border-b bg-transparent p-0",
          indicatorStyle === "underline" ? "gap-0" : "gap-1 p-1",
          config.className,
        )}
      >
        {visibleTabs.map((tab) => {
          const Icon = tab.icon ? resolveIcon(tab.icon) : null;
          return (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              disabled={tab.disabled}
              className={cn(
                tabTriggerVariants({ indicatorStyle }),
                tab.className,
              )}
              style={tab.color ? { color: tab.color } : undefined}
            >
              {Icon && <Icon size={14} />}
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {/* Tab Content */}
      {visibleTabs.map((tab) => {
        const tabConfig = getConfig(tab.content.configPath);
        if (!tabConfig) {
          return (
            <TabsContent key={tab.id} value={tab.id} className="flex-1 overflow-auto">
              <Empty message={`Content not available: "${tab.content.configPath}" not registered.`} />
            </TabsContent>
          );
        }

        let renderer: ((config: unknown, params: Record<string, JsonPrimitive>) => React.ReactNode) | null = null;
        try {
          renderer = tabContentRegistry.resolve(tab.content.type).render;
        } catch {
          return (
            <TabsContent key={tab.id} value={tab.id} className="flex-1 overflow-auto">
              <Empty message={`Unknown content type: "${tab.content.type}"`} />
            </TabsContent>
          );
        }

        return (
          <TabsContent
            key={tab.id}
            value={tab.id}
            className="flex-1 overflow-auto mt-0"
          >
            {renderer(tabConfig, params)}
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
```

---

## Task 4: Export `ConfiguredTabs` from index

**File:** `src/components/tab-engine/index.ts`

- [ ] Add to existing exports:

```ts
export { ConfiguredTabs } from "./configured-tabs";
export type { ConfiguredTabsProps } from "./configured-tabs";
```

---

## Task 5: Sample CA tabs config

**File:** `src/features/xen/configs/ca-tabs.config.ts`

- [ ] Create:

```ts
// src/features/xen/configs/ca-tabs.config.ts
import type { DAGTabConfig } from "@/components/tab-engine";

export const caTabsConfig: DAGTabConfig = {
  tabId: "ca-tabs",
  indicatorStyle: "underline",
  tabs: [
    {
      id: "proposed-changes",
      label: "Proposed Changes",
      icon: "ListChecks",
      content: { type: "table", configPath: "./ca-search.config.ts" },
    },
    {
      id: "realized-changes",
      label: "Realized Changes",
      icon: "CheckSquare",
      content: { type: "table", configPath: "./ca-search.config.ts" },
    },
    {
      id: "approvals",
      label: "Approvals",
      icon: "BadgeCheck",
      displayExpression: '$params.nodeId != ""',
      content: { type: "table", configPath: "./ca-search.config.ts" },
    },
  ],
};
```

---

## Task 6: Xen feature bootstrap

**File:** `src/features/xen/bootstrap.ts`

- [ ] Create:

```ts
// src/features/xen/bootstrap.ts
// Registers all xen feature configs into the TabConfigRegistry.
// Called from src/main.tsx after tab engine bootstrap.
import { registerConfig } from "@/components/tab-engine";
import { caSearchConfig }  from "./configs/ca-search.config";
import { caFormConfig }    from "./configs/ca-form.config";
import { caTabsConfig }    from "./configs/ca-tabs.config";
import { engSearchConfig } from "./configs/eng-search.config";
import { engExpandConfig } from "./configs/eng-expand.config";

export function bootstrapXenFeature(): void {
  registerConfig("./ca-search.config.ts",  caSearchConfig);
  registerConfig("./ca-form.config.ts",    caFormConfig);
  registerConfig("./ca-tabs.config.ts",    caTabsConfig);
  registerConfig("./eng-search.config.ts", engSearchConfig);
  registerConfig("./eng-expand.config.ts", engExpandConfig);
}
```

---

## Task 7: Wire xen bootstrap in `main.tsx`

**File:** `src/main.tsx`

- [ ] Add (after `bootstrapTabEngine()`):

```ts
import { bootstrapXenFeature } from "@/features/xen/bootstrap";

bootstrapXenFeature(); // must run after bootstrapTabEngine()
```

---

## Task 8: Verify and commit

- [ ] Run `npm run check` — zero errors.
- [ ] Run `npm run build` — must succeed.
- [ ] Start dev server and verify tab rendering works (even without real API — config registration should succeed).

- [ ] Commit:

```bash
git add src/components/tab-engine/ \
        src/features/xen/configs/ca-tabs.config.ts \
        src/features/xen/bootstrap.ts \
        src/main.tsx
git commit -m "feat(tab-engine): add ConfiguredTabs, use-tab-display, CA tabs config (phase 2)"
```
