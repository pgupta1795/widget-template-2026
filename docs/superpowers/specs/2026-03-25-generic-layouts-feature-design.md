# Design Spec: Generic Layouts Feature with Config-Driven Routing

**Date:** 2026-03-25
**Status:** Draft
**Author:** Claude Code Brainstorming
**Scope:** Refactor CA View from embedded xen feature to generic config-driven system

---

## 1. Problem Statement

### Current Issues

1. **Manual Feature Creation:** Adding a new top-level feature requires:
   - Creating feature folder structure
   - Writing route files
   - Manually adding sidebar navigation
   - Writing bootstrap/registration code

2. **CA View Architecture:** Currently:
   - Embedded in `src/features/xen/`
   - Accessed via link to separate route `/xen/ca/$nodeId`
   - Not a proper tab in the Xen interface
   - Tightly coupled to Xen structure

3. **No Generic Pattern:** Each feature follows a different pattern
   - Inconsistent routing
   - Inconsistent sidebar registration
   - Hard to maintain and extend

### Desired Outcome

- **Single config file** declares a domain (CA, Drawing, etc.)
- **Auto-generated routes** (`/ca`, `/ca/$nodeId`, `/drawing`, `/drawing/$nodeId`)
- **Auto-registered sidebar** icons with proper styling
- **Decoupled architecture** where domains are completely independent
- **Scalable:** Adding new domain = add one folder with configs

---

## 2. Architecture Overview

### 2.1 High-Level Flow

```
Feature Config File
    ↓
    (domain: 'ca', icon: 'LayoutGrid', label: 'CA View')
    (listConfig: caSearchConfig, detailConfig: caLayoutConfig)
    ↓
Auto-Registration System
    ├─ Route Generator → creates /ca and /ca/$nodeId routes
    ├─ Sidebar Generator → adds icon to sidebar nav
    └─ Config Registry → registers all child configs
    ↓
User Experience
    └─ Click sidebar icon → navigate to /ca (list)
       Click table row → navigate to /ca/$nodeId (detail)
```

### 2.2 System Components

#### **1. Feature Config Interface** (type-safe config declaration)
```typescript
interface FeatureConfig {
  domain: string              // 'ca', 'drawing', etc. → used for route path
  icon: string               // Lucide icon name: 'LayoutGrid', 'Zap', etc.
  label: string              // Display label: 'CA View', 'Drawing', etc.
  listConfig: unknown        // ConfiguredTable config (renders at /:domain)
  detailConfig: unknown      // LayoutEngine config (renders at /:domain/$nodeId)
  enableSearch?: boolean     // Optional feature flags
  enableDragDrop?: boolean
}
```

#### **2. Feature Registry** (discover and store configs)
- Central registry that imports all domain feature configs
- Exported from `src/features/layouts/bootstrap.ts`
- Used by route generator and sidebar generator

#### **3. Route Generator** (auto-create routes)
- Reads feature configs
- Creates routes dynamically at app startup
- Generates list route (`:domain`) and detail route (`:domain/$nodeId`)
- Passes `params: { nodeId }` to detail view

#### **4. Sidebar Generator** (auto-build navigation)
- Reads feature configs
- Dynamically builds `NAV_ITEMS` array
- Each feature config becomes a sidebar icon
- Resolves Lucide icon by name

#### **5. Engines Enhanced** (support dynamic params)
- **LayoutEngine:** Accepts and passes `params` to child configs
- **ConfiguredTable:** Supports `onNavigate(nodeId)` callback for row clicks

---

## 3. File Structure

### 3.1 Generic Layouts Feature

```
src/features/layouts/
│
├── ca/                                    # CA domain
│   ├── ca-search.config.ts               # Table config for /ca
│   ├── ca-layout.config.ts               # Layout config for /ca/$nodeId (reuse from xen)
│   ├── ca-form.config.ts                 # Form config for CA detail form (reuse from xen)
│   └── ca-feature.config.ts              # Feature metadata + registration
│
├── drawing/                               # Drawing domain (future)
│   ├── drawing-search.config.ts
│   ├── drawing-layout.config.ts
│   └── drawing-feature.config.ts
│
├── types.ts                               # Shared types (FeatureConfig interface)
├── bootstrap.ts                           # Export all feature configs
├── index.ts                               # Public API barrel
├── hooks/
│   └── use-feature-routes.ts             # Hook to access registered features (optional)
└── utils/
    ├── feature-registry.ts               # Registry implementation
    └── route-generator.ts                # Route generation logic
```

### 3.2 Routes (Auto-Generated)

Routes are generated at app startup by reading feature configs:

```
src/routes/
├── __root.tsx                            # Unchanged
├── index.tsx                             # Unchanged (3DX API Explorer)
├── ca.tsx                                # Auto-generated from caFeatureConfig
│   └── $nodeId.tsx                       # Auto-generated detail route
├── drawing.tsx                           # Auto-generated (future)
│   └── $nodeId.tsx
└── (more domains as needed)
```

**Note:** Routes are NOT manually created. They're generated from feature configs using TanStack Router's `createRootRoute()` and route hooks.

### 3.3 Navigation

```
src/components/layout/
├── nav-items.ts                          # REVISED: Dynamically generated from feature configs
└── (unchanged: app-sidebar.tsx, app-shell.tsx)
```

---

## 4. Implementation Details

### 4.1 Feature Config Example: CA Domain

```typescript
// src/features/layouts/ca/ca-feature.config.ts
import type { FeatureConfig } from '../types'
import { caSearchConfig } from './ca-search.config'
import { caLayoutConfig } from './ca-layout.config'

export const caFeatureConfig: FeatureConfig = {
  domain: 'ca',
  icon: 'LayoutGrid',
  label: 'CA View',

  listConfig: caSearchConfig,    // Renders at /ca
  detailConfig: caLayoutConfig,  // Renders at /ca/$nodeId

  enableSearch: true,
  enableDragDrop: true,
}
```

### 4.2 Bootstrap: Centralized Import

```typescript
// src/features/layouts/bootstrap.ts
export { caFeatureConfig } from './ca/ca-feature.config'
export { drawingFeatureConfig } from './drawing/drawing-feature.config'
// Add more domains as they're created

// src/features/layouts/index.ts
export * from './bootstrap'
export type { FeatureConfig } from './types'
```

### 4.3 Route Generation

Routes generated at app startup by reading feature configs:

```typescript
// src/routes/__root.tsx or a bootstrap file
import * as layoutFeatures from '@/features/layouts'

const FEATURE_CONFIGS = Object.values(layoutFeatures).filter(
  (val) => typeof val === 'object' && 'domain' in val
) as FeatureConfig[]

// Generate routes for each feature
for (const config of FEATURE_CONFIGS) {
  // Create route: /:domain
  // Create route: /:domain/$nodeId
}
```

**Alternative:** Use TanStack Router's dynamic route system or a route bootstrap file that reads configs.

### 4.4 Sidebar Generation (Dynamic Nav)

```typescript
// src/components/layout/nav-items.ts
import * as layoutFeatures from '@/features/layouts'
import { resolveLucideIcon } from '@/components/data-grid/toolbar/icon-resolver'

const FEATURE_CONFIGS = Object.values(layoutFeatures).filter(
  (val) => typeof val === 'object' && 'domain' in val
) as FeatureConfig[]

const GENERATED_NAV = FEATURE_CONFIGS.map((config) => ({
  path: `/${config.domain}`,
  label: config.label,
  icon: resolveLucideIcon(config.icon),
}))

export const NAV_ITEMS: NavItem[] = [
  { path: '/', label: '3DX API Explorer', icon: Globe },
  ...GENERATED_NAV,
  // Results in:
  // { path: '/ca', label: 'CA View', icon: LayoutGrid }
  // { path: '/drawing', label: 'Drawing', icon: ..., (future) }
]
```

### 4.5 Engine Enhancements

#### **LayoutEngine Enhancement**

```typescript
// src/components/layout-engine/layout-engine.tsx (revised)
interface LayoutEngineProps {
  config: LayoutConfig
  params?: Record<string, JsonPrimitive>  // NEW: support dynamic params
}

export function LayoutEngine({ config, params = {} }: LayoutEngineProps) {
  // Pass params to all child configs/components
  // Example: params = { nodeId: '123' }
  return (
    <div>
      {config.sections.map((section) => (
        <SectionRenderer
          key={section.id}
          config={section}
          params={params}  // Propagate params
        />
      ))}
    </div>
  )
}
```

#### **ConfiguredTable Enhancement** (optional, for drill-down)

```typescript
interface ConfiguredTableProps {
  config: DAGTableConfig
  params?: Record<string, JsonPrimitive>
  onRowClick?: (rowData: unknown, nodeId?: string) => void  // NEW
}

export function ConfiguredTable({
  config,
  params,
  onRowClick
}: ConfiguredTableProps) {
  const navigate = useNavigate()

  return (
    <BaseTable
      // ... existing props
      onRowClick={(row) => {
        if (onRowClick) onRowClick(row, row.nodeId)
        // Optionally auto-navigate:
        // navigate({ to: `/ca/$nodeId`, params: { nodeId: row.nodeId } })
      }}
    />
  )
}
```

### 4.6 Route Handler: List View

```typescript
// src/routes/ca.tsx (auto-generated structure)
import { createFileRoute } from '@tanstack/react-router'
import { caFeatureConfig } from '@/features/layouts'
import { ConfiguredTable } from '@/components/data-grid/table-engine'
import { getConfig } from '@/components/tab-engine/core/tab-config-registry'

export const Route = createFileRoute('/ca')({
  component: CAListView,
})

function CAListView() {
  const navigate = useNavigate()
  const config = getConfig(caFeatureConfig.listConfig)

  return (
    <ConfiguredTable
      config={config}
      onRowClick={(row) => {
        navigate({
          to: '/ca/$nodeId',
          params: { nodeId: row.nodeId },
        })
      }}
    />
  )
}
```

### 4.7 Route Handler: Detail View

```typescript
// src/routes/ca/$nodeId.tsx (auto-generated structure)
import { createFileRoute } from '@tanstack/react-router'
import { caFeatureConfig } from '@/features/layouts'
import { LayoutEngine } from '@/components/layout-engine'

export const Route = createFileRoute('/ca/$nodeId')({
  component: CADetailView,
})

function CADetailView() {
  const { nodeId } = Route.useParams()
  const config = getConfig(caFeatureConfig.detailConfig)

  return (
    <LayoutEngine
      config={config}
      params={{ nodeId }}  // Pass nodeId to layout engine
    />
  )
}
```

---

## 5. Data Flow Example: CA Domain

### 5.1 List View (`/ca`)

1. User clicks sidebar icon (LayoutGrid) labeled "CA View"
2. Navigate to `/ca`
3. Route handler renders `ConfiguredTable(caSearchConfig)`
4. Table displays CA records

### 5.2 Detail View (`/ca/$nodeId`)

1. User clicks a row in the table
2. Row click handler: `navigate({ to: '/ca/$nodeId', params: { nodeId: row.nodeId } })`
3. Route handler renders `LayoutEngine(caLayoutConfig, params: { nodeId })`
4. LayoutEngine passes `nodeId` to all child components
5. Child components (form, display, etc.) use `nodeId` to load/filter data

---

## 6. Adding a New Domain (Drawing)

To add a new domain, follow this pattern:

1. **Create domain folder:**
   ```
   src/features/layouts/drawing/
   ```

2. **Create configs:**
   ```typescript
   // drawing-search.config.ts
   export const drawingSearchConfig = { /* table config */ }

   // drawing-layout.config.ts
   export const drawingLayoutConfig = { /* layout config */ }

   // drawing-feature.config.ts
   export const drawingFeatureConfig: FeatureConfig = {
     domain: 'drawing',
     icon: 'PencilSquare',
     label: 'Drawing',
     listConfig: drawingSearchConfig,
     detailConfig: drawingLayoutConfig,
   }
   ```

3. **Export from bootstrap:**
   ```typescript
   // src/features/layouts/bootstrap.ts
   export { drawingFeatureConfig } from './drawing/drawing-feature.config'
   ```

4. **Done!** Routes auto-generated, sidebar auto-updated.

---

## 7. Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Single `layouts` feature** | All layout-driven domains live in one place, easier to discover and maintain. |
| **Per-domain subfolder** | Keeps each domain's configs together, easier to navigate. |
| **Feature config metadata** | Domain, icon, label declared once per domain, prevents duplication. |
| **Dynamic route generation** | No manual route files per domain, scales automatically. |
| **Dynamic sidebar** | Sidebar built from configs, always in sync. |
| **Param propagation** | `$nodeId` flows through layout engine to child components. |
| **Bootstrap per feature** | Explicit control over what's exported, easier to debug. |

---

## 8. Benefits

✅ **Scalable:** Add new domain in 5 minutes (one folder + configs)
✅ **Decoupled:** Domains are independent, no cross-domain dependencies
✅ **Type-safe:** FeatureConfig interface ensures consistency
✅ **Maintainable:** All layout domains in one place
✅ **Discoverable:** Single bootstrap file lists all features
✅ **Flexible:** Easy to add feature flags, metadata per domain
✅ **Professional:** Consistent UI/UX across all domains (shared engines)

---

## 9. Implementation Order

1. **Phase 1:** Create feature config interface + types
2. **Phase 2:** Implement feature registry + bootstrap
3. **Phase 3:** Create CA domain configs (move from xen)
4. **Phase 4:** Implement route generator + dynamic routing
5. **Phase 5:** Implement sidebar generator + dynamic nav
6. **Phase 6:** Enhance engines (LayoutEngine + ConfiguredTable)
7. **Phase 7:** Test with CA domain, verify parameter passing
8. **Phase 8:** Create Drawing domain (optional, proof of concept)

---

## 10. Acceptance Criteria

- [ ] `src/features/layouts/` folder created with CA domain
- [ ] CA configs moved from `xen` to `layouts/ca/`
- [ ] Feature configs declare metadata (domain, icon, label)
- [ ] Routes auto-generated: `/ca` and `/ca/$nodeId`
- [ ] Sidebar dynamically built from feature configs
- [ ] `$nodeId` parameter passed through layout engine
- [ ] Table row click navigates to detail view
- [ ] LayoutEngine renders detail view using `ca-layout.config.ts`
- [ ] All tests pass, no regressions
- [ ] Able to add "drawing" domain with minimal code (proof of scalability)

---

## 11. Open Questions / Decisions Still Needed

1. **Route file generation:**
   - Should route files be generated at build time, runtime, or manually created?
   - Recommendation: Manually create route handler templates (easier to debug/maintain)

2. **Config registry integration:**
   - How does the existing `tab-config-registry` and `table-config-registry` integrate?
   - Recommendation: Auto-register all child configs in bootstrap.ts

3. **Parameter passing in tabs:**
   - If detail view has tabs (via tab-engine), how should `$nodeId` flow to tabs?
   - Recommendation: LayoutEngine → TabEngine → individual tab renderers

---

**Prepared for:** User Review
**Next Step:** Spec approval → Implementation planning
