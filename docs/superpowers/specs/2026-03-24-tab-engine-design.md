# Tab Engine Design
_Date: 2026-03-24_

## Overview

A configuration-driven tab rendering engine that composes existing table, form, and nested tab configs. Tab content types are registered via a `TabContentRegistry` — strictly config-driven, extensible without touching core code.

---

## Goals

- Config-driven tabs with icons, colors, custom classNames, disabled state
- `displayExpression` (JSONata) for conditional tab visibility at runtime
- `indicatorStyle: "underline" | "filled" | "pill"` with className override
- Extensible content type registry: `table`, `form`, `tabs` built-in; new types injectable
- References sibling configs by relative path — no inline embedding
- Separate `DAGTabConfig` file per feature (e.g. `ca-tabs.config.ts`)

---

## Architecture

### TabContentRegistry

The core extensibility mechanism — same pattern as `node-registry` and `FieldTypeRegistry`:

```ts
interface TabContentDefinition {
  type: string;                                          // e.g. "table", "form", "tabs"
  render: (config: unknown, params: Record<string, JsonPrimitive>) => React.ReactNode;
}

registerTabContentType(definition: TabContentDefinition): void
getTabContentRenderer(type: string): TabContentDefinition | undefined
```

**Config loading strategy:** Vite does not support fully dynamic `import(stringVariable)` in production builds. Instead, all configs are imported statically and registered in a central **config registry** at bootstrap:

```ts
// src/components/tab-engine/core/tab-config-registry.ts
const configRegistry = new Map<string, unknown>();
export function registerConfig(path: string, config: unknown): void { configRegistry.set(path, config); }
export function getConfig(path: string): unknown { return configRegistry.get(path); }
```

Feature bootstraps register their configs:
```ts
// src/features/xen/bootstrap.ts  (feature-level, NOT inside components/)
import { registerConfig } from '@/components/tab-engine';
import { caSearchConfig }  from './configs/ca-search.config';
import { caFormConfig }    from './configs/ca-form.config';
import { caTabsConfig }    from './configs/ca-tabs.config';

registerConfig('./ca-search.config.ts', caSearchConfig);
registerConfig('./ca-form.config.ts',   caFormConfig);
registerConfig('./ca-tabs.config.ts',   caTabsConfig);
```

`configPath` in tab/layout configs is a stable string key — looked up from this registry at render time, not via `import()`.

Built-in content type registrations (in `tab-engine/bootstrap.ts`):
- `table` → renders `<ConfiguredTable config={...} params={params} />`
- `form` → renders `<ConfiguredForm config={...} params={params} />`
- `tabs` → renders `<ConfiguredTabs config={...} params={params} />` (nested)

Adding a new type in the future:
```ts
registerTabContentType({
  type: "chart",
  render: (config, params) => <ConfiguredChart config={config as DAGChartConfig} params={params} />,
});
```

---

## Config Shape

```ts
// DAGTabConfig
export interface DAGTabConfig {
  tabId: string;
  indicatorStyle?: "underline" | "filled" | "pill";  // default: "underline"
  className?: string;                                  // override tab container styles
  tabs: TabItemConfig[];
}

export interface TabItemConfig {
  id: string;
  label: string;
  icon?: string;               // lucide-react icon name e.g. "Users", "ListChecks"
  color?: string;              // text/icon color override
  className?: string;          // per-tab className
  disabled?: boolean;
  displayExpression?: string;  // JSONata — e.g. '$params.type = "ChangeAction"'
  content: TabContentConfig;
}

export interface TabContentConfig {
  type: string;      // open string — extensible via TabContentRegistry; "table" | "form" | "tabs" built-in
  configPath: string; // registry key matching what was registered via registerConfig()
}
```

---

## displayExpression Evaluation

JSONata expressions are evaluated using the existing `jsonata-evaluator.ts` via `evaluateExpr`. A new optional `bindings` parameter is added to `evaluateExpr` (additive, non-breaking):

```ts
// jsonata-evaluator.ts — extended signature
export async function evaluateExpr(
  expr: string,
  data: unknown,
  params: Record<string, JsonPrimitive>,
  extraBindings?: Record<string, unknown>   // NEW optional parameter
): Promise<unknown>
```

Tab evaluation passes `$tab` via `extraBindings`:
```ts
evaluateExpr(
  tab.displayExpression,
  {},
  params,
  { tab: { id: tab.id, label: tab.label } }  // accessible as $tab in JSONata
)
```

If `displayExpression` evaluates to falsy → tab is hidden (not rendered, not in DOM).
If `disabled: true` → tab is rendered but non-interactive.

**`defaultTabId` fallback:** If the specified `defaultTabId` is hidden (by `displayExpression`) or disabled, the engine falls back to the first visible, non-disabled tab. If no tabs are visible, the tab list renders empty with a "No content available" message.

---

## ConfiguredTabs Component

```tsx
interface ConfiguredTabsProps {
  config: DAGTabConfig;
  params?: Record<string, JsonPrimitive>;   // consistent with ConfiguredTable/ConfiguredForm
  defaultTabId?: string;                     // override default active tab; falls back to first visible tab
  onTabChange?: (tabId: string) => void;
}

export function ConfiguredTabs({ config, params, defaultTabId, onTabChange }: ConfiguredTabsProps)
```

- Uses `src/components/ui/tabs.tsx` (shadcn/ui) as the base primitive
- Evaluates all `displayExpression` fields against `params` on render
- Lazy-loads tab content config via `configPath` on first activation (not upfront)
- Passes `params` down to child `ConfiguredTable` / `ConfiguredForm` / `ConfiguredTabs`

---

## Styling

### indicatorStyle Variants

| Style | Appearance |
|---|---|
| `underline` | 3DX-style bottom border on active tab trigger (default) |
| `filled` | Active tab has filled background |
| `pill` | Active tab has rounded pill background |

Implemented via `class-variance-authority` variants on the tab trigger:

```ts
const tabTriggerVariants = cva("base-tab-styles", {
  variants: {
    indicatorStyle: {
      underline: "border-b-2 border-transparent data-[state=active]:border-primary rounded-none",
      filled:    "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
      pill:      "rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
    },
  },
  defaultVariants: { indicatorStyle: "underline" },
});
```

### Tab Icon & Color

```tsx
// Each tab trigger renders:
<TabsTrigger className={cn(tabTriggerVariants({ indicatorStyle }), tab.className)}>
  {tab.icon && <LucideIcon name={tab.icon} className={tab.color ? `text-[${tab.color}]` : ""} size={16} />}
  <span>{tab.label}</span>
</TabsTrigger>
```

Icons resolved via the existing `icon-resolver.ts` from the toolbar system.

---

## Nested Sub-tabs

When `content.type === "tabs"`, the tab content renders another `<ConfiguredTabs>` with the config loaded from `configPath`. Nesting is unlimited but practically 2 levels (as in the screenshot: root tabs → sub-tabs).

```ts
// ca-tabs.config.ts
{
  id: "proposed-changes",
  label: "Proposed Changes",
  icon: "ListChecks",
  content: {
    type: "table",
    configPath: "./ca-proposed-changes.config.ts",
  }
}

// sub-tabs example
{
  id: "details",
  label: "Details",
  content: {
    type: "tabs",
    configPath: "./ca-details-tabs.config.ts",  // nested tab config
  }
}
```

---

## use-tab-display Hook

```ts
// hooks/use-tab-display.ts
interface UseTabDisplayResult {
  visibleTabs: TabItemConfig[];       // tabs passing displayExpression
  activeTabId: string;                // resolved active tab (with defaultTabId fallback)
}

export function useTabDisplay(
  tabs: TabItemConfig[],
  params: Record<string, JsonPrimitive>,
  defaultTabId?: string
): UseTabDisplayResult
```

Evaluates all `displayExpression` fields asynchronously on mount and when `params` changes. Returns only the tabs that should be rendered, and the resolved active tab ID.

## Content Loading State

When a tab is first activated, its config is looked up from the registry synchronously (no async). If the config is not found (not registered), the tab content area renders an `<Empty>` state with message "Content not available." No suspense or loading spinner needed since config lookup is synchronous.

## Folder Structure

```
src/components/tab-engine/
├── core/
│   ├── tab-content-registry.ts    # injectable TabContentRegistry
│   └── tab-config-registry.ts     # central config path → config object map
├── hooks/
│   └── use-tab-display.ts         # evaluates displayExpression per tab; see interface above
├── types/
│   └── tab.types.ts               # DAGTabConfig, TabItemConfig, TabContentConfig
├── configured-tabs.tsx            # main component
├── bootstrap.ts                   # registers table, form, tabs content types
└── index.ts                       # exports: ConfiguredTabs, DAGTabConfig, registerTabContentType, registerConfig
```

## Bootstrap Ordering

Tab Engine bootstrap depends on Form Engine and Table Engine being bootstrapped first (it registers renderers that reference `ConfiguredForm` and `ConfiguredTable`). Ordering in `src/main.tsx`:
```ts
bootstrapFormEngine();   // 1st
bootstrapTabEngine();    // 2nd — references ConfiguredForm, ConfiguredTable
bootstrapLayoutEngine(); // 3rd — references ConfiguredTabs
```

---

## Example Config (Change Action Tabs)

```ts
// src/features/xen/configs/ca-tabs.config.ts
export const caTabsConfig: DAGTabConfig = {
  tabId: "ca-tabs",
  indicatorStyle: "underline",
  tabs: [
    {
      id: "members",
      label: "Members",
      icon: "Users",
      content: { type: "table", configPath: "./ca-members.config.ts" },
    },
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
      content: { type: "table", configPath: "./ca-realized.config.ts" },
    },
    {
      id: "approvals",
      label: "Approvals",
      icon: "BadgeCheck",
      displayExpression: '$params.hasApprovals = true',
      content: { type: "table", configPath: "./ca-approvals.config.ts" },
    },
  ],
};
```
