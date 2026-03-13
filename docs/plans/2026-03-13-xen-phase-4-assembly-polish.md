# XEN Tables — Phase 4: Assembly & Polish

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete integration, error handling refinement, feature testing, and final polish.

**Architecture:** Verify portal integration with sidebar, refine error states, add edge-case handling, run full end-to-end tests.

**Tech Stack:** React, TypeScript, shadcn/ui Toast, Testing Library

---

## Task 1: Create Shared Error Handling Utility

**Files:**
- Create: `src/features/xen/utils/error-handler.ts`

**Step 1: Write error handler**

```typescript
import { toast } from "@/components/ui/use-toast"

/**
 * Centralized error handling for XEN feature.
 * Displays user-friendly error messages via toast.
 */
export function handleXenError(error: Error | unknown, context: string) {
  const message =
    error instanceof Error ? error.message : "An unexpected error occurred"

  console.error(`[XEN ${context}]`, error)

  toast({
    variant: "destructive",
    title: `${context} Failed`,
    description: message,
  })
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

**Step 2: Verify syntax**

```bash
npx tsc --noEmit src/features/xen/utils/error-handler.ts
```

Expected: No errors

**Step 3: Create utils barrel export**

Create `src/features/xen/utils/index.ts`:

```typescript
export {
  handleXenError,
  isValidSearchQuery,
  isValidExpandResponse,
} from "./error-handler"
```

**Step 4: Commit utility**

```bash
git add src/features/xen/utils/error-handler.ts
git add src/features/xen/utils/index.ts
git commit -m "feat: add centralized error handling for xen feature"
```

---

## Task 2: Update MyProductsPanel with Error Handling

**Files:**
- Modify: `src/features/xen/components/my-products-panel.tsx`

**Step 1: Read current MyProductsPanel**

```bash
cat src/features/xen/components/my-products-panel.tsx
```

**Step 2: Add validation and improve UX**

Replace content:

```typescript
import { useState, useEffect } from "react"
import { ConfiguredTable } from "@/components/data-grid/table-engine/configured-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
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

**Step 3: Verify syntax**

```bash
npx tsc --noEmit src/features/xen/components/my-products-panel.tsx
```

Expected: No errors

**Step 4: Commit improvements**

```bash
git add src/features/xen/components/my-products-panel.tsx
git commit -m "feat: add validation and improved UX to my-products panel"
```

---

## Task 3: Update ProductExpansionPanel with Error Handling Utility

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

**Step 2: Update expandProduct function**

Replace expandProduct function:

```typescript
  async function expandProduct(productId: string) {
    setIsExpanding(true)
    setError(null)

    try {
      const response = await httpClient.post(
        `/resources/v1/modeler/dseng/dseng:EngItem/${productId}/expand`,
        {
          expandDepth: -1, // Fetch full hierarchy
        }
      )

      // Validate response structure
      if (!isValidExpandResponse(response.data)) {
        setError("Invalid response structure — no hierarchy data")
        setHierarchyData(null)
        return
      }

      // Parse flat response into tree structure
      const tree = parseExpandResponse(response.data)

      if (!tree) {
        setError("Failed to parse product hierarchy")
        setHierarchyData(null)
        return
      }

      // Wrap root in array for ConfiguredTable
      setHierarchyData([tree])
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to expand product"
      setError(message)
      setHierarchyData(null)
      handleXenError(err, "Product Expansion")
    } finally {
      setIsExpanding(false)
    }
  }
```

**Step 3: Verify syntax**

```bash
npx tsc --noEmit src/features/xen/components/product-expansion-panel.tsx
```

Expected: No errors

**Step 4: Commit improvements**

```bash
git add src/features/xen/components/product-expansion-panel.tsx
git commit -m "feat: integrate error handling utility in product-expansion panel"
```

---

## Task 4: Create Integration Tests

**Files:**
- Create: `src/features/xen/__tests__/xen-integration.test.tsx`

**Step 1: Write integration test**

```typescript
import { render, screen, waitFor } from "@testing-library/react"
import { vi } from "vitest"
import { Xen } from "../components"

// Mock sidebar slot context
vi.mock("@/components/layout/sidebar-slot-context", () => ({
  useSidebarSlot: () => ({
    slotEl: document.createElement("div"),
  }),
}))

// Mock ConfiguredTable
vi.mock("@/components/data-grid/table-engine/configured-table", () => ({
  ConfiguredTable: ({ config }: any) => (
    <div data-testid="configured-table">{config.id}</div>
  ),
}))

// Mock UI components
vi.mock("@/components/ui/input", () => ({
  Input: (props: any) => <input data-testid="search-input" {...props} />,
}))

vi.mock("@/components/ui/button", () => ({
  Button: (props: any) => <button data-testid="button" {...props} />,
}))

vi.mock("@/components/ui/scroll-area", () => ({
  ScrollArea: ({ children }: any) => <div>{children}</div>,
}))

vi.mock("@/components/ui/sidebar", () => ({
  SidebarGroup: ({ children }: any) => <div>{children}</div>,
  SidebarGroupContent: ({ children }: any) => <div>{children}</div>,
}))

vi.mock("@/components/ui/tabs", () => ({
  Tabs: ({ children, defaultValue }: any) => (
    <div data-testid="tabs">{children}</div>
  ),
  TabsList: ({ children }: any) => <div>{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <button data-testid={`tab-${value}`}>{children}</button>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid={`tab-content-${value}`}>{children}</div>
  ),
}))

describe("XEN Integration", () => {
  it("renders xen component", () => {
    render(<Xen />)
    expect(screen.getByTestId("tabs")).toBeInTheDocument()
  })

  it("has my-products and expansion tabs", () => {
    render(<Xen />)
    expect(screen.getByTestId("tab-products")).toBeInTheDocument()
    expect(screen.getByTestId("tab-expansion")).toBeInTheDocument()
  })

  it("renders my products table on default tab", () => {
    render(<Xen />)
    expect(screen.getByTestId("configured-table")).toBeInTheDocument()
  })
})
```

**Step 2: Run tests**

```bash
npm run test src/features/xen/__tests__/xen-integration.test.tsx
```

Expected: Tests pass

**Step 3: Commit tests**

```bash
git add src/features/xen/__tests__/xen-integration.test.tsx
git commit -m "test: add xen integration tests for component structure"
```

---

## Task 5: Create Feature Documentation

**Files:**
- Create: `src/features/xen/README.md`

**Step 1: Write README**

```markdown
# XEN Feature

Configuration-driven Data Grid implementation for 3DExperience Engineering Items.

## Tabs

### My Products
Search and browse Engineering Items with server-side pagination.

**Features:**
- Debounced search input (500ms) with minimum 2 character validation
- Manual search button for immediate queries
- Infinite pagination (50 items per page)
- Sortable columns
- Row selection
- Virtual scrolling for performance

**API:** `GET /resources/v1/modeler/dseng/dseng:EngItem/search`

### Product Expansion
Explore product hierarchies via drag-and-drop.

**Features:**
- Drop zone for 3DExperience objects
- Full hierarchy expansion (expandDepth: -1)
- Tree visualization with nesting
- Sortable columns
- Row selection
- "Expand All" button to re-fetch hierarchy

**API:** `POST /resources/v1/modeler/dseng/dseng:EngItem/{ID}/expand`

## Architecture

- **ConfiguredTable:** DAG-based table configuration
- **useTableEngine:** Handles API fetching, data resolution, pagination
- **useExpandHierarchy:** Response parsing for hierarchical data
- **WAF Authentication:** All APIs use httpClient for transparent auth/CSRF

## Files

- `components/` — React components (Xen, sidebar, panels)
- `configs/` — Table configurations (My Products, Product Expansion)
- `hooks/` — Custom hooks (useExpandHierarchy)
- `types/` — TypeScript type definitions
- `utils/` — Error handling and validation utilities

## Testing

```bash
# Run all XEN tests
npm run test src/features/xen/

# Run specific test file
npm run test src/features/xen/hooks/__tests__/use-expand-hierarchy.test.ts
```

## Error Handling

All API errors are logged and displayed via toast notifications. Invalid responses (missing required fields) are caught before rendering.

## Future Enhancements

- Lazy tree expansion (expand children on demand)
- Tree filtering by type or state
- Bulk selection with multi-item actions
- Export hierarchy to CSV/JSON
```

**Step 2: Commit documentation**

```bash
git add src/features/xen/README.md
git commit -m "docs: add xen feature documentation"
```

---

## Task 6: Create Checklist for Manual Testing

**Files:**
- Create: `src/features/xen/TESTING.md`

**Step 1: Write testing guide**

```markdown
# XEN Feature Manual Testing Checklist

## My Products Tab

- [ ] Navigate to `/xen` route
- [ ] Verify "My Products" tab is active by default
- [ ] Type search query with less than 2 characters — verify "Search" button is disabled
- [ ] Type search query with 2+ characters — verify results appear after 500ms debounce
- [ ] Click "Search" button immediately after typing — verify results update without waiting for debounce
- [ ] Clear search input — verify results reset
- [ ] Click table headers — verify sorting works (ascending/descending/clear)
- [ ] Check table rows — verify selection checkboxes work
- [ ] Scroll down — verify infinite pagination loads next page
- [ ] Verify columns display: ID, Title, Type, State, Created, Owner, Organization

## Product Expansion Tab

- [ ] Click "Product Expansion" tab
- [ ] Verify empty state message: "Drop a product here..."
- [ ] Drag product from 3DExperience search to drop zone
- [ ] Verify dropped product ID appears at top
- [ ] Verify tree table renders with hierarchy structure
- [ ] Click "Expand All" button — verify tree re-expands
- [ ] Click table headers — verify sorting works
- [ ] Expand/collapse tree nodes — verify visual nesting
- [ ] Verify columns display: ID, Type, Name, Title, State, Created, Modified, Owner, Organization

## Error Scenarios

- [ ] Type invalid search (single character) — verify button disabled, no API call
- [ ] Expand invalid product ID — verify error message displays
- [ ] Network error on expand — verify toast error notification
- [ ] Switch tabs — verify state is preserved
- [ ] Refresh page on XEN tab — verify data persists (or resets appropriately)

## Performance

- [ ] Search results with 50+ items — verify smooth scrolling (virtualization)
- [ ] Tree with 3+ levels — verify no lag when expanding/collapsing
- [ ] Rapid tab switching — verify no crashes or memory leaks
```

**Step 2: Commit testing guide**

```bash
git add src/features/xen/TESTING.md
git commit -m "docs: add manual testing checklist for xen feature"
```

---

## Task 7: Create Feature Index Export

**Files:**
- Create: `src/features/xen/index.ts`

**Step 1: Write main barrel export**

```typescript
/**
 * XEN Feature — Configuration-driven Data Grid for 3DExperience Engineering Items
 *
 * Usage:
 * import { Xen } from "@/features/xen"
 *
 * Then use in router:
 * <Route path="/xen" component={Xen} />
 */

export { Xen } from "./components"
export { XenSidebar, MyProductsPanel, ProductExpansionPanel } from "./components"
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

**Step 3: Commit barrel export**

```bash
git add src/features/xen/index.ts
git commit -m "feat: add feature barrel export for xen"
```

---

## Task 8: Final Build and Test Run

**Files:**
- Build verification

**Step 1: Run full build**

```bash
npm run build
```

Expected: No errors, successful build

**Step 2: Run all tests**

```bash
npm run test src/features/xen/
```

Expected: All tests pass

**Step 3: Type check**

```bash
npx tsc --noEmit
```

Expected: No errors

**Step 4: Commit final build verification**

```bash
git log --oneline | head -15
```

Expected: All Phase commits visible

---

## Summary

**Phase 4 Complete:** XEN feature is production-ready
- ✅ Centralized error handling utility
- ✅ Validation and improved UX in both tabs
- ✅ Integration tests verify component structure
- ✅ Feature documentation (README, TESTING checklist)
- ✅ Main feature barrel export
- ✅ Full build and test verification

**Testing:** Can manually test all user workflows, error scenarios, and edge cases per checklist.

**Total Commits (All Phases):** ~20 total
- Phase 1: 5 commits (api-executor, structure, types, configs)
- Phase 2: 6 commits (panel, tests, sidebar, xen, barrel, route)
- Phase 3: 5 commits (hook, tests, panel, tests, barrel)
- Phase 4: 5+ commits (error handler, panel updates, tests, docs, barrel, build)

**Feature Complete:** Ready for deployment and user acceptance testing.
