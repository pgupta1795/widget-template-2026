# Design: Xen Engineering Tables (Search + Expand)

**Date:** 2026-03-14
**Branch:** tanstack-table-ui
**Replaces:** `ebom.config.ts`, `mbom.config.ts`

---

## Overview

Replace the eBOM/mBOM tabs in the Xen component with two Engineering Item tables driven by the 3DEXPERIENCE `dseng:EngItem` REST API:

1. **Search Table** — infinite-scroll table backed by the `GET .../dseng:EngItem/search` endpoint, with a debounced search input.
2. **Expand Tree Table** — tree table backed by the `POST .../dseng:EngItem/{ID}/expand` endpoint, root item supplied by dropping an Engineering Item onto the widget via `use3dxDropZone`.

Both tables support multi-row selection and show all columns returned by the default API mask.

---

## Engine Changes (minimal, targeted)

### 1. `params` prop on `ConfiguredTable` / `useDAGTable`

**Problem:** Dynamic values (search string, dropped item ID) cannot currently be passed into a static `DAGTableConfig`'s JSONata expressions at runtime.

**Change:**
- `useDAGTable(config, engine, params?)` — merges `params` into the initial `NodeContext` via `.withParams(params)`.
- `ConfiguredTable({ config, className, params? })` — forwards `params` to `useDAGTable`.

`params` keys are then available inside any JSONata expression as `$params.<key>`.

### 2. Offset pagination in `ApiNodeExecutor`

**Problem:** `ApiNodeOutput.nextPage` is never populated today; infinite scroll stops after one page.

**Change:** After resolving `queryParams`, if `config.paginationConfig?.type === "offset"`:

```
currentSkip  = parseInt(resolvedQueryParams[paginationConfig.pageParam] ?? "0", 10)
pageSize     = parseInt(resolvedQueryParams[paginationConfig.pageSizeParam] ?? "50", 10)
nextPage     = rows.length >= pageSize ? String(currentSkip + pageSize) : null
```

`nextPage` is then returned as part of `ApiNodeOutput`, driving `getNextPageParam` in `useDAGTable`.

---

## Config 1: `eng-search.config.ts`

**Location:** `src/features/xen/configs/eng-search.config.ts`

| Field | Value |
|-------|-------|
| `tableId` | `"eng-search"` |
| `mode` | `"infinite"` |

### DAG

**Nodes (all initial-wave, no lazy nodes):**

```
root-api  →  columns
```

**`root-api`** (type: `api`):
- `url`: `"/resources/v1/modeler/dseng/dseng:EngItem/search"` (plain string)
- `method`: `GET`
- `authAdapterId`: `"wafdata"`
- `queryParams`:
  - `$searchStr`: `'$:$params.searchStr ?? ""'`
  - `$top`: `"50"`
  - `$skip`: `'$:$exists($params.cursor) ? $params.cursor : "0"'`
  - `$mask`: `"dskern:Mask.Default"`
- `paginationConfig`: `{ type: "offset", pageParam: "$skip", pageSizeParam: "$top" }`
- `responseTransform`:
  ```jsonata
  member.{
    "id":           id,
    "name":         name,
    "title":        title,
    "type":         type,
    "revision":     revision,
    "state":        state,
    "owner":        owner,
    "organization": organization,
    "collabspace":  collabspace,
    "created":      created,
    "modified":     modified
  }
  ```

**`columns`** (type: `column`):

| field | header | notes |
|-------|--------|-------|
| `name` | Name | sortable, filterable |
| `title` | Title | sortable, filterable |
| `type` | Type | |
| `revision` | Rev | |
| `state` | State | `renderType: "badge"` |
| `owner` | Owner | |
| `organization` | Organization | |
| `collabspace` | Collab Space | |
| `created` | Created | `type: "date"` |
| `modified` | Modified | `type: "date"` |

**Edges:** `root-api → columns`
**`rootNodeId`:** `"columns"`

### Features

```ts
{
  sorting:           { enabled: true },
  filtering:         { enabled: true },
  columnResizing:    { enabled: true },
  columnVisibility:  { enabled: true },
  selection:         { enabled: true, mode: "multi" },
}
```

---

## Config 2: `eng-expand.config.ts`

**Location:** `src/features/xen/configs/eng-expand.config.ts`

| Field | Value |
|-------|-------|
| `tableId` | `"eng-expand"` |
| `mode` | `"tree"` |

### DAG

**Initial-wave nodes:**
```
root-api  →  row-expand  →  columns
```

**Lazy nodes** (in `nodes[]`, NOT in `edges[]`):
```
child-expand-api
```

**`root-api`** (type: `api`):
- `url`: `'$:"/resources/v1/modeler/dseng/dseng:EngItem/" & $params.nodeId & "/expand"'`
- `method`: `POST`
- `authAdapterId`: `"wafdata"`
- `body`: `{ expandDepth: 1 }`
- `responseTransform`:
  ```jsonata
  member[type = "VPMReference" and id != $params.nodeId].{
    "id":           id,
    "name":         name,
    "title":        title,
    "type":         type,
    "revision":     revision,
    "state":        state,
    "owner":        owner,
    "organization": organization,
    "collabspace":  collabspace,
    "created":      created,
    "modified":     modified,
    "_hasChildren": true
  }
  ```

**`row-expand`** (type: `rowExpand`):
- `triggerOnExpand`: `true`
- `childApiNodeId`: `"child-expand-api"`
- `childKeyExpr`: `"$:$row.id"`
- `childQueryParam`: `"nodeId"`
- `maxDepth`: `10`

**`columns`** (type: `column`):
Same fields as Search table (same column definitions, no `actionNodeId`).

**`child-expand-api`** (type: `api`, **lazy**):
- Identical config to `root-api` — same URL template, same body, same responseTransform.
- `$params.nodeId` is injected by `RowExpandNodeExecutor` via `childQueryParam: "nodeId"`.

**Edges:**
```
root-api → row-expand
row-expand → columns
```
**`rootNodeId`:** `"columns"`

### Features

```ts
{
  sorting:           { enabled: true },
  filtering:         { enabled: true },
  columnResizing:    { enabled: true },
  columnVisibility:  { enabled: true },
  selection:         { enabled: true, mode: "multi" },
}
```

---

## Xen Component Rewrite

**Location:** `src/features/xen/components/xen.tsx`

### State

```ts
const [searchStr, setSearchStr]       = useState("")
const [debouncedSearch, setDebounced] = useState("") // 300 ms debounce
const [nodeId, setNodeId]             = useState<string | null>(null)
```

### Dropzone

`use3dxDropZone<HTMLDivElement>` ref wraps the entire Xen div. On drop: `setNodeId(items[0]?.objectId ?? null)`.

Visual feedback: `isDragOver` state adds a subtle highlight ring on the outer container.

### Layout

```
<div ref={dropRef} className="...">            ← dropzone target (whole widget)
  <Tabs defaultValue="search">
    <TabsList>
      <TabsTrigger value="search">Search</TabsTrigger>
      <TabsTrigger value="expand">Expand</TabsTrigger>
    </TabsList>

    <TabsContent value="search">
      <Input placeholder="Search engineering items…"
             value={searchStr} onChange={...} />   ← debounced → debouncedSearch
      <ConfiguredTable config={engSearchConfig}
                       params={{ searchStr: debouncedSearch }}
                       className="h-full" />
    </TabsContent>

    <TabsContent value="expand">
      {nodeId
        ? <ConfiguredTable config={engExpandConfig}
                           params={{ nodeId }}
                           className="h-full" />
        : <EmptyState message="Drop an Engineering Item to explore its structure" />
      }
    </TabsContent>
  </Tabs>
</div>
```

### Empty state

Simple centred text with a `MousePointerClick` lucide icon (no custom component needed — inline JSX in Xen).

---

## Files to Delete

- `src/features/xen/configs/ebom.config.ts`
- `src/features/xen/configs/mbom.config.ts`

---

## Files to Create / Modify

| File | Action |
|------|--------|
| `src/components/data-grid/table-engine/hooks/use-dag-table.ts` | Add `params` arg |
| `src/components/data-grid/table-engine/configured-table.tsx` | Add `params` prop |
| `src/components/data-grid/table-engine/nodes/api-node.ts` | Offset pagination nextPage |
| `src/components/data-grid/table-engine/types/table.types.ts` | Add `nextPage` to `ApiNodeOutput` (already present), confirm `paginationConfig` shape |
| `src/features/xen/configs/eng-search.config.ts` | Create |
| `src/features/xen/configs/eng-expand.config.ts` | Create |
| `src/features/xen/components/xen.tsx` | Rewrite |

---

## Verification

- `npx tsc --noEmit` — no type errors
- `npm run build` — clean build
- `npx vitest run` — all existing tests pass (no new tests required for config files; engine changes are small and backward-compatible)
- Biome check clean
