# Debug & Fixes Design — 2026-02-26

## Summary

Eight targeted fixes covering one critical API bug, one logic bug, four UI/unused-button issues, Shadcn component reuse, and a Vite cache-busting feature.

---

## 1. Critical: `expandLevel` empty string (object-header.tsx)

**Root cause:** `createQueryOptions(config.endpoint, { objectId }, { single: true })` only passes `objectId` as a param. ZONE_QUERY requires `physicalId` and `expandLevel` in its payload template (`{{physicalId}}`, `{{expandLevel}}`). Missing keys fall back to `""` in `interpolatePayload`, sending `root_path_physicalid: [""]` and `expand_iter: ""` to the API.

**Fix:** Change header query params to `{ physicalId: objectId, objectId, expandLevel: "1" }`. This matches the table's params exactly, sharing the same React Query cache key — no duplicate API call, and no empty `expand_iter`.

**File:** `src/features/object-header/object-header.tsx:33`

---

## 2. Logic Bug: Admin tab reorder uses wrong index

**Root cause:** `moveTab(index, direction)` receives `index` from the rendered filtered list (`tabs.filter(t => !t.adminOnly)`) but splices from `tabs.map(t => t.id)` (the full array). If any adminOnly tabs precede regular tabs, the wrong tab is moved.

**Fix:** Compute `newOrder` from the filtered-non-admin array only, then call `onReorder`.

**File:** `src/features/tab-manager/admin-tab.tsx:13-18`

---

## 3. UI: Unused buttons in ObjectHeader

**Issue:** Four native `<button>` elements (Search, Refresh, Settings, Help) have no `onClick` handlers and use raw HTML instead of Shadcn `Button`.

**Fix:**
- Replace with `<Button variant="ghost" size="icon-sm">` from Shadcn
- Wire Refresh button to `useQueryClient().invalidateQueries({ queryKey: [config.endpoint.id] })`
- Other buttons remain visual stubs (Search, Settings, Help are placeholders for future features)

**File:** `src/features/object-header/object-header.tsx:159-188`

---

## 4. UI: Hardcoded non-functional button in DropZone

**Issue:** "Start with New Product" button is hardcoded in the DropZone empty state with no `onClick` and no config support.

**Fix:** Remove the hardcoded button and OR/divider line. The DropZone already shows the message and acceptTypes — that's sufficient for the empty state.

**File:** `src/features/drop-zone/drop-zone.tsx:52-63`

---

## 5. UI: TableToolbar action buttons have no onClick

**Issue:** Toolbar `actions` (e.g., "Refresh") render as buttons but have no click handler.

**Fix:**
- Add `onAction?: (actionId: string) => void` to `TableToolbarProps` and call it on click
- Add `onToolbarAction?: (actionId: string) => void` to `DataTableProps`, forward to toolbar
- In `tab-content-renderer.tsx`, pass `refetch` mapped to the "refresh" action id

**Files:** `table-toolbar.tsx`, `data-table.tsx`, `tab-content-renderer.tsx`

---

## 6. Shadcn: Replace raw table HTML with Shadcn Table components

**Issue:** `data-table.tsx` uses raw `<table>/<thead>/<tbody>/<tr>/<th>/<td>` elements directly.

**Fix:** Use `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` from `@/components/ui/table`. Remove the manual `overflow-auto` wrapper (Shadcn's `Table` includes the container).

**File:** `src/features/data-table/data-table.tsx`

---

## 7. Minor: `main.tsx` timeout mismatch

**Issue:** `waitFor(..., 1000)` = 1 second but catch logs "Widget not available after 10s timeout".

**Fix:** Change timeout to `10000` to match the error message.

**File:** `src/main.tsx:64`

---

## 8. Build: Cache-busting version query parameter

**Issue:** 3DDashboard may cache `index.html` and serve stale JS/CSS references.

**Design:** Add a custom Vite plugin (`cacheVersionPlugin`) that runs only during `build`. It uses `transformIndexHtml` to append `?v=<Date.now().toString(36)>` to every `src` on `<script>` tags and every `href` on `<link rel="stylesheet">` tags. Vite's default hashed filenames are preserved — the `?v=` param is added on top.

Example output:
```html
<!-- Before -->
<script type="module" src="./index-BcdEfg12.js"></script>
<link rel="stylesheet" href="./index-Abc123.css">

<!-- After -->
<script type="module" src="./index-BcdEfg12.js?v=lkn7q2fs"></script>
<link rel="stylesheet" href="./index-Abc123.css?v=lkn7q2fs">
```

**File:** `vite.config.ts`

---

## Files Changed

| File | Change |
|------|--------|
| `src/features/object-header/object-header.tsx` | Fix params, Shadcn buttons, wire Refresh |
| `src/features/tab-manager/admin-tab.tsx` | Fix moveTab index bug |
| `src/features/drop-zone/drop-zone.tsx` | Remove hardcoded button |
| `src/features/data-table/table-toolbar.tsx` | Add onAction callback |
| `src/features/data-table/data-table.tsx` | Add onToolbarAction, use Shadcn Table |
| `src/features/widget-shell/tab-content-renderer.tsx` | Pass refetch as toolbar action |
| `src/main.tsx` | Fix timeout 1000 → 10000 |
| `vite.config.ts` | Add cacheVersionPlugin |
