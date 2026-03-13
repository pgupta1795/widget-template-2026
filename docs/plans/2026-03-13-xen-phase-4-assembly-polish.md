# XEN Tables — Phase 4: Assembly & Polish

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete integration, error handling refinement, and final polish.

**Architecture:** Verify portal integration with sidebar, refine error states, add edge-case handling, add documentation and feature barrel export.

**Tech Stack:** React, TypeScript, shadcn/ui

---

## Task 1: Create Error Handling Utility

**Files:**
- Create: `src/features/xen/utils/error-handler.ts`
- Create: `src/features/xen/utils/index.ts`

**Step 1: Write error handler**

```typescript
/**
 * Centralized error handling for XEN feature.
 * Displays user-friendly error messages.
 */
export function handleXenError(error: Error | unknown, context: string) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred"

  console.error(`[XEN ${context}]`, error)

  // Toast notification handled in component
  return message
}

/**
 * Validate search query meets minimum requirements.
 * @returns true if valid, false otherwise
 */
export function isValidSearchQuery(query: string): boolean {
  return query.length === 0 || query.length >= 2
}

/**
 * Validate expand response has required structure.
 * @returns true if valid, false otherwise
 */
export function isValidExpandResponse(response: any): boolean {
  return (
    response &&
    Array.isArray(response.member) &&
    response.member.length > 0
  )
}
```

**Step 2: Create utils barrel export**

Create `src/features/xen/utils/index.ts`:

```typescript
export {
  handleXenError,
  isValidSearchQuery,
  isValidExpandResponse,
} from "./error-handler"
```

**Step 3: Verify syntax**

```bash
npx tsc --noEmit src/features/xen/utils/error-handler.ts
npx tsc --noEmit src/features/xen/utils/index.ts
```

Expected: No errors

---

## Task 2: Update MyProductsPanel with Validation

**Files:**
- Modify: `src/features/xen/components/my-products-panel.tsx`

**Step 1: Update component with validation**

Replace entire file:

```typescript
import { useState, useEffect } from "react"
import { ConfiguredTable } from "@/components/data-grid/table-engine/configured-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { createMyProductsConfig } from "../configs/my-products-config"
import { isValidSearchQuery } from "../utils"

/**
 * My Products search tab.
 * Manages search input with debounce (500ms) + manual search button.
 * Displays paginated results in ConfiguredTable (infinite mode).
 */
export function MyProductsPanel() {
  const [searchInput, setSearchInput] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")

  // Debounce: 500ms delay
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Manual search button: immediate trigger without waiting for debounce
  const handleManualSearch = () => {
    if (!isValidSearchQuery(searchInput)) {
      return // Validation prevents invalid searches
    }
    setDebouncedSearch(searchInput)
  }

  // Create config dynamically based on debounced search
  const config = createMyProductsConfig(debouncedSearch)

  // Show helper text for minimum search length
  const searchHintText =
    searchInput.length > 0 && searchInput.length < 2
      ? "Minimum 2 characters"
      : ""

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-hidden">
      {/* Search Bar */}
      <div className="flex flex-col gap-2 shrink-0">
        <div className="flex gap-2">
          <Input
            placeholder="Search products (min 2 chars)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
            autoFocus
          />
          <Button
            onClick={handleManualSearch}
            variant="default"
            size="sm"
            disabled={!isValidSearchQuery(searchInput)}
          >
            Search
          </Button>
        </div>
        {searchHintText && (
          <p className="text-xs text-muted-foreground">{searchHintText}</p>
        )}
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ConfiguredTable config={config} />
      </div>
    </div>
  )
}
```

**Step 2: Verify syntax**

```bash
npx tsc --noEmit src/features/xen/components/my-products-panel.tsx
```

Expected: No errors

---

## Task 3: Update ProductExpansionPanel with Error Utility

**Files:**
- Modify: `src/features/xen/components/product-expansion-panel.tsx`

**Step 1: Update imports and error handling**

Replace imports section:

```typescript
import { useState } from "react"
import { ConfiguredTable } from "@/components/data-grid/table-engine/configured-table"
import { Button } from "@/components/ui/button"
import { DropZoneOverlay } from "@/components/dnd/drop-zone-overlay"
import { use3dxDropZone } from "@/hooks/use-3dx-drop-zone"
import { httpClient } from "@/services"
import { createProductExpansionConfig } from "../configs/product-expansion-config"
import { parseExpandResponse } from "../hooks/use-expand-hierarchy"
import { handleXenError, isValidExpandResponse } from "../utils"
import type { ExpandedProduct } from "../types/xen-types"
```

**Step 2: Update expandProduct function to use validation**

In the `expandProduct` function, add response validation:

```typescript
      // Validate response structure
      if (!isValidExpandResponse(response.data)) {
        const errorMsg = "Invalid response structure — no hierarchy data"
        setError(errorMsg)
        handleXenError(new Error(errorMsg), "Product Expansion")
        setHierarchyData(null)
        return
      }
```

**Step 3: Verify syntax**

```bash
npx tsc --noEmit src/features/xen/components/product-expansion-panel.tsx
```

Expected: No errors

---

## Task 4: Create Feature Documentation

**Files:**
- Create: `src/features/xen/README.md`

**Step 1: Write README**

```markdown
# XEN Feature

Configuration-driven Data Grid implementation for 3DExperience Engineering Items search and hierarchy exploration.

## Tabs

### My Products
Search and browse Engineering Items with server-side pagination.

**Features:**
- Debounced search input (500ms) with minimum 2 character validation
- Manual search button for immediate queries
- Infinite pagination (50 items per page)
- Sortable columns: ID, Title, Type, State, Created, Owner, Organization
- Row selection (checkboxes)
- Virtual scrolling for performance

**API:** `GET /resources/v1/modeler/dseng/dseng:EngItem/search`

### Product Expansion
Explore product hierarchies via drag-and-drop from 3DExperience.

**Features:**
- Drop zone for 3DExperience objects
- Full hierarchy expansion (expandDepth: -1)
- Tree visualization with nesting
- Sortable columns: ID, Type, Name, Title, State, Created, Modified, Owner, Organization
- Row selection
- "Expand All" button to re-fetch hierarchy

**API:** `POST /resources/v1/modeler/dseng/dseng:EngItem/{ID}/expand`

## Architecture

- **ConfiguredTable:** DAG-based table configuration with useTableEngine
- **useTableEngine:** Handles API fetching, data resolution, pagination
- **useExpandHierarchy:** Response parsing for hierarchical data
- **WAF Authentication:** All APIs use httpClient for transparent auth/CSRF

## File Structure

```
src/features/xen/
├── components/
│   ├── xen.tsx                    # Main component
│   ├── xen-sidebar.tsx            # Sidebar with tabs
│   ├── my-products-panel.tsx      # Search tab
│   ├── product-expansion-panel.tsx # Expansion tab
│   └── index.ts                   # Barrel export
├── configs/
│   ├── my-products-config.ts      # Search table config
│   ├── product-expansion-config.ts # Tree table config
├── hooks/
│   ├── use-expand-hierarchy.ts    # Response parser
│   └── index.ts                   # Barrel export
├── utils/
│   ├── error-handler.ts           # Error utilities
│   └── index.ts                   # Barrel export
├── types/
│   └── xen-types.ts               # TypeScript types
├── index.ts                       # Feature barrel export
└── README.md                      # This file
```

## Testing

```bash
# Run all XEN tests
npm run test src/features/xen/

# Run specific test file
npm run test src/features/xen/hooks/__tests__/use-expand-hierarchy.test.ts
```

## Error Handling

All API errors are logged and displayed via error messages. Invalid responses (missing required fields) are caught before rendering.

## Performance

- Virtual scrolling enabled for large datasets
- Debounced search reduces API calls (500ms)
- Full hierarchy fetched on demand with expandDepth: -1
```

**Step 2: Commit documentation**

Expected: File created successfully

---

## Task 5: Create Feature Barrel Export

**Files:**
- Create: `src/features/xen/index.ts`

**Step 1: Write main barrel export**

```typescript
/**
 * XEN Feature — Configuration-driven Data Grid for 3DExperience Engineering Items
 *
 * Usage:
 * import { Xen } from "@/features/xen"
 */

export { Xen } from "./components"
export {
  XenSidebar,
  MyProductsPanel,
  ProductExpansionPanel,
} from "./components"
export {
  createMyProductsConfig,
  createProductExpansionConfig,
} from "./configs"
export { useExpandHierarchy, parseExpandResponse } from "./hooks"
export {
  handleXenError,
  isValidSearchQuery,
  isValidExpandResponse,
} from "./utils"
export type { EngItem, ExpandedProduct, ExpandResponse } from "./types/xen-types"
```

**Step 2: Verify syntax**

```bash
npx tsc --noEmit src/features/xen/index.ts
```

Expected: No errors

---

## Task 6: Final Build and Test Verification

**Files:**
- Build verification

**Step 1: Run full build**

```bash
npm run build
```

Expected: No errors, successful build

**Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 3: Verify route works**

Navigate to `/xen` route and verify:
- Sidebar loads with tabs
- "My Products" tab is default
- "Product Expansion" tab is clickable
- Search input displays and is functional
- Drop zone displays in expansion tab

---

## Commit All Phase 4 Changes

After completing all tasks above, run a single commit:

```bash
git add \
  src/features/xen/utils/error-handler.ts \
  src/features/xen/utils/index.ts \
  src/features/xen/components/my-products-panel.tsx \
  src/features/xen/components/product-expansion-panel.tsx \
  src/features/xen/README.md \
  src/features/xen/index.ts

git commit -m "fix: phase 4 completed - assembly & polish

- Added centralized error handling utility
- Integrated validation into my-products panel
- Integrated error utility into product-expansion panel
- Created comprehensive feature documentation (README)
- Added feature barrel export with full public API
- Verified build, types, and route navigation"
```

---

## Summary

**Phase 4 Complete:** XEN feature is production-ready
- ✅ Centralized error handling utility
- ✅ Validation and improved UX in both tabs
- ✅ Feature documentation (README)
- ✅ Main feature barrel export
- ✅ Full build and type verification
- ✅ Route navigation verified

**Feature Complete:** Ready for deployment and user acceptance testing

**Total Commits:** 4 commits (one per phase)
1. Phase 1: Core infrastructure
2. Phase 2: Search tab
3. Phase 3: Expansion tab
4. Phase 4: Assembly & Polish

**All Tasks Implemented:**
- ✅ WAF authentication integration
- ✅ Search functionality with debounce
- ✅ Product expansion with drop zone
- ✅ Tree hierarchy rendering
- ✅ Error handling
- ✅ Documentation
- ✅ Type safety
