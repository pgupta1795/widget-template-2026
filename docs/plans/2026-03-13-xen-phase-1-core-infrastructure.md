# XEN Tables — Phase 1: Core Infrastructure

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enhance api-executor for WAF authentication and establish XEN feature directory structure with configs and types.

**Architecture:** Modify existing `api-executor.ts` to use WAF `httpClient` instead of raw fetch, then scaffold XEN feature directory with config factories and shared types.

**Tech Stack:** TypeScript, React, TanStack Table, WAF services, Tailwind CSS

---

## Task 1: Enhance api-executor.ts for WAF Authentication

**Files:**
- Modify: `src/components/data-grid/table-engine/api-executor.ts`

**Step 1: Read current api-executor.ts to understand structure**

Run: `cat src/components/data-grid/table-engine/api-executor.ts | head -100`

Understand:
- Current `fetchSource()` uses raw `fetch()`
- No WAF authentication
- Need to swap for `httpClient.request()`

**Step 2: Add WAF httpClient import**

In `src/components/data-grid/table-engine/api-executor.ts`, add at top:

```typescript
import { httpClient } from "@/services"
```

**Step 3: Update fetchSource function to use httpClient**

Replace the `fetchSource` function (lines 56-125) with:

```typescript
export async function fetchSource(
  source: DataSourceConfig,
  resolvedSources: SourceMap,
  signal?: AbortSignal
): Promise<FetchResult> {
  const url = await buildRequestUrl(
    source.url,
    resolvedSources,
    source.params
  )

  const shouldRetry = source.retryOnNetworkError !== false
  const maxAttempts = shouldRetry ? 2 : 1

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      // Use WAF httpClient instead of raw fetch
      const response = await httpClient.request({
        method: source.method ?? "GET",
        url,
        ...(source.body && { data: source.body }),
        headers: source.headers,
        signal,
      })

      const raw = response.data

      // Apply JSONata transform if configured
      const data = source.transform
        ? await evaluateSourceExpr(
            source.transform,
            {
              sources: { ...resolvedSources, [source.id]: raw },
            },
            raw
          )
        : raw

      return { data, error: null }
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts - 1
      const isAbort = err instanceof DOMException && err.name === "AbortError"

      if (isAbort || isLastAttempt) {
        return {
          data: null,
          error: err instanceof Error ? err : new Error(String(err)),
        }
      }
      // Continue to next attempt
    }
  }

  return { data: null, error: new Error(`fetchSource: unexpected exit for ${source.id}`) }
}
```

**Step 4: Test api-executor still compiles**

Run: `npm run build 2>&1 | grep -E "(error|warning)" | head -20`

Expected: No errors related to api-executor

---

## Task 2: Create XEN Feature Directory Structure

**Files:**
- Create: `src/features/xen/components/`
- Create: `src/features/xen/configs/`
- Create: `src/features/xen/hooks/`
- Create: `src/features/xen/types/`

**Step 1: Create directories**

```bash
mkdir -p src/features/xen/components
mkdir -p src/features/xen/configs
mkdir -p src/features/xen/hooks
mkdir -p src/features/xen/types
```

**Step 2: Verify structure**

```bash
ls -la src/features/xen/
```

Expected:
```
components/
configs/
hooks/
types/
```

---

## Task 3: Create Shared Types

**Files:**
- Create: `src/features/xen/types/xen-types.ts`

**Step 1: Write xen-types.ts**

```typescript
import type { GridRow } from "@/components/data-grid/types/grid-types"

/**
 * Base type for Engineering Item from Search API
 */
export interface EngItem extends GridRow {
  id: string
  title?: string
  type?: string
  state?: string
  created?: string
  owner?: string
  organization?: string
  name?: string
  modified?: string
  revision?: string
  cestamp?: string
  collabspace?: string
}

/**
 * Hierarchical structure for expanded product
 */
export interface ExpandedProduct extends EngItem {
  children?: ExpandedProduct[]
  instances?: ExpandedProduct[]
}

/**
 * Raw response from Expand API
 */
export interface ExpandResponse {
  member: Array<{
    id?: string
    type?: string
    name?: string
    title?: string
    state?: string
    created?: string
    modified?: string
    owner?: string
    organization?: string
    revision?: string
    cestamp?: string
    collabspace?: string
    Path?: string[]
  }>
  totalItems?: number
  nlsLabel?: Record<string, string>
}
```

**Step 2: Verify file created**

```bash
ls -la src/features/xen/types/xen-types.ts
```

Expected: File exists

---

## Task 4: Create My Products Config Factory

**Files:**
- Create: `src/features/xen/configs/my-products-config.ts`

**Step 1: Write my-products-config.ts**

```typescript
import type { TableConfig } from "@/components/data-grid/table-engine/types"

/**
 * Factory function to create DAG-based config for My Products search table.
 * Search query is reactive — component provides updated query via factory invocation.
 */
export function createMyProductsConfig(searchQuery: string): TableConfig {
  return {
    id: "my-products-search",
    mode: "infinite",

    dataSources: [
      {
        id: "search",
        url: "/resources/v1/modeler/dseng/dseng:EngItem/search",
        method: "GET",
        params: {
          $searchStr: searchQuery || "",
          $top: "50",
        },
        // Extract items array from response
        transform: "$.member",
        retryOnNetworkError: true,
      },
    ],

    columns: [
      {
        field: "id",
        header: "ID",
        type: "string",
        width: 150,
        sortable: true,
        copyable: true,
      },
      {
        field: "title",
        header: "Title",
        type: "string",
        width: 200,
        sortable: true,
      },
      {
        field: "type",
        header: "Type",
        type: "string",
        width: 120,
        sortable: true,
      },
      {
        field: "state",
        header: "State",
        type: "string",
        width: 100,
        sortable: true,
      },
      {
        field: "created",
        header: "Created",
        type: "date",
        width: 150,
        sortable: true,
      },
      {
        field: "owner",
        header: "Owner",
        type: "string",
        width: 150,
        sortable: true,
      },
      {
        field: "organization",
        header: "Organization",
        type: "string",
        width: 150,
        sortable: true,
      },
    ],

    features: {
      sorting: { enabled: true },
      selection: { enabled: true },
      virtualization: { enabled: true },
    },

    options: {
      pageSize: 50,
    },
  }
}
```

**Step 2: Verify syntax**

```bash
npx tsc --noEmit src/features/xen/configs/my-products-config.ts
```

Expected: No errors

---

## Task 5: Create Product Expansion Config

**Files:**
- Create: `src/features/xen/configs/product-expansion-config.ts`

**Step 1: Write product-expansion-config.ts**

```typescript
import type { TableConfig } from "@/components/data-grid/table-engine/types"

/**
 * Static config for Product Expansion tree table.
 * Data is provided by component after drop zone capture and expand API call.
 * No dataSources — data is passed directly via ConfiguredTable.
 */
export function createProductExpansionConfig(): TableConfig {
  return {
    id: "product-expansion-tree",
    mode: "tree",

    dataSources: [], // Data provided by component, not API

    columns: [
      {
        field: "id",
        header: "ID",
        type: "string",
        width: 150,
        sortable: true,
        copyable: true,
      },
      {
        field: "type",
        header: "Type",
        type: "string",
        width: 120,
        sortable: true,
      },
      {
        field: "name",
        header: "Name",
        type: "string",
        width: 150,
        sortable: true,
      },
      {
        field: "title",
        header: "Title",
        type: "string",
        width: 200,
        sortable: true,
      },
      {
        field: "state",
        header: "State",
        type: "string",
        width: 100,
        sortable: true,
      },
      {
        field: "created",
        header: "Created",
        type: "date",
        width: 150,
        sortable: true,
      },
      {
        field: "modified",
        header: "Modified",
        type: "date",
        width: 150,
        sortable: true,
      },
      {
        field: "owner",
        header: "Owner",
        type: "string",
        width: 150,
        sortable: true,
      },
      {
        field: "organization",
        header: "Organization",
        type: "string",
        width: 150,
        sortable: true,
      },
    ],

    features: {
      sorting: { enabled: true },
      selection: { enabled: true },
      treeExpansion: { enabled: true },
      virtualization: { enabled: true },
    },

    options: {
      subRowsField: "children", // Tree nesting key
    },
  }
}
```

**Step 2: Verify syntax**

```bash
npx tsc --noEmit src/features/xen/configs/product-expansion-config.ts
```

Expected: No errors

---

## Commit All Phase 1 Changes

After completing all tasks above, run a single commit:

```bash
git add \
  src/components/data-grid/table-engine/api-executor.ts \
  src/features/xen/types/xen-types.ts \
  src/features/xen/configs/my-products-config.ts \
  src/features/xen/configs/product-expansion-config.ts

git commit -m "fix: phase 1 completed - core infrastructure

- Integrated WAF httpClient into api-executor for authenticated requests
- Created xen feature directory structure
- Added shared EngItem, ExpandedProduct, and ExpandResponse types
- Implemented my-products search config factory with infinite pagination
- Implemented product-expansion tree config factory"
```

---

## Summary

**Phase 1 Complete:** Core infrastructure is in place
- ✅ WAF authentication integrated into api-executor
- ✅ XEN feature directory structure created
- ✅ Shared types defined
- ✅ Config factories created (my-products, product-expansion)

**Next Phase:** Implement search tab components and hooks

**Commits:** 1 commit with all Phase 1 changes
