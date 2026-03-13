# XEN Tab Tables Design

**Date:** 2026-03-13
**Feature:** Configuration-driven Data Grid tables in XEN widget
**Status:** Design Approved

---

## Overview

Create two sibling tabs inside the XEN feature's `SidebarGroupContent`:
1. **My Products** — Search and list Engineering Items
2. **Product Expansion** — Explore product hierarchy via drag-and-drop

Both tables use the configuration-driven Data Grid system with DAG-based API resolution and WAF authentication.

---

## Architecture

### Layout Pattern
- Sibling tabs in sidebar (following `api-explorer` pattern)
- No `useState` for tab management — `Tabs` component handles state via `defaultValue`
- `SidebarGroupContent` → `Tabs` → `TabsList` + `TabsContent` sections

### Technology Stack
- **Data Grid:** `ConfiguredTable` + `useTableEngine` (DAG-based)
- **Data Fetching:** TanStack Query (`useInfiniteData` for infinite, `useQuery` for tree)
- **Authentication:** WAF `httpClient` service (auto CSRF/cookies)
- **UI Components:** shadcn/ui (Tabs, Input, Button, ScrollArea, SidebarGroup)
- **Styling:** Tailwind CSS

---

## Tab 1: My Products (Search)

### Purpose
Display and search for Engineering Items with server-side pagination.

### User Interaction
1. User enters search text (minimum 2 characters)
2. Input debounces for 500ms, auto-triggers API
3. User can click "Search" button to trigger immediately without waiting for debounce
4. Results paginate on scroll (infinite mode)

### API Integration
- **Endpoint:** `GET /resources/v1/modeler/dseng/dseng:EngItem/search`
- **Query Parameters:**
  - `$searchStr` — search text (from component state)
  - `$top` — items per page (default: 50)
  - `$skip` — offset for pagination (managed by `useInfiniteData`)
- **Response:** Array of EngItem objects (extracted via transform: `$.member`)

### Data Grid Configuration
- **Mode:** `infinite` (cursor/offset-based pagination)
- **Columns:**
  - `id` (string) — Item ID
  - `title` (string) — Item title
  - `type` (string) — Object type
  - `state` (string) — Current state
  - `created` (date) — Creation timestamp
  - `owner` (string) — Owner name
  - `organization` (string) — Organization
- **Features:**
  - Sorting: enabled (click headers)
  - Selection: enabled (checkbox rows)
  - Virtualization: enabled (smooth scrolling for large results)
  - Filtering: disabled
- **Page Size:** 50 items

### Component Structure
- **MyProductsPanel:** Manages search input state, renders search bar + ConfiguredTable
- **Config:** `createMyProductsConfig(searchQuery)` — Dynamic config factory
- **Debounce Logic:** 500ms delay in component, manual button for immediate trigger

---

## Tab 2: Product Expansion (Hierarchy)

### Purpose
Allow users to drop a 3DExperience object and explore its product hierarchy tree.

### User Interaction
1. User drags product from 3DExperience search (external tool)
2. User drops onto "Product Expansion" tab — drop zone captures object ID
3. Component calls Expand API with `expandDepth: -1` to fetch full hierarchy
4. Response is parsed into parent-child tree structure
5. Table displays hierarchical rows with nesting visual structure
6. User can click "Expand All" button to re-expand (already set to -1)

### API Integration
- **Endpoint:** `POST /resources/v1/modeler/dseng/dseng:EngItem/{ID}/expand`
- **Request Body:**
  ```json
  {
    "expandDepth": -1
  }
  ```
- **Response:** Flat list with Path arrays indicating hierarchy
  - `member[]` — References, instances, and path arrays
  - `totalItems` — Count of returned items
  - `nlsLabel` — Column header labels

### Response Parsing
Response is parsed using the provided algorithm:
1. Separate members into references (VPMReference), instances (VPMInstance), paths (Path arrays)
2. Link elements using Path arrays (parent → instance → child chain)
3. Recursively build tree structure from root
4. Output: Single root node with nested `children` array

### Data Grid Configuration
- **Mode:** `tree` (hierarchical with lazy expansion)
- **Columns:**
  - `id` (string) — Item ID
  - `type` (string) — Object type (VPMReference, VPMInstance)
  - `name` (string) — Item name
  - `title` (string) — Display title
  - `state` (string) — Current state
  - `created` (date) — Creation timestamp
  - `modified` (date) — Last modification
  - `owner` (string) — Owner name
  - `organization` (string) — Organization
- **Features:**
  - Sorting: enabled
  - Selection: enabled
  - Tree Expansion: enabled (visual nesting, no lazy loading)
  - Virtualization: enabled
  - Filtering: disabled
- **Tree Nesting:** `subRowsField: "children"`

### Component Structure
- **ProductExpansionPanel:** Manages drop zone, API calls, tree data state
- **use-expand-hierarchy.ts:** `parseExpandResponse()` function for response parsing
- **Config:** `createProductExpansionConfig()` — Static tree mode config
- **Drop Zone:** `use3dxDropZone` hook (existing infrastructure)

---

## Key Design Decisions

### 1. DAG-Based Config Over Raw Props
- **Why:** Declarative, server-friendly, aligns with existing data-grid philosophy
- **Trade-off:** Less imperative control, but cleaner separation of concerns
- **Implementation:** `ConfiguredTable` + `useTableEngine` handle all data flow

### 2. Dynamic Config for Search
- **Why:** Search query must be reactive (debounced input → config params)
- **Solution:** Factory function `createMyProductsConfig(searchQuery)` regenerates config
- **Benefits:** Clean reactive pattern, no custom hooks needed

### 3. Component-Managed Data for Tree
- **Why:** Drop zone is component logic, not declarative config
- **Solution:** Component calls Expand API, parses response, passes data to ConfiguredTable
- **Benefits:** Keeps drop zone logic encapsulated, easy to test

### 4. WAF Authentication Enhancement
- **Current State:** `api-executor.ts` uses raw `fetch()`
- **Requirement:** Must use WAF `httpClient` for auto CSRF/cookies
- **Solution:** Enhance `api-executor.ts` to swap `fetch()` → `httpClient.request()`
- **Impact:** One-time change, benefits all future DAG-based tables

### 5. No Lazy Expansion for Tree
- **Why:** Expand API with `expandDepth: -1` fetches entire hierarchy at once
- **Decision:** Render full tree immediately, no lazy-loading children
- **Trade-off:** May be slower for very deep hierarchies, but simpler UX

---

## File Structure

```
src/features/xen/
├── components/
│   ├── xen.tsx                    # Main wrapper, tab orchestrator
│   ├── xen-sidebar.tsx            # Sidebar content with tabs
│   ├── my-products-panel.tsx      # Search bar + ConfiguredTable
│   ├── product-expansion-panel.tsx # Drop zone + ConfiguredTable
│   └── hooks/
│       └── use-expand-hierarchy.ts # Response parser
├── configs/
│   ├── my-products-config.ts      # DAG config factory for infinite search
│   └── product-expansion-config.ts # Static tree mode config
└── types/
    └── xen-types.ts               # Shared types
```

### Enhanced Core Files
- `src/components/data-grid/table-engine/api-executor.ts` — WAF `httpClient` integration

---

## Implementation Phases

### Phase 1: Core Infrastructure
1. Enhance `api-executor.ts` to use WAF `httpClient`
2. Create XEN feature directory structure
3. Create config files (my-products, product-expansion)
4. Create shared types

### Phase 2: Search Tab
1. Implement `MyProductsPanel` component
2. Implement `createMyProductsConfig()` factory
3. Test with Search API
4. Add debounce + manual button

### Phase 3: Expansion Tab
1. Implement `use-expand-hierarchy.ts` parser
2. Implement `ProductExpansionPanel` component
3. Implement drop zone integration
4. Test with Expand API

### Phase 4: Assembly & Polish
1. Implement `Xen` wrapper and `XenSidebar`
2. Portal integration for sidebar rendering
3. Error handling and empty states
4. Testing and refinement

---

## Testing Strategy

### Unit Tests
- Response parser (`parseExpandResponse`) — various hierarchy depths
- Config factories — parameter binding, transform expressions

### Integration Tests
- Search API with pagination
- Expand API with full hierarchy
- Drop zone ID capture

### E2E Tests (if applicable)
- Full search workflow (input → debounce → pagination)
- Full expansion workflow (drop → parse → render tree)

---

## Error Handling

### Search Tab
- Network error → Toast: "Failed to search. Try again."
- Empty results → Message: "No products found."

### Expansion Tab
- Drop zone error → Toast: "Failed to capture object. Try again."
- Expand API error → Toast: "Failed to expand hierarchy."
- Invalid response (missing Path/member) → Toast: "Invalid response structure."

---

## Notes

- WAF authentication is transparent — `httpClient` handles CSRF token management
- Infinite pagination uses offset/limit pattern with `$skip` and `$top`
- Tree expansion is non-lazy (full hierarchy fetched at once)
- Both tables support sorting and selection but not filtering
- Virtualization enabled for performance with large datasets

---

## Approved By

- **Date:** 2026-03-13
- **Status:** ✅ Ready for Implementation
