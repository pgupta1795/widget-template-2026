# Toolbar System — Phase 1: Types & Utilities

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the pure foundation layer for the toolbar system — types, icon resolver, default command definitions, and the merge utility.

**Architecture:** All files in this phase are pure TypeScript (no React, no DOM). They have no dependencies on DataGrid internals, making them independently testable. The renderer phases build on top of these.

**Tech Stack:** TypeScript, Vitest, lucide-react (icon resolution only)

**Spec:** `docs/superpowers/specs/2026-03-16-toolbar-customization-design.md`

---

## Chunk 1: Types & Icon Resolver

### Task 1: Create toolbar types file

**Files:**
- Create: `src/components/data-grid/toolbar/toolbar.types.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/components/data-grid/toolbar/toolbar.types.ts
import type { ComponentType } from 'react'
import type { Table } from '@tanstack/react-table'
import type {
  GridDensity,
  GridFeaturesConfig,
  GridMode,
  GridRow,
} from '@/components/data-grid/types/grid-types'

export type ToolbarCommandType = 'command' | 'menu' | 'search' | 'spacer' | 'separator'
export type ToolbarAlign = 'left' | 'right'

export interface ToolbarCommand {
  id: string
  type: ToolbarCommandType
  /** Default: false — must explicitly set true to render */
  enabled?: boolean
  /** Default: 'left' */
  align?: ToolbarAlign
  label?: string
  /**
   * React component reference OR lucide icon name string.
   * Strings are resolved at render time via resolveLucideIcon().
   */
  icon?: ComponentType<{ className?: string }> | string
  /** Applied to the button/trigger/input element */
  className?: string
  /** Static disabled state */
  disabled?: boolean

  // ── type: 'command' ──────────────────────────────────────────────────────
  handler?: (ctx: ToolbarContext, params?: Record<string, unknown>) => Promise<void>
  /** Static params passed as second argument to handler */
  handlerParams?: Record<string, unknown>

  // ── type: 'menu' ─────────────────────────────────────────────────────────
  /** Flat list of sub-commands — NO nesting within sub-commands (1 level max) */
  commands?: ToolbarCommand[]
  /** Applied to DropdownMenuContent element */
  menuClassName?: string

  // ── type: 'search' ───────────────────────────────────────────────────────
  /**
   * When set: server-side search via ctx.onSearch(queryParamName, value).
   * When omitted: client-side filter via ctx.setGlobalFilter(value).
   */
  apiNodeId?: string
  /** Query param key sent to onSearch. Default: 'q' */
  queryParamName?: string
  /** Debounce delay in ms. Default: 300 */
  debounceMs?: number
  placeholder?: string
  /** Applied to the Input element */
  inputClassName?: string
}

export interface ToolbarContext {
  /** Full TanStack Table instance — all state, sorting, filtering, visibility */
  table: Table<GridRow>
  /** Filtered/visible rows */
  rows: GridRow[]
  /** All rows unfiltered (getCoreRowModel) */
  allRows: GridRow[]
  /** Currently selected rows */
  selectedRows: GridRow[]

  globalFilter: string
  setGlobalFilter: (value: string) => void
  density: GridDensity
  setDensity: (d: GridDensity) => void

  /** True while data is refetching — use to show spinner on refresh button */
  isRefetching: boolean

  /**
   * Execute a DAG ActionDef by its id. No-op when DataGrid is standalone.
   * Maps to onAction(actionId, undefined) — no row context at toolbar level.
   */
  executeApiNode: (actionId: string) => Promise<void>

  /** Trigger a data refetch (maps to onRefresh prop) */
  refetch?: () => void

  /** Lazy-expand a single tree row */
  expandRow?: (row: GridRow) => Promise<void>
  /** Collapse all expanded rows */
  collapseAll?: () => void

  /**
   * Server-side search relay. Called by command-search when apiNodeId is set.
   * paramName = command.queryParamName ?? 'q'
   * ConfiguredTable wires this to update its searchParams state.
   */
  onSearch?: (paramName: string, query: string) => void

  mode?: GridMode
  features?: GridFeaturesConfig
}
```

- [ ] **Step 2: Verify no TypeScript errors**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template"
npx tsc --noEmit --project tsconfig.json 2>&1 | head -20
```

Expected: no errors on the new file (ignore pre-existing errors in src/main.tsx and src/app/).

---

### Task 2: Create icon resolver + tests

**Files:**
- Create: `src/components/data-grid/toolbar/icon-resolver.ts`
- Create: `src/components/data-grid/toolbar/__tests__/icon-resolver.test.ts`

- [ ] **Step 1: Write the failing test**

**Note on `icon-resolver.ts`:** The file is `.ts` (not `.tsx`) but references `React.ComponentType`. Use `import type { ComponentType } from 'react'` instead of `import type React from 'react'` to satisfy TypeScript strict mode without importing the full React namespace.

```typescript
// src/components/data-grid/toolbar/__tests__/icon-resolver.test.ts
import { describe, expect, it } from 'vitest'
import { resolveLucideIcon } from '../icon-resolver'
import { Download, AlertCircle } from 'lucide-react'

describe('resolveLucideIcon', () => {
  it('resolves a known lucide icon name to a component', () => {
    const icon = resolveLucideIcon('Download')
    expect(icon).toBe(Download)
  })

  it('falls back to AlertCircle for unknown icon names', () => {
    const icon = resolveLucideIcon('NonExistentIcon_XYZ')
    expect(icon).toBe(AlertCircle)
  })

  it('falls back to AlertCircle for empty string', () => {
    const icon = resolveLucideIcon('')
    expect(icon).toBe(AlertCircle)
  })

  it('resolves Search icon', () => {
    const { Search } = require('lucide-react')
    const icon = resolveLucideIcon('Search')
    expect(icon).toBe(Search)
  })

  it('resolves RefreshCw icon', () => {
    const { RefreshCw } = require('lucide-react')
    const icon = resolveLucideIcon('RefreshCw')
    expect(icon).toBe(RefreshCw)
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template"
npx vitest run src/components/data-grid/toolbar/__tests__/icon-resolver.test.ts
```

Expected: `Error: Cannot find module '../icon-resolver'`

- [ ] **Step 3: Implement icon-resolver**

```typescript
// src/components/data-grid/toolbar/icon-resolver.ts
import { AlertCircle } from 'lucide-react'
import * as LucideIcons from 'lucide-react'
import type { ComponentType } from 'react'

export type IconComponent = ComponentType<{ className?: string }>

/**
 * Resolves a lucide-react icon name string to its React component.
 * Falls back to AlertCircle for unknown names.
 * Used when icon field on ToolbarCommand is a string (e.g. from DAG config).
 */
export function resolveLucideIcon(name: string): IconComponent {
  if (!name) return AlertCircle as unknown as IconComponent
  const icon = (LucideIcons as Record<string, unknown>)[name]
  if (typeof icon === 'function') return icon as IconComponent
  return AlertCircle as unknown as IconComponent
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/icon-resolver.test.ts
```

Expected: `5 tests passed`

---

## Chunk 2: Defaults & Merge Utility

### Task 3: Create toolbar defaults + tests

**Files:**
- Create: `src/components/data-grid/toolbar/toolbar-defaults.ts`
- Create: `src/components/data-grid/toolbar/__tests__/toolbar-defaults.test.ts`

**Convention:** All test files in this codebase import `describe`, `expect`, `it` explicitly from `'vitest'` (even though `globals: true` is set). Follow this convention in all new test files.

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/data-grid/toolbar/__tests__/toolbar-defaults.test.ts
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SEARCH,
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_DENSITY,
  DEFAULT_EXPAND_ALL,
  DEFAULT_REFRESH,
  DEFAULT_EXPORT,
  DEFAULT_ADD_ROW,
  TOOLBAR_DEFAULTS,
} from '../toolbar-defaults'

describe('toolbar defaults', () => {
  const allDefaults = [
    DEFAULT_SEARCH,
    DEFAULT_COLUMN_VISIBILITY,
    DEFAULT_DENSITY,
    DEFAULT_EXPAND_ALL,
    DEFAULT_REFRESH,
    DEFAULT_EXPORT,
    DEFAULT_ADD_ROW,
  ]

  it('every default has enabled: false', () => {
    for (const cmd of allDefaults) {
      expect(cmd.enabled, `${cmd.id} should be disabled`).toBe(false)
    }
  })

  it('every default has a unique id', () => {
    const ids = allDefaults.map(c => c.id)
    const unique = new Set(ids)
    expect(unique.size).toBe(ids.length)
  })

  it('every default has a valid type', () => {
    const validTypes = ['command', 'menu', 'search', 'spacer', 'separator']
    for (const cmd of allDefaults) {
      expect(validTypes, `${cmd.id} has invalid type`).toContain(cmd.type)
    }
  })

  it('DEFAULT_SEARCH is type search on the left', () => {
    expect(DEFAULT_SEARCH.type).toBe('search')
    expect(DEFAULT_SEARCH.align).toBe('left')
  })

  it('TOOLBAR_DEFAULTS contains all 7 named defaults + 1 spacer', () => {
    expect(TOOLBAR_DEFAULTS).toHaveLength(8)
    const ids = TOOLBAR_DEFAULTS.map(c => c.id)
    expect(ids).toContain('search')
    expect(ids).toContain('spacer')
    expect(ids).toContain('columnVisibility')
    expect(ids).toContain('density')
    expect(ids).toContain('expandAll')
    expect(ids).toContain('refresh')
    expect(ids).toContain('export')
    expect(ids).toContain('addRow')
  })

  it('TOOLBAR_DEFAULTS spacer is enabled: false', () => {
    const spacer = TOOLBAR_DEFAULTS.find(c => c.id === 'spacer')
    expect(spacer?.enabled).toBe(false)
  })

  it('right-side defaults have align: right', () => {
    const rightIds = ['columnVisibility', 'density', 'refresh', 'export', 'addRow']
    for (const id of rightIds) {
      const cmd = TOOLBAR_DEFAULTS.find(c => c.id === id)
      expect(cmd?.align, `${id} should be right`).toBe('right')
    }
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/toolbar-defaults.test.ts
```

Expected: `Error: Cannot find module '../toolbar-defaults'`

- [ ] **Step 3: Implement toolbar-defaults**

```typescript
// src/components/data-grid/toolbar/toolbar-defaults.ts
import type { ToolbarCommand } from './toolbar.types'

export const DEFAULT_SEARCH: ToolbarCommand = {
  id: 'search',
  type: 'search',
  enabled: false,
  align: 'left',
  placeholder: 'Search...',
  debounceMs: 300,
}

export const DEFAULT_COLUMN_VISIBILITY: ToolbarCommand = {
  id: 'columnVisibility',
  type: 'menu',
  enabled: false,
  align: 'right',
  label: 'Columns',
  icon: 'Columns3',
}

export const DEFAULT_DENSITY: ToolbarCommand = {
  id: 'density',
  type: 'menu',
  enabled: false,
  align: 'right',
  icon: 'AlignJustify',
}

export const DEFAULT_EXPAND_ALL: ToolbarCommand = {
  id: 'expandAll',
  type: 'command',
  enabled: false,
  align: 'left',
  icon: 'ChevronsUpDown',
  // label is computed at render time: 'Expand all' / 'Collapse all'
}

export const DEFAULT_REFRESH: ToolbarCommand = {
  id: 'refresh',
  type: 'command',
  enabled: false,
  align: 'right',
  icon: 'RefreshCw',
  // button disables and icon spins while ctx.isRefetching
}

export const DEFAULT_EXPORT: ToolbarCommand = {
  id: 'export',
  type: 'command',
  enabled: false,
  align: 'right',
  label: 'Export',
  icon: 'Download',
}

export const DEFAULT_ADD_ROW: ToolbarCommand = {
  id: 'addRow',
  type: 'command',
  enabled: false,
  align: 'right',
  label: 'Add row',
  icon: 'Plus',
  // handler guards typeof features.addRow === 'object' before accessing .onAddRow
}

/**
 * All built-in defaults in canonical display order.
 * All entries have enabled: false — spread and override to opt in.
 *
 * @example
 * toolbarCommands={[
 *   { ...DEFAULT_SEARCH, enabled: true, placeholder: 'Find...' },
 *   { id: 'spacer', type: 'spacer', enabled: true },
 *   { ...DEFAULT_EXPORT, enabled: true },
 * ]}
 */
export const TOOLBAR_DEFAULTS: ToolbarCommand[] = [
  DEFAULT_SEARCH,
  { id: 'spacer', type: 'spacer', enabled: false },
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_DENSITY,
  DEFAULT_EXPAND_ALL,
  DEFAULT_REFRESH,
  DEFAULT_EXPORT,
  DEFAULT_ADD_ROW,
]
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/toolbar-defaults.test.ts
```

Expected: `9 tests passed`

---

### Task 4: Create merge-toolbar-commands utility + tests

**Files:**
- Create: `src/components/data-grid/toolbar/merge-toolbar-commands.ts`
- Create: `src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts
import { describe, expect, it } from 'vitest'
import { mergeToolbarCommands } from '../merge-toolbar-commands'
import type { ToolbarCommand } from '../toolbar.types'

const cmd = (id: string, label = id): ToolbarCommand => ({
  id,
  type: 'command',
  enabled: true,
  label,
})

describe('mergeToolbarCommands', () => {
  it('returns base unchanged when overrides is undefined', () => {
    const base = [cmd('a'), cmd('b')]
    const result = mergeToolbarCommands(base, undefined)
    expect(result).toEqual(base)
    expect(result).not.toBe(base) // returns a copy
  })

  it('returns base unchanged when overrides is empty', () => {
    const base = [cmd('a'), cmd('b')]
    const result = mergeToolbarCommands(base, [])
    expect(result).toEqual(base)
  })

  it('replaces a base entry entirely when ids match', () => {
    const base = [cmd('a', 'original'), cmd('b')]
    const overrides = [cmd('a', 'replaced')]
    const result = mergeToolbarCommands(base, overrides)
    expect(result).toHaveLength(2)
    expect(result[0].label).toBe('replaced')
    expect(result[1].id).toBe('b')
  })

  it('full replacement — no partial field merge from base', () => {
    const base: ToolbarCommand[] = [{ id: 'a', type: 'command', enabled: true, label: 'base', className: 'base-class' }]
    const overrides: ToolbarCommand[] = [{ id: 'a', type: 'command', enabled: false }]
    const result = mergeToolbarCommands(base, overrides)
    // Override object wins entirely — label and className from base are NOT preserved
    expect(result[0].label).toBeUndefined()
    expect(result[0].className).toBeUndefined()
    expect(result[0].enabled).toBe(false)
  })

  it('full replacement with minimal override — only id and type in override', () => {
    const base: ToolbarCommand[] = [{
      id: 'search', type: 'search', enabled: true, label: 'Search',
      placeholder: 'old...', debounceMs: 500, inputClassName: 'old-class',
    }]
    const overrides: ToolbarCommand[] = [{ id: 'search', type: 'search' }]
    const result = mergeToolbarCommands(base, overrides)
    // All base fields except id/type are gone — the override object is used wholesale
    expect(result[0].enabled).toBeUndefined()
    expect(result[0].label).toBeUndefined()
    expect(result[0].placeholder).toBeUndefined()
    expect(result[0].debounceMs).toBeUndefined()
    expect(result[0].inputClassName).toBeUndefined()
    expect(result[0].id).toBe('search')
    expect(result[0].type).toBe('search')
  })

  it('appends override entries whose id is not in base', () => {
    const base = [cmd('a'), cmd('b')]
    const overrides = [cmd('c'), cmd('d')]
    const result = mergeToolbarCommands(base, overrides)
    expect(result).toHaveLength(4)
    expect(result.map(c => c.id)).toEqual(['a', 'b', 'c', 'd'])
  })

  it('preserves base order for non-overridden entries', () => {
    const base = [cmd('z'), cmd('a'), cmd('m')]
    const result = mergeToolbarCommands(base, [])
    expect(result.map(c => c.id)).toEqual(['z', 'a', 'm'])
  })

  it('handles mixed replace + append in one call', () => {
    const base = [cmd('search'), cmd('export')]
    const overrides = [cmd('search', 'Custom Search'), cmd('my-btn')]
    const result = mergeToolbarCommands(base, overrides)
    expect(result).toHaveLength(3)
    expect(result[0].label).toBe('Custom Search')
    expect(result[1].id).toBe('export')
    expect(result[2].id).toBe('my-btn')
  })

  it('appended overrides maintain their relative order', () => {
    const base = [cmd('a')]
    const overrides = [cmd('z'), cmd('m'), cmd('b')]
    const result = mergeToolbarCommands(base, overrides)
    expect(result.map(c => c.id)).toEqual(['a', 'z', 'm', 'b'])
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts
```

Expected: `Error: Cannot find module '../merge-toolbar-commands'`

- [ ] **Step 3: Implement merge-toolbar-commands**

```typescript
// src/components/data-grid/toolbar/merge-toolbar-commands.ts
import type { ToolbarCommand } from './toolbar.types'

/**
 * Merges override commands into a base command list.
 *
 * Rules:
 * 1. Returns a copy of base in original order.
 * 2. Override with matching id: fully replaces the base entry (no partial merge).
 * 3. Override with new id: appended after all base entries, in override order.
 * 4. undefined or empty overrides: returns base copy unchanged.
 */
export function mergeToolbarCommands(
  base: ToolbarCommand[],
  overrides?: ToolbarCommand[],
): ToolbarCommand[] {
  if (!overrides || overrides.length === 0) return [...base]

  const result = [...base]

  for (const override of overrides) {
    const idx = result.findIndex((c) => c.id === override.id)
    if (idx !== -1) {
      result[idx] = override
    } else {
      result.push(override)
    }
  }

  return result
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/merge-toolbar-commands.test.ts
```

Expected: `8 tests passed`

---

### Task 5: Create barrel index + run all phase 1 tests

**Files:**
- Create: `src/components/data-grid/toolbar/index.ts`

- [ ] **Step 1: Create the barrel**

```typescript
// src/components/data-grid/toolbar/index.ts
// Types
export type { ToolbarCommand, ToolbarContext, ToolbarCommandType, ToolbarAlign } from './toolbar.types'

// Utilities
export { resolveLucideIcon } from './icon-resolver'
export type { IconComponent } from './icon-resolver'
export { mergeToolbarCommands } from './merge-toolbar-commands'

// Defaults
export {
  DEFAULT_SEARCH,
  DEFAULT_COLUMN_VISIBILITY,
  DEFAULT_DENSITY,
  DEFAULT_EXPAND_ALL,
  DEFAULT_REFRESH,
  DEFAULT_EXPORT,
  DEFAULT_ADD_ROW,
  TOOLBAR_DEFAULTS,
} from './toolbar-defaults'
```

- [ ] **Step 2: Run all phase 1 tests**

```bash
npx vitest run src/components/data-grid/toolbar/__tests__/
```

Expected: `14 tests passed` (5 icon-resolver + 9 defaults + 8 merge + 1 from index imports)

Wait — the index file has no tests. Expected: `22 tests passed` across 3 test files.

- [ ] **Step 3: Run full type check**

```bash
npx tsc --noEmit 2>&1 | grep -v "src/main.tsx\|src/app/services" | head -20
```

Expected: no errors in the new toolbar/ files.

- [ ] **Step 4: Commit**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template"
git add src/components/data-grid/toolbar/
git commit -m "feat: toolbar phase 1 — types, icon-resolver, defaults, merge utility"
```
