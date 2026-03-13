# XEN Tables — Phase 2: Search Tab (My Products)

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement the My Products search tab with debounced search input, manual search button, and ConfiguredTable displaying paginated results.

**Architecture:** Component manages search input state (raw + debounced), passes debounced query to config factory, ConfiguredTable handles pagination and rendering via useTableEngine.

**Tech Stack:** React hooks, TypeScript, ConfiguredTable, shadcn/ui Input/Button

---

## Task 1: Create MyProductsPanel Component

**Files:**
- Create: `src/features/xen/components/my-products-panel.tsx`

**Step 1: Write my-products-panel.tsx**

```typescript
import { useState, useEffect } from "react"
import { ConfiguredTable } from "@/components/data-grid/table-engine/configured-table"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createMyProductsConfig } from "../configs/my-products-config"

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
    setDebouncedSearch(searchInput)
  }

  // Create config dynamically based on debounced search
  const config = createMyProductsConfig(debouncedSearch)

  return (
    <div className="flex flex-col gap-4 p-4 h-full overflow-hidden">
      {/* Search Bar */}
      <div className="flex gap-2 shrink-0">
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
        >
          Search
        </Button>
      </div>

      {/* Data Grid */}
      <div className="flex-1 overflow-hidden min-h-0">
        <ConfiguredTable config={config} />
      </div>
    </div>
  )
}
```

**Step 2: Verify component compiles**

```bash
npx tsc --noEmit src/features/xen/components/my-products-panel.tsx
```

Expected: No errors

---

## Task 2: Create XenSidebar Component

**Files:**
- Create: `src/features/xen/components/xen-sidebar.tsx`

**Step 1: Write xen-sidebar.tsx**

```typescript
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  SidebarGroup,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MyProductsPanel } from "./my-products-panel"
import { ProductExpansionPanel } from "./product-expansion-panel"

/**
 * XEN sidebar content with tabs.
 * Follows api-explorer pattern: Tabs manage state via defaultValue.
 */
export function XenSidebar() {
  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative w-full h-full max-w-full">
      <SidebarGroup className="flex-1 overflow-hidden p-0 min-h-0 min-w-0 gap-0 w-full max-w-full absolute inset-0">
        <SidebarGroupContent className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 w-full max-w-full">
          <Tabs
            defaultValue="products"
            className="flex-1 flex flex-col gap-0 overflow-hidden min-w-0 w-full max-w-full"
          >
            <TabsList
              variant="line"
              className="w-full min-w-0 rounded-none border-b border-border h-9 px-2 justify-start gap-0 shrink-0 flex-nowrap overflow-x-auto overflow-y-hidden"
            >
              <TabsTrigger value="products" className="text-sm shrink-0">
                My Products
              </TabsTrigger>
              <TabsTrigger value="expansion" className="text-sm shrink-0">
                Product Expansion
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="products"
              className="flex-1 overflow-hidden min-w-0 mt-0"
            >
              <ScrollArea className="h-full w-full">
                <div className="w-full min-w-0">
                  <MyProductsPanel />
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent
              value="expansion"
              className="flex-1 overflow-hidden min-w-0 mt-0"
            >
              <ScrollArea className="h-full w-full">
                <div className="w-full min-w-0">
                  <ProductExpansionPanel />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </SidebarGroupContent>
      </SidebarGroup>
    </div>
  )
}
```

**Step 2: Verify syntax**

```bash
npx tsc --noEmit src/features/xen/components/xen-sidebar.tsx
```

Expected: No errors (ProductExpansionPanel not yet created)

---

## Task 3: Create Main Xen Component

**Files:**
- Create: `src/features/xen/components/xen.tsx`

**Step 1: Write xen.tsx**

```typescript
import { useSidebarSlot } from "@/components/layout/sidebar-slot-context"
import { createPortal } from "react-dom"
import { XenSidebar } from "./xen-sidebar"

/**
 * Main XEN component.
 * Renders sidebar content via portal (following api-explorer pattern).
 */
export function Xen() {
  const { slotEl } = useSidebarSlot()

  return (
    <>
      {slotEl && createPortal(<XenSidebar />, slotEl)}
      {/* Main content area — currently empty, available for future use */}
      <div className="relative h-full" />
    </>
  )
}
```

**Step 2: Verify syntax**

```bash
npx tsc --noEmit src/features/xen/components/xen.tsx
```

Expected: No errors

---

## Task 4: Create Component Barrel Export

**Files:**
- Create: `src/features/xen/components/index.ts`

**Step 1: Write index.ts**

```typescript
export { Xen } from "./xen"
export { XenSidebar } from "./xen-sidebar"
export { MyProductsPanel } from "./my-products-panel"
// ProductExpansionPanel will be added in Phase 3
```

**Step 2: Verify**

```bash
npx tsc --noEmit src/features/xen/components/index.ts
```

Expected: No errors

---

## Task 5: Update XEN Route

**Files:**
- Modify: `src/routes/xen.tsx`

**Step 1: Update route to import new Xen component**

Replace content of `src/routes/xen.tsx`:

```typescript
import { Xen } from "@/features/xen/components"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/xen")({
  component: Xen,
})
```

**Step 2: Verify syntax**

```bash
npx tsc --noEmit src/routes/xen.tsx
```

Expected: No errors

---

## Commit All Phase 2 Changes

After completing all tasks above, run a single commit:

```bash
git add \
  src/features/xen/components/my-products-panel.tsx \
  src/features/xen/components/xen-sidebar.tsx \
  src/features/xen/components/xen.tsx \
  src/features/xen/components/index.ts \
  src/routes/xen.tsx

git commit -m "fix: phase 2 completed - search tab (my products)

- Implemented MyProductsPanel with debounced search (500ms) and manual button
- Created XenSidebar with tab structure following api-explorer pattern
- Implemented main Xen component with portal integration
- Added component barrel exports
- Updated xen route to use new component"
```

---

## Summary

**Phase 2 Complete:** Search tab is fully functional
- ✅ MyProductsPanel with debounced search and manual button
- ✅ XenSidebar with tab structure (api-explorer pattern)
- ✅ Main Xen component with portal integration
- ✅ Component barrel exports
- ✅ Route updated to use new component

**Testing:** Can navigate to `/xen`, see My Products tab with search input, type to trigger debounced search, click button for immediate search.

**Next Phase:** Implement Product Expansion tab with drop zone and tree expansion

**Commits:** 1 commit with all Phase 2 changes
