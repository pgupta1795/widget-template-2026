# Tab Engine — Phase 1: Types + Registries + Bootstrap

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the Tab Engine type system, `TabContentRegistry`, `TabConfigRegistry`, and bootstrap. No UI yet.

**Architecture:** `TabConfigRegistry` is a central `Map<string, unknown>` that stores config objects keyed by their path string (solves Vite static import constraint). `TabContentRegistry` maps content type strings to render functions. Both are singletons. Feature-level bootstraps call `registerConfig()` to populate the registry. Tab Engine bootstrap registers built-in content types (`table`, `form`, `tabs`). Form Engine Phase 4 must be complete.

**Tech Stack:** TypeScript 5, React 19

**Spec:** `docs/superpowers/specs/2026-03-24-tab-engine-design.md`

**Next phase:** `docs/superpowers/plans/2026-03-24-tab-engine-phase-2-component.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/tab-engine/types/tab.types.ts` | Create — all tab type interfaces |
| `src/components/tab-engine/core/tab-content-registry.ts` | Create — content type registry |
| `src/components/tab-engine/core/tab-config-registry.ts` | Create — config path registry |
| `src/components/tab-engine/bootstrap.ts` | Create — registers built-in content types |
| `src/components/tab-engine/index.ts` | Create — public barrel |

---

## Task 1: `tab.types.ts`

**File:** `src/components/tab-engine/types/tab.types.ts`

- [ ] Create:

```ts
// src/components/tab-engine/types/tab.types.ts
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

export type TabIndicatorStyle = "underline" | "filled" | "pill";

export interface DAGTabConfig {
  tabId: string;
  /** Visual style of the active tab indicator. Default: "underline" */
  indicatorStyle?: TabIndicatorStyle;
  /** Extra className applied to the tab list container */
  className?: string;
  tabs: TabItemConfig[];
}

export interface TabItemConfig {
  id: string;
  label: string;
  /** lucide-react icon name e.g. "Users", "ListChecks" */
  icon?: string;
  /** CSS color value for the icon/label e.g. "#3b82f6" or "hsl(var(--primary))" */
  color?: string;
  /** Extra className applied to this tab's trigger */
  className?: string;
  disabled?: boolean;
  /**
   * JSONata expression evaluated against params context.
   * If falsy, tab is hidden (not rendered).
   * Binding: $params (from LayoutContext or props), $tab.id, $tab.label
   */
  displayExpression?: string;
  content: TabContentConfig;
}

export interface TabContentConfig {
  /**
   * Open string — extensible via TabContentRegistry.
   * Built-in types: "table" | "form" | "tabs"
   */
  type: string;
  /**
   * Key used to look up the config object from TabConfigRegistry.
   * Must match the path string used in registerConfig() calls.
   * e.g. "./ca-search.config.ts"
   */
  configPath: string;
}

export interface TabContentDefinition {
  type: string;
  render: (
    config: unknown,
    params: Record<string, JsonPrimitive>,
  ) => React.ReactNode;
}
```

---

## Task 2: `tab-config-registry.ts`

**File:** `src/components/tab-engine/core/tab-config-registry.ts`

- [ ] Create:

```ts
// src/components/tab-engine/core/tab-config-registry.ts
/**
 * Central config registry.
 *
 * Vite does not support fully dynamic import() strings in production builds.
 * Instead, all configs are imported statically at feature bootstrap time and
 * registered here. Tab/layout configs reference them by a stable string key
 * (conventionally the relative path, e.g. "./ca-search.config.ts").
 *
 * Usage:
 *   // In feature bootstrap (e.g. src/features/xen/bootstrap.ts):
 *   registerConfig("./ca-search.config.ts", caSearchConfig);
 *
 *   // In tab config:
 *   content: { type: "table", configPath: "./ca-search.config.ts" }
 */

const registry = new Map<string, unknown>();

export function registerConfig(path: string, config: unknown): void {
  registry.set(path, config);
}

export function getConfig(path: string): unknown {
  return registry.get(path);
}

export function hasConfig(path: string): boolean {
  return registry.has(path);
}
```

---

## Task 3: `tab-content-registry.ts`

**File:** `src/components/tab-engine/core/tab-content-registry.ts`

- [ ] Create:

```ts
// src/components/tab-engine/core/tab-content-registry.ts
import type { TabContentDefinition } from "../types/tab.types";

export class TabContentRegistry {
  private readonly map = new Map<string, TabContentDefinition>();

  register(definition: TabContentDefinition): this {
    this.map.set(definition.type, definition);
    return this;
  }

  resolve(type: string): TabContentDefinition {
    const def = this.map.get(type);
    if (!def) throw new Error(`[TabEngine] No content renderer registered for type: "${type}"`);
    return def;
  }

  has(type: string): boolean {
    return this.map.has(type);
  }
}

// Singleton — shared across the app
export const tabContentRegistry = new TabContentRegistry();
```

---

## Task 4: `bootstrap.ts`

**File:** `src/components/tab-engine/bootstrap.ts`

- [ ] Create:

```ts
// src/components/tab-engine/bootstrap.ts
// Called from src/main.tsx AFTER bootstrapFormEngine().
// Registers built-in tab content types: "table", "form", "tabs".
// The actual components are lazily imported to avoid circular dependencies.

import { tabContentRegistry } from "./core/tab-content-registry";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

let bootstrapped = false;

export function bootstrapTabEngine(): void {
  if (bootstrapped) return;

  // Lazy imports avoid circular dependency issues at module load time.
  // These are synchronous requires (not dynamic import()) — Vite handles them fine.
  const { ConfiguredTable } = require("@/components/data-grid/table-engine");
  const { ConfiguredForm }  = require("@/components/form-engine");

  tabContentRegistry
    .register({
      type: "table",
      render: (config: unknown, params: Record<string, JsonPrimitive>) => {
        const { createElement } = require("react");
        return createElement(ConfiguredTable, { config, params });
      },
    })
    .register({
      type: "form",
      render: (config: unknown, params: Record<string, JsonPrimitive>) => {
        const { createElement } = require("react");
        return createElement(ConfiguredForm, { config, params });
      },
    })
    .register({
      type: "tabs",
      render: (config: unknown, params: Record<string, JsonPrimitive>) => {
        // Resolved lazily to avoid self-reference at module load time
        const { ConfiguredTabs } = require("./configured-tabs");
        const { createElement } = require("react");
        return createElement(ConfiguredTabs, { config, params });
      },
    });

  bootstrapped = true;
}
```

> **Note:** `require()` is used instead of `import` to avoid circular module resolution issues. Vite/TypeScript handles CommonJS-style require in ESM modules via the bundler. If Biome flags `require`, use `// biome-ignore lint/suspicious/noExplicitAny` or switch to dynamic `import()` with `React.lazy` wrapping in Phase 2.

---

## Task 5: `index.ts` barrel

**File:** `src/components/tab-engine/index.ts`

- [ ] Create:

```ts
// src/components/tab-engine/index.ts
export type { DAGTabConfig, TabItemConfig, TabContentConfig, TabContentDefinition, TabIndicatorStyle } from "./types/tab.types";
export { tabContentRegistry } from "./core/tab-content-registry";
export { registerConfig, getConfig, hasConfig } from "./core/tab-config-registry";
export { bootstrapTabEngine } from "./bootstrap";
// ConfiguredTabs exported in Phase 2
```

---

## Task 6: Wire bootstrap in `main.tsx`

**File:** `src/main.tsx`

- [ ] Add (after `bootstrapFormEngine()`):

```ts
import { bootstrapTabEngine } from "@/components/tab-engine";

bootstrapTabEngine();  // must run after bootstrapFormEngine()
```

---

## Task 7: Verify and commit

- [ ] Run `npm run check` — zero errors.
- [ ] Run `npm run build` — must succeed.

- [ ] Commit:

```bash
git add src/components/tab-engine/ src/main.tsx
git commit -m "feat(tab-engine): add types, TabContentRegistry, TabConfigRegistry, bootstrap (phase 1)"
```
