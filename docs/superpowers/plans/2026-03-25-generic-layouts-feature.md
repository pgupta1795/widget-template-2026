# Generic Layouts Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a config-driven feature registration system where defining a layout config automatically generates routes and sidebar icons.

**Architecture:**
- Feature configs declare domain metadata (icon, label, paths)
- Feature bootstrap exports all configs
- Route generator reads configs and creates list/detail routes
- Sidebar generator dynamically builds nav from feature configs
- Engines (LayoutEngine, ConfiguredTable) enhanced to support parameter passing

**Tech Stack:** React 19, TanStack Router, TanStack Query v5, TypeScript, shadcn/ui

---

## File Structure

### New Files (Create)
```
src/features/layouts/
├── ca/
│   ├── ca-search.config.ts          (copy from xen)
│   ├── ca-layout.config.ts          (copy from xen)
│   ├── ca-form.config.ts            (copy from xen if exists)
│   └── ca-feature.config.ts         (new - metadata)
├── types.ts                          (new - FeatureConfig interface)
├── bootstrap.ts                      (new - export all feature configs)
├── index.ts                          (new - public API)
└── __tests__/
    └── feature-registry.test.ts      (new - tests)

src/routes/
├── ca.tsx                            (new - list route)
└── ca/
    └── $nodeId.tsx                   (new - detail route)
```

### Modified Files
```
src/components/layout/nav-items.ts             (modify - dynamic generation)
src/components/layout-engine/layout-engine.tsx (modify - add params support)
src/components/data-grid/table-engine/        (modify - add onRowClick)
src/components/tab-engine/bootstrap.ts        (modify - bootstrap CA configs)
```

### Files to Delete/Decommission
```
src/routes/xen/ca.$nodeId.tsx         (REMOVE - moved to /ca/$nodeId.tsx)
src/features/xen/configs/ca-*.config.ts (REMOVE - moved to layouts/ca/)
```

---

## Implementation Tasks

### Task 1: Create Feature Config Types

**Files:**
- Create: `src/features/layouts/types.ts`

- [ ] **Step 1: Create FeatureConfig interface**

```typescript
// src/features/layouts/types.ts
import type { JsonPrimitive } from '#/components/data-grid/table-engine/types/dag.types'

/**
 * Feature metadata for config-driven routing
 * Each feature declares its route, icon, and content configs
 */
export interface FeatureConfig {
  /** Domain name: used for route path (/ca, /drawing, etc) */
  domain: string

  /** Lucide icon name: 'LayoutGrid', 'PencilSquare', etc. */
  icon: string

  /** Display label: 'CA View', 'Drawing', etc. */
  label: string

  /** Table config for list view (renders at /:domain) */
  listConfig: unknown

  /** Layout config for detail view (renders at /:domain/$nodeId) */
  detailConfig: unknown

  /** Optional feature flags */
  enableSearch?: boolean
  enableDragDrop?: boolean
}

/**
 * Navigation item generated from FeatureConfig
 */
export interface NavItem {
  path: string
  label: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}
```

- [ ] **Step 2: Commit**

```bash
git add src/features/layouts/types.ts
git commit -m "feat: add FeatureConfig and NavItem types for layouts feature"
```

---

### Task 2: Create CA Domain Feature Config

**Files:**
- Create: `src/features/layouts/ca/ca-feature.config.ts`
- Create: `src/features/layouts/ca/ca-search.config.ts` (copy from xen)
- Create: `src/features/layouts/ca/ca-layout.config.ts` (copy from xen)
- Create: `src/features/layouts/ca/ca-form.config.ts` (copy from xen if exists)

- [ ] **Step 1: Copy CA configs from xen to layouts/ca/**

```bash
mkdir -p src/features/layouts/ca
cp src/features/xen/configs/ca-search.config.ts src/features/layouts/ca/
cp src/features/xen/configs/ca-layout.config.ts src/features/layouts/ca/
cp src/features/xen/configs/ca-form.config.ts src/features/layouts/ca/ 2>/dev/null || true
```

- [ ] **Step 2: Create CA feature config**

```typescript
// src/features/layouts/ca/ca-feature.config.ts
import type { FeatureConfig } from '../types'
import { caSearchConfig } from './ca-search.config'
import { caLayoutConfig } from './ca-layout.config'

/**
 * CA (Change Actions) feature configuration
 * Declares route path, icon, and content configs for list and detail views
 */
export const caFeatureConfig: FeatureConfig = {
  domain: 'ca',
  icon: 'LayoutGrid',
  label: 'CA View',

  // Table config for list view (/ca)
  listConfig: caSearchConfig,

  // Layout config for detail view (/ca/$nodeId)
  detailConfig: caLayoutConfig,

  // Feature flags
  enableSearch: true,
  enableDragDrop: true,
}
```

- [ ] **Step 3: Verify configs are valid TypeScript and imports resolve**

```bash
npx tsc --noEmit src/features/layouts/ca/ca-feature.config.ts
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/features/layouts/ca/
git commit -m "feat: create CA domain configs in layouts feature"
```

---

### Task 3: Create Feature Bootstrap

**Files:**
- Create: `src/features/layouts/bootstrap.ts`
- Create: `src/features/layouts/index.ts`

- [ ] **Step 1: Create bootstrap file**

```typescript
// src/features/layouts/bootstrap.ts
/**
 * Central export point for all layout-driven feature configs
 * Add new domains here as they're created
 */

export { caFeatureConfig } from './ca/ca-feature.config'

// Future domains:
// export { drawingFeatureConfig } from './drawing/drawing-feature.config'
// export { reportFeatureConfig } from './report/report-feature.config'
```

- [ ] **Step 2: Create public API barrel**

```typescript
// src/features/layouts/index.ts
export * from './bootstrap'
export type { FeatureConfig, NavItem } from './types'
```

- [ ] **Step 3: Verify barrel exports work**

```bash
npx tsc --noEmit -p tsconfig.json
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/features/layouts/bootstrap.ts src/features/layouts/index.ts
git commit -m "feat: create layouts feature bootstrap and public API"
```

---

### Task 4: Register CA Configs in Tab-Config Registry

**Files:**
- Modify: `src/components/tab-engine/bootstrap.ts`

- [ ] **Step 1: Read current bootstrap file**

Read `src/components/tab-engine/bootstrap.ts` to understand registration pattern.

- [ ] **Step 2: Add CA config registrations**

After existing xen config registrations, add:

```typescript
// In src/components/tab-engine/bootstrap.ts, after xen registrations:

// CA Domain Configs (from layouts feature)
import { caFeatureConfig } from '@/features/layouts'

registerConfig(
  './ca-search.config.ts',
  caFeatureConfig.listConfig
)
registerConfig(
  './ca-layout.config.ts',
  caFeatureConfig.detailConfig
)
if (caFeatureConfig.detailConfig && 'children' in caFeatureConfig.detailConfig) {
  // Register any nested configs if ca-layout.config has them
}
```

- [ ] **Step 3: Verify registrations**

```bash
npx tsc --noEmit src/components/tab-engine/bootstrap.ts
```

Expected: No errors

- [ ] **Step 4: Commit**

```bash
git add src/components/tab-engine/bootstrap.ts
git commit -m "feat: register CA domain configs in tab-engine bootstrap"
```

---

### Task 5: Enhance LayoutEngine to Support Parameters

**Files:**
- Modify: `src/components/layout-engine/layout-engine.tsx`

- [ ] **Step 1: Read current LayoutEngine implementation**

```bash
cat src/components/layout-engine/layout-engine.tsx | head -50
```

- [ ] **Step 2: Add params prop to LayoutEngineProps**

```typescript
// In LayoutEngine.tsx, update interface:

import type { JsonPrimitive } from '#/components/data-grid/table-engine/types/dag.types'

export interface LayoutEngineProps {
  config: LayoutConfig
  params?: Record<string, JsonPrimitive>  // NEW: dynamic route params like nodeId
  className?: string
}
```

- [ ] **Step 3: Pass params to section renderers**

In the LayoutEngine component body, when rendering sections, pass params:

```typescript
export function LayoutEngine({
  config,
  params = {},  // NEW
  className,
}: LayoutEngineProps) {
  return (
    <div className={className}>
      {config.sections?.map((section) => (
        <SectionRenderer
          key={section.id}
          config={section}
          params={params}  // Pass down params
          // ... other props
        />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit src/components/layout-engine/layout-engine.tsx
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/layout-engine/layout-engine.tsx
git commit -m "feat: add params support to LayoutEngine for dynamic routing"
```

---

### Task 6: Enhance ConfiguredTable with onRowClick Callback

**Files:**
- Modify: `src/components/data-grid/table-engine/configured-table.tsx` (or similar)

- [ ] **Step 1: Find and read ConfiguredTable**

```bash
find src -name "*configured*table*" -type f
```

- [ ] **Step 2: Add onRowClick to props interface**

```typescript
// In ConfiguredTable props:
export interface ConfiguredTableProps {
  config: DAGTableConfig
  params?: Record<string, JsonPrimitive>
  className?: string
  onRowClick?: (row: unknown) => void  // NEW: callback when row is clicked
}
```

- [ ] **Step 3: Wire onRowClick to row click handler**

In the table body rendering, add onClick:

```typescript
<tbody>
  {rows.map((row) => (
    <tr
      key={row.id}
      onClick={() => onRowClick?.(row)}  // NEW: call callback
      className="cursor-pointer hover:bg-accent"  // visual feedback
    >
      {/* row cells */}
    </tr>
  ))}
</tbody>
```

- [ ] **Step 4: Verify TypeScript and test**

```bash
npm run check
```

Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/components/data-grid/table-engine/
git commit -m "feat: add onRowClick callback to ConfiguredTable"
```

---

### Task 7: Create CA List Route (/ca)

**Files:**
- Create: `src/routes/ca.tsx`

- [ ] **Step 1: Create route file**

```typescript
// src/routes/ca.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { ConfiguredTable } from '#/components/data-grid/table-engine'
import { getConfig } from '#/components/tab-engine/core/tab-config-registry'
import { caFeatureConfig } from '#/features/layouts'
import { use3dxDropZone } from '#/hooks/use-3dx-drop-zone'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/ca')({
  component: CAListView,
})

function CAListView() {
  const navigate = useNavigate()
  const { ref: dropRef, isDragOver } = use3dxDropZone<HTMLDivElement>({
    onDrop: (items) => {
      const item = items[0]
      if (item?.objectId) {
        void navigate({ to: '/ca/$nodeId', params: { nodeId: item.objectId } })
      }
    },
  })

  const listConfig = getConfig('./ca-search.config.ts')
  if (!listConfig) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        CA Search config not registered
      </div>
    )
  }

  return (
    <div
      ref={dropRef}
      className={cn(
        'h-full w-full transition-all',
        isDragOver && 'ring-2 ring-primary ring-inset',
      )}
    >
      <ConfiguredTable
        config={listConfig as any}
        className="h-full"
        onRowClick={(row: any) => {
          const nodeId = row.nodeId || row.id
          if (nodeId) {
            void navigate({ to: '/ca/$nodeId', params: { nodeId } })
          }
        }}
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit src/routes/ca.tsx
```

Expected: No errors (may have unknown type warnings - that's ok)

- [ ] **Step 3: Test route compiles in build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/routes/ca.tsx
git commit -m "feat: create CA list route (/ca) with table and drop-zone"
```

---

### Task 8: Create CA Detail Route (/ca/$nodeId)

**Files:**
- Create: `src/routes/ca/$nodeId.tsx`

- [ ] **Step 1: Create detail route file**

```typescript
// src/routes/ca/$nodeId.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { LayoutEngine } from '#/components/layout-engine'
import { getConfig } from '#/components/tab-engine/core/tab-config-registry'
import { caFeatureConfig } from '#/features/layouts'
import { use3dxDropZone } from '#/hooks/use-3dx-drop-zone'
import { cn } from '#/lib/utils'

export const Route = createFileRoute('/ca/$nodeId')({
  component: CADetailView,
})

function CADetailView() {
  const { nodeId } = Route.useParams()
  const navigate = useNavigate()

  const { ref: dropRef, isDragOver } = use3dxDropZone<HTMLDivElement>({
    onDrop: (items) => {
      const item = items[0]
      if (item?.objectId) {
        void navigate({ to: '/ca/$nodeId', params: { nodeId: item.objectId } })
      }
    },
  })

  const detailConfig = getConfig('./ca-layout.config.ts')
  if (!detailConfig) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        CA Layout config not registered
      </div>
    )
  }

  return (
    <div
      ref={dropRef}
      className={cn(
        'h-full w-full transition-all',
        isDragOver && 'ring-2 ring-primary ring-inset',
      )}
    >
      <LayoutEngine
        config={detailConfig as any}
        params={{ nodeId }}  // Pass nodeId to layout engine
      />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript**

```bash
npx tsc --noEmit src/routes/ca/$nodeId.tsx
```

Expected: No errors

- [ ] **Step 3: Test build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 4: Commit**

```bash
git add src/routes/ca/$nodeId.tsx
git commit -m "feat: create CA detail route (/ca/$\{nodeId\}) with LayoutEngine"
```

---

### Task 9: Make Sidebar Dynamic from Feature Configs

**Files:**
- Modify: `src/components/layout/nav-items.ts`

- [ ] **Step 1: Read current nav-items.ts**

```bash
cat src/components/layout/nav-items.ts
```

- [ ] **Step 2: Update to generate nav from feature configs**

```typescript
// src/components/layout/nav-items.ts
import type { LucideIcon } from 'lucide-react'
import { Globe, Zap } from 'lucide-react'
import { resolveLucideIcon } from '#/components/data-grid/toolbar/icon-resolver'
import type { FeatureConfig } from '#/features/layouts'
import * as layoutFeatures from '#/features/layouts'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
}

/**
 * Extract all FeatureConfig objects from layouts bootstrap
 */
function getFeatureConfigs(): FeatureConfig[] {
  return Object.values(layoutFeatures).filter(
    (val): val is FeatureConfig =>
      typeof val === 'object' &&
      val !== null &&
      'domain' in val &&
      'icon' in val &&
      'label' in val &&
      'listConfig' in val &&
      'detailConfig' in val,
  )
}

/**
 * Generate nav items from feature configs
 */
function generateNavFromFeatures(): NavItem[] {
  return getFeatureConfigs().map((config) => ({
    path: `/${config.domain}`,
    label: config.label,
    icon: resolveLucideIcon(config.icon),
  }))
}

/**
 * Static + dynamic navigation items
 * Static items: 3DX API Explorer (/)
 * Dynamic items: All layout-driven features (CA, Drawing, etc.)
 */
export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: '3DX API Explorer', icon: Globe },
  ...generateNavFromFeatures(),
  // Results in:
  // { path: '/ca', label: 'CA View', icon: LayoutGrid }
  // { path: '/drawing', label: 'Drawing', icon: PencilSquare } (future)
]
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit src/components/layout/nav-items.ts
```

Expected: No errors

- [ ] **Step 4: Test build and check nav renders**

```bash
npm run build
npm run dev:widget
```

Open browser, check sidebar shows CA View icon.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/nav-items.ts
git commit -m "feat: make sidebar navigation dynamic from feature configs"
```

---

### Task 10: Remove Old CA Route from XEN

**Files:**
- Delete: `src/routes/xen/ca.$nodeId.tsx`
- Modify: `src/features/xen/components/xen.tsx` (remove CA view link)

- [ ] **Step 1: Remove CA detail route file**

```bash
rm src/routes/xen/ca.$nodeId.tsx
```

- [ ] **Step 2: Remove CA view link from Xen component**

In `src/features/xen/components/xen.tsx`, find and remove:

```typescript
{/* smoke-test link for CA detail view */}
<Link
  to="/xen/ca/$nodeId"
  params={{ nodeId: "test-id" }}
  className="ml-auto mb-0 mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline"
>
  CA view ↗
</Link>
```

- [ ] **Step 3: Verify Xen component still compiles**

```bash
npx tsc --noEmit src/features/xen/components/xen.tsx
```

Expected: No errors

- [ ] **Step 4: Test build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/routes/xen/ src/features/xen/
git commit -m "feat: remove CA detail route from XEN, moved to independent CA feature"
```

---

### Task 11: Decommission CA Configs from XEN Feature

**Files:**
- Delete: `src/features/xen/configs/ca-*.config.ts`

- [ ] **Step 1: Remove CA configs from xen**

```bash
rm src/features/xen/configs/ca-search.config.ts
rm src/features/xen/configs/ca-layout.config.ts
rm src/features/xen/configs/ca-form.config.ts 2>/dev/null || true
rm src/features/xen/configs/ca-tabs.config.ts 2>/dev/null || true
```

- [ ] **Step 2: Update xen bootstrap if it imports CA configs**

Read `src/features/xen/bootstrap.ts` and remove any CA config registrations:

```bash
cat src/features/xen/bootstrap.ts | grep -i "ca-"
```

If found, remove the imports and registrations.

- [ ] **Step 3: Verify build**

```bash
npm run build
```

Expected: Build succeeds, no "module not found" errors for ca configs in xen

- [ ] **Step 4: Commit**

```bash
git add src/features/xen/
git commit -m "feat: remove CA configs from XEN, now in layouts/ca"
```

---

### Task 12: Update Tab-Engine Bootstrap to Load CA from Layouts

**Files:**
- Modify: `src/components/tab-engine/bootstrap.ts`

- [ ] **Step 1: Verify CA configs are registered correctly**

Check that in Task 4 we registered CA configs. If not yet done, do it now:

```typescript
// In src/components/tab-engine/bootstrap.ts:

import { caFeatureConfig } from '@/features/layouts'

registerConfig('./ca-search.config.ts', caFeatureConfig.listConfig)
registerConfig('./ca-layout.config.ts', caFeatureConfig.detailConfig)
```

- [ ] **Step 2: Remove any old CA registrations that pointed to xen**

Search for old paths like `src/features/xen/configs/ca-...`:

```bash
grep -n "xen/configs/ca-" src/components/tab-engine/bootstrap.ts || echo "No old registrations found"
```

If found, remove them.

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit src/components/tab-engine/bootstrap.ts
```

Expected: No errors

- [ ] **Step 4: Test build**

```bash
npm run build
```

Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/components/tab-engine/bootstrap.ts
git commit -m "feat: ensure CA configs registered from layouts feature, remove xen references"
```

---

### Task 13: Test Complete Flow

**Files:**
- Test: Manual testing in browser

- [ ] **Step 1: Build and run dev server**

```bash
npm run build
npm run dev:widget
```

- [ ] **Step 2: Check sidebar**

- Verify sidebar has both "3DX API Explorer" (Globe) and "CA View" (LayoutGrid) icons
- Verify icons appear in correct order

- [ ] **Step 3: Navigate to CA View**

- Click CA View icon in sidebar
- Verify `/ca` route loads
- Verify CA search table displays with data (or empty state if no data)

- [ ] **Step 4: Click table row**

- In CA table, click any row
- Verify navigation to `/ca/$nodeId` occurs (check URL)
- Verify CA detail view (LayoutEngine) renders

- [ ] **Step 5: Test drag-drop**

- In CA list or detail view, try dragging an object
- Verify drop handling works (either updates view or shows drop state)

- [ ] **Step 6: Navigate back**

- Click CA View icon again
- Verify return to list view

- [ ] **Step 7: Verify no regressions**

- Check XEN feature still works (click Zap icon)
- Verify XEN tabs (Search, Expand, Change Action) still functional
- Verify no console errors

Expected: All tests pass, no errors in console.

- [ ] **Step 8: Document results**

Create a test result note:
```
## Manual Test Results (Task 13)

- ✅ Sidebar shows CA View icon
- ✅ /ca route loads CA search table
- ✅ Table row click navigates to /ca/$nodeId
- ✅ /ca/$nodeId loads CA detail view with LayoutEngine
- ✅ Drop-zone works in both list and detail views
- ✅ Navigation back to list view works
- ✅ XEN feature unaffected
- ✅ No console errors
```

---

### Task 14: Run Full Test Suite

**Files:**
- Test: All existing tests

- [ ] **Step 1: Run type check**

```bash
npm run check
```

Expected: No TypeScript errors

- [ ] **Step 2: Run tests**

```bash
npm run test
```

Expected: All tests pass (or only pre-existing failures)

- [ ] **Step 3: Run linter**

```bash
npm run lint
```

Expected: No linting errors in new files

- [ ] **Step 4: Final build**

```bash
npm run build
```

Expected: Build succeeds, no warnings about missing modules

- [ ] **Step 5: Commit any fixes**

If any issues found, fix and commit:

```bash
git add .
git commit -m "fix: resolve test/lint issues from layouts feature implementation"
```

---

### Task 15: Verify CA Configs Are Properly Decoupled

**Files:**
- Verify: `src/features/layouts/` folder is independent

- [ ] **Step 1: Check no xen imports in layouts**

```bash
grep -r "xen" src/features/layouts/ || echo "✓ No xen imports"
```

Expected: No xen imports found

- [ ] **Step 2: Check no layouts imports in xen**

```bash
grep -r "layouts" src/features/xen/ || echo "✓ No layouts imports"
```

Expected: No layouts imports in xen (they're now independent)

- [ ] **Step 3: Verify feature config is the single source of truth**

Check that all references to CA configs go through `caFeatureConfig`:

```bash
grep -r "caSearchConfig" src/ | grep -v "layouts/ca/" | grep -v "node_modules" || echo "✓ All references use feature config"
```

Expected: No direct imports of caSearchConfig outside layouts/ca/

---

### Task 16: Add Drawing Domain (Future-Proof Test)

**Files:**
- Create: `src/features/layouts/drawing/drawing-feature.config.ts` (optional)

This task verifies the system is scalable. You don't need to implement full Drawing, just prove the pattern works.

- [ ] **Step 1: Create minimal drawing feature config**

```typescript
// src/features/layouts/drawing/drawing-feature.config.ts
import type { FeatureConfig } from '../types'

// Placeholder configs for proof-of-concept
const drawingSearchConfig = {
  type: 'table',
  columns: [{ id: 'name', header: 'Drawing Name' }],
  data: [],
}

const drawingLayoutConfig = {
  type: 'layout',
  sections: [],
}

export const drawingFeatureConfig: FeatureConfig = {
  domain: 'drawing',
  icon: 'PencilSquare',
  label: 'Drawing',
  listConfig: drawingSearchConfig,
  detailConfig: drawingLayoutConfig,
}
```

- [ ] **Step 2: Export from bootstrap**

```typescript
// In src/features/layouts/bootstrap.ts, add:
export { drawingFeatureConfig } from './drawing/drawing-feature.config'
```

- [ ] **Step 3: Verify sidebar updates automatically**

```bash
npm run build
npm run dev:widget
```

Check sidebar now shows both CA View and Drawing icons without any route files or nav-items changes.

Expected: Sidebar automatically includes Drawing icon. This proves the system is scalable.

- [ ] **Step 4: Verify drawing icon is clickable**

Click Drawing icon, verify 404 or placeholder route (we haven't created routes yet).

This is expected and proves: routes would be created the same way as CA (Tasks 7-8).

- [ ] **Step 5: Remove drawing (cleanup)**

```bash
rm -rf src/features/layouts/drawing/
```

Edit bootstrap.ts to remove drawing export.

```bash
git add src/features/layouts/
git commit -m "test: verify config-driven system is scalable, remove drawing poc"
```

---

## Final Verification Checklist

- [ ] All TypeScript compiles: `npm run check`
- [ ] All tests pass: `npm run test`
- [ ] No linting errors: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] CA View is accessible from sidebar
- [ ] /ca route shows table
- [ ] /ca/$nodeId shows detail view
- [ ] Drop-zone works in both views
- [ ] XEN feature still works
- [ ] No console errors in browser
- [ ] All configs decoupled from xen
- [ ] Feature config is single source of truth
- [ ] System scalability verified (Drawing poc)

---

## Known Limitations / Open Items

1. **Route file generation:** Routes created manually in Tasks 7-8. Could be automated further in future.
2. **SectionRenderer params:** SectionRenderer needs to propagate params to all child renderers (verify in Task 5).
3. **Config registration:** Currently manual in bootstrap. Could use glob + auto-discovery in future.
4. **Tab engine within layouts:** If CA detail has tabs, params must flow tab → renderer.

---

**Save location:** `docs/superpowers/plans/2026-03-25-generic-layouts-feature.md`
**Status:** Ready for execution
**Total tasks:** 16 tasks, ~40-60 minutes estimated work
