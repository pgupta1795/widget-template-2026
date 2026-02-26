# Debug & Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 8 bugs/issues: critical `expandLevel` empty-string API failure, admin-tab reorder index bug, 4 unused-button UI fixes, Shadcn Table reuse in DataTable, timeout mismatch, and Vite cache-busting `?v=` plugin.

**Architecture:** All changes are surgical — no new abstractions. Fixes target individual files without restructuring. The cache-busting feature is a self-contained Vite plugin in `vite.config.ts`.

**Tech Stack:** React 19, TanStack Query v5, Vite 6, TypeScript, Shadcn/ui (base-ui), Tailwind v4, Biome.

---

### Task 1: Fix `expandLevel` empty string — `object-header.tsx`

**Files:**
- Modify: `src/features/object-header/object-header.tsx:32-34`

**Context:**
`createQueryOptions` builds a React Query key as `[endpoint.id, params]`. The header currently passes `{ objectId }` (shorthand for `{ objectId: theId }`). But `ZONE_QUERY`'s payload template uses `{{physicalId}}` and `{{expandLevel}}`. Both keys are absent → `interpolatePayload` falls back to `""` → API receives `root_path_physicalid: [""]` and `expand_iter: ""` → failure on every call.

Fix passes `{ physicalId: objectId, objectId, expandLevel: "1" }` which matches the exact same key the table uses → React Query returns cached data, zero duplicate API call.

**Step 1: Open the file and locate the query**

File: `src/features/object-header/object-header.tsx`

Find this block (around line 32):
```tsx
const { data, isLoading } = useQuery(
    createQueryOptions(config.endpoint, { objectId }, { single: true }),
);
```

**Step 2: Replace with correct params**

```tsx
const { data, isLoading } = useQuery(
    createQueryOptions(
        config.endpoint,
        { physicalId: objectId, objectId, expandLevel: "1" },
        { single: true },
    ),
);
```

**Step 3: Verify no TypeScript errors**

Run: `npm run check`
Expected: No errors related to this file.

**Step 4: Commit**

```bash
git add src/features/object-header/object-header.tsx
git commit -m "fix: pass correct physicalId and expandLevel params in ObjectHeader query

Previously passed { objectId } only, causing expand_iter: '' in ZONE_QUERY
payload which failed on every header load. Now matches table params exactly,
sharing the React Query cache with no duplicate API call."
```

---

### Task 2: Fix admin tab reorder index bug — `admin-tab.tsx`

**Files:**
- Modify: `src/features/tab-manager/admin-tab.tsx:13-18`

**Context:**
`AdminTab` renders `tabs.filter(t => !t.adminOnly)` — a filtered subset. The `index` parameter in `moveTab` comes from `.map((tab, index) => ...)` over this **filtered** array. But `moveTab` computes `newOrder` from the full `tabs` array (`tabs.map(t => t.id)`). If an adminOnly tab sits before regular tabs in the array (e.g. `[adminTab, tab1, tab2]`), then filtered-index `0` refers to `tab1` but `tabs[0]` is `adminTab` — wrong element moved.

**Step 1: Open the file**

File: `src/features/tab-manager/admin-tab.tsx`

**Step 2: Replace `moveTab` implementation**

Find:
```ts
const moveTab = (index: number, direction: -1 | 1) => {
    const newOrder = tabs.map((t) => t.id);
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(index + direction, 0, moved);
    onReorder(newOrder);
};
```

Replace with:
```ts
const moveTab = (index: number, direction: -1 | 1) => {
    const nonAdmin = tabs.filter((t) => !t.adminOnly);
    const newOrder = nonAdmin.map((t) => t.id);
    const [moved] = newOrder.splice(index, 1);
    newOrder.splice(index + direction, 0, moved);
    onReorder(newOrder);
};
```

**Step 3: Verify no TypeScript errors**

Run: `npm run check`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/features/tab-manager/admin-tab.tsx
git commit -m "fix: admin tab reorder now operates on filtered non-admin tab array

moveTab used index from filtered array but spliced from full tabs array,
causing wrong tab to move when adminOnly tabs existed before regular tabs."
```

---

### Task 3: Fix ObjectHeader — Shadcn buttons + wire Refresh

**Files:**
- Modify: `src/features/object-header/object-header.tsx`

**Context:**
Four native `<button>` elements (Search, Refresh, Settings, Help) have no `onClick` and bypass Shadcn's `Button` component. Replace with Shadcn `Button` (variant="ghost", size="icon-sm"). Wire the Refresh button to `useQueryClient().invalidateQueries({ queryKey: [config.endpoint.id] })` so it forces a fresh API call.

The `useQueryClient` hook is from `@tanstack/react-query` (already in the project).

**Step 1: Add `useQueryClient` import**

Find the existing imports in `src/features/object-header/object-header.tsx`:
```tsx
import { useQuery } from "@tanstack/react-query";
```

Replace with:
```tsx
import { useQuery, useQueryClient } from "@tanstack/react-query";
```

**Step 2: Add queryClient inside the component**

In the `ObjectHeader` function body, after the destructured props, add:
```tsx
const queryClient = useQueryClient();
```

Place it right after the opening brace of `ObjectHeader`, before the `useQuery` call.

**Step 3: Replace the 4 native buttons with Shadcn Button**

Find the entire "Right-side action icons" block (lines ~158–188):
```tsx
{/* Right-side action icons */}
<div className="flex items-center gap-1 shrink-0">
    <button
        type="button"
        aria-label="Search"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
    >
        <Search className="size-4" />
    </button>
    <button
        type="button"
        aria-label="Refresh"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
    >
        <RefreshCw className="size-4" />
    </button>
    <button
        type="button"
        aria-label="Settings"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
    >
        <Settings className="size-4" />
    </button>
    <button
        type="button"
        aria-label="Help"
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
    >
        <HelpCircle className="size-4" />
    </button>
</div>
```

Replace with:
```tsx
{/* Right-side action icons */}
<div className="flex items-center gap-0.5 shrink-0">
    <Button variant="ghost" size="icon-sm" aria-label="Search">
        <Search className="size-4" />
    </Button>
    <Button
        variant="ghost"
        size="icon-sm"
        aria-label="Refresh"
        onClick={() =>
            queryClient.invalidateQueries({
                queryKey: [config.endpoint.id],
            })
        }
    >
        <RefreshCw className="size-4" />
    </Button>
    <Button variant="ghost" size="icon-sm" aria-label="Settings">
        <Settings className="size-4" />
    </Button>
    <Button variant="ghost" size="icon-sm" aria-label="Help">
        <HelpCircle className="size-4" />
    </Button>
</div>
```

**Step 4: Add Button import**

Find the import for `Badge`:
```tsx
import { Badge } from "@/components/ui/badge";
```

Add `Button` to the UI imports (separate line or add to same area):
```tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
```

**Step 5: Verify**

Run: `npm run check`
Expected: No errors.

**Step 6: Commit**

```bash
git add src/features/object-header/object-header.tsx
git commit -m "fix: replace native buttons with Shadcn Button in ObjectHeader, wire Refresh

Four native <button> elements had no onClick and bypassed the design system.
Replaced with Button variant=ghost size=icon-sm. Refresh now invalidates
the endpoint query key forcing a fresh data fetch."
```

---

### Task 4: Remove hardcoded button from DropZone

**Files:**
- Modify: `src/features/drop-zone/drop-zone.tsx`

**Context:**
The DropZone empty state contains a hardcoded "Start with New Product" button with no `onClick` handler and no config support. It's dead UI. Also the `or` divider above it is only meaningful when there's an action button — remove both.

**Step 1: Open the file**

File: `src/features/drop-zone/drop-zone.tsx`

**Step 2: Remove the OR divider and the button**

Find this block:
```tsx
<div className="flex w-full items-center gap-3">
    <div className="h-px flex-1 bg-border" />
    <span className="text-xs text-muted-foreground">or</span>
    <div className="h-px flex-1 bg-border" />
</div>
<button
    type="button"
    className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
>
    Start with New Product
</button>
```

Delete both blocks entirely. The empty state should end after the message/acceptTypes text.

**Step 3: Verify**

Run: `npm run check`
Expected: No errors. The Upload icon and message text should remain; only the OR divider + button are removed.

**Step 4: Commit**

```bash
git add src/features/drop-zone/drop-zone.tsx
git commit -m "fix: remove hardcoded non-functional button from DropZone empty state

'Start with New Product' had no onClick handler and was hardcoded text
not backed by any config option. Removed alongside the orphaned or-divider."
```

---

### Task 5: Wire TableToolbar action buttons

**Files:**
- Modify: `src/features/data-table/table-toolbar.tsx`
- Modify: `src/features/data-table/data-table.tsx`
- Modify: `src/features/widget-shell/tab-content-renderer.tsx`

**Context:**
Toolbar `actions` (configured in `ToolbarConfig.actions[]`) render as buttons but have no `onClick`. Fix: add `onAction?: (actionId: string) => void` through the component chain — toolbar → DataTable → TabContentRenderer. In `TabContentRenderer`, the "refresh" action id maps to `refetch()`.

**Step 1: Update `TableToolbarProps` and add onClick**

File: `src/features/data-table/table-toolbar.tsx`

Find:
```tsx
type TableToolbarProps = {
    config?: ToolbarConfig;
    globalFilter: string;
    onGlobalFilterChange: (value: string) => void;
    totalItems: number;
    selectedItems: number;
};
```

Replace with:
```tsx
type TableToolbarProps = {
    config?: ToolbarConfig;
    globalFilter: string;
    onGlobalFilterChange: (value: string) => void;
    totalItems: number;
    selectedItems: number;
    onAction?: (actionId: string) => void;
};
```

Find the function signature:
```tsx
export function TableToolbar({
    config,
    globalFilter,
    onGlobalFilterChange,
    totalItems,
    selectedItems,
}: TableToolbarProps) {
```

Replace with:
```tsx
export function TableToolbar({
    config,
    globalFilter,
    onGlobalFilterChange,
    totalItems,
    selectedItems,
    onAction,
}: TableToolbarProps) {
```

Find the action button render (the Button inside the actions map):
```tsx
{config?.actions?.map((action) => (
    <Button
        key={action.id}
        variant={action.variant ?? "ghost"}
        size="sm"
        className="h-7 text-xs text-muted-foreground hover:text-foreground"
    >
        {action.label}
    </Button>
))}
```

Replace with:
```tsx
{config?.actions?.map((action) => (
    <Button
        key={action.id}
        variant={action.variant ?? "ghost"}
        size="sm"
        className="h-7 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => onAction?.(action.id)}
    >
        {action.label}
    </Button>
))}
```

**Step 2: Thread `onToolbarAction` through DataTable**

File: `src/features/data-table/data-table.tsx`

Find `DataTableProps`:
```tsx
type DataTableProps = {
    config: TableConfig;
    data: RowData[];
    isLoading?: boolean;
    onCommand?: (command: CommandDefinition, row: RowData) => void;
    className?: string;
};
```

Replace with:
```tsx
type DataTableProps = {
    config: TableConfig;
    data: RowData[];
    isLoading?: boolean;
    onCommand?: (command: CommandDefinition, row: RowData) => void;
    onToolbarAction?: (actionId: string) => void;
    className?: string;
};
```

Find the `DataTable` function signature:
```tsx
export function DataTable({
    config,
    data,
    isLoading,
    onCommand,
    className,
}: DataTableProps) {
```

Replace with:
```tsx
export function DataTable({
    config,
    data,
    isLoading,
    onCommand,
    onToolbarAction,
    className,
}: DataTableProps) {
```

Find the `TableToolbar` usage inside DataTable's return:
```tsx
<TableToolbar
    config={config.toolbar}
    globalFilter={globalFilter}
    onGlobalFilterChange={setGlobalFilter}
    totalItems={data.length}
    selectedItems={Object.keys(rowSelection).length}
/>
```

Replace with:
```tsx
<TableToolbar
    config={config.toolbar}
    globalFilter={globalFilter}
    onGlobalFilterChange={setGlobalFilter}
    totalItems={data.length}
    selectedItems={Object.keys(rowSelection).length}
    onAction={onToolbarAction}
/>
```

**Step 3: Pass `refetch` in TabContentRenderer**

File: `src/features/widget-shell/tab-content-renderer.tsx`

Find the `TableTabContent` component props type:
```tsx
type TableTabContentProps = {
    tableConfig: TableConfig;
    endpoint: EndpointDefinition | undefined;
    params: Record<string, string>;
    onCommand: (command: CommandDefinition, row: Record<string, unknown>) => void;
};
```

Replace with:
```tsx
type TableTabContentProps = {
    tableConfig: TableConfig;
    endpoint: EndpointDefinition | undefined;
    params: Record<string, string>;
    onCommand: (command: CommandDefinition, row: Record<string, unknown>) => void;
};
```
(No change to the type — `refetch` is handled internally.)

Find `TableTabContent` function body:
```tsx
function TableTabContent({
    tableConfig,
    endpoint,
    params,
    onCommand,
}: TableTabContentProps) {
    const { data, isLoading } = useTableData(endpoint, params);

    return (
        <DataTable
            config={tableConfig}
            data={data}
            isLoading={isLoading}
            onCommand={onCommand}
        />
    );
}
```

Replace with:
```tsx
function TableTabContent({
    tableConfig,
    endpoint,
    params,
    onCommand,
}: TableTabContentProps) {
    const { data, isLoading, refetch } = useTableData(endpoint, params);

    return (
        <DataTable
            config={tableConfig}
            data={data}
            isLoading={isLoading}
            onCommand={onCommand}
            onToolbarAction={(actionId) => {
                if (actionId === "refresh") {
                    refetch();
                }
            }}
        />
    );
}
```

**Step 4: Verify**

Run: `npm run check`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/features/data-table/table-toolbar.tsx src/features/data-table/data-table.tsx src/features/widget-shell/tab-content-renderer.tsx
git commit -m "fix: wire TableToolbar action buttons — Refresh now calls refetch()

Toolbar action buttons had onClick missing. Added onAction callback chain:
toolbar → DataTable → TabContentRenderer. 'refresh' action id maps to
useTableData's refetch function."
```

---

### Task 6: Use Shadcn Table components in DataTable

**Files:**
- Modify: `src/features/data-table/data-table.tsx`

**Context:**
`data-table.tsx` uses raw `<table>/<thead>/<tbody>/<tr>/<th>/<td>`. The project has Shadcn `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableHead`, `TableCell` in `@/components/ui/table`. Replace for consistent styling — Shadcn's `Table` wraps in an `overflow-x-auto` container, `TableRow` applies hover/selected states via `data-[state=selected]`, `TableHead` normalizes header padding.

Key mapping:
- `<table className="w-full text-xs">` → `<Table>`
- `<thead>` → `<TableHeader>`
- `<tbody>` → `<TableBody>`
- `<tr key={...} className="border-b bg-[#F3F4F6]">` → `<TableRow className="bg-[#F3F4F6] hover:bg-[#F3F4F6]">` (header row, no hover)
- `<th className="h-8 px-3 text-left font-medium text-muted-foreground ...">` → `<TableHead className="h-8 px-3 text-muted-foreground font-medium ...">`
- `<tr key={...} className="border-b transition-colors hover:bg-muted/50 ...">` → `<TableRow data-state={row.getIsSelected() ? "selected" : undefined} className="transition-colors">`
- `<td className="h-8 px-3">` → `<TableCell className="h-8 px-3 py-0">`
- Remove the manual `<div className="overflow-auto">` wrapper — Shadcn's Table includes it

**Step 1: Add Table imports**

Find existing imports at top of `src/features/data-table/data-table.tsx`:
```tsx
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
```

Add after the Skeleton import:
```tsx
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
```

**Step 2: Replace the table markup**

Find the entire render block starting with `<div className="overflow-auto">` down to its closing `</div>` (the one wrapping `<table>`):

```tsx
<div className="overflow-auto">
    <table className="w-full text-xs">
        <thead>
            {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-[#F3F4F6]">
                    {headerGroup.headers.map((header) => (
                        <th
                            key={header.id}
                            className={cn(
                                "h-8 px-3 text-left font-medium text-muted-foreground",
                                header.column.getCanSort() &&
                                    "cursor-pointer select-none",
                            )}
                            style={{ width: header.getSize() }}
                            onClick={header.column.getToggleSortingHandler()}
                        >
                            <div className="flex items-center gap-1">
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                            header.column.columnDef.header,
                                            header.getContext(),
                                        )}
                                {header.column.getCanSort() && (
                                    <ArrowUpDown className="size-3 text-muted-foreground/50" />
                                )}
                            </div>
                        </th>
                    ))}
                </tr>
            ))}
        </thead>
        <tbody>
            {table.getRowModel().rows.length === 0 ? (
                <tr>
                    <td
                        colSpan={columns.length}
                        className="h-24 text-center text-muted-foreground"
                    >
                        No results.
                    </td>
                </tr>
            ) : (
                table.getRowModel().rows.map((row) => (
                    <tr
                        key={row.id}
                        className={cn(
                            "border-b transition-colors hover:bg-muted/50",
                            row.getIsSelected() && "bg-muted",
                        )}
                    >
                        {row.getVisibleCells().map((cell) => (
                            <td key={cell.id} className="h-8 px-3">
                                {flexRender(
                                    cell.column.columnDef.cell,
                                    cell.getContext(),
                                )}
                            </td>
                        ))}
                    </tr>
                ))
            )}
        </tbody>
    </table>
</div>
```

Replace with:
```tsx
<Table>
    <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
            <TableRow
                key={headerGroup.id}
                className="bg-[#F3F4F6] hover:bg-[#F3F4F6]"
            >
                {headerGroup.headers.map((header) => (
                    <TableHead
                        key={header.id}
                        className={cn(
                            "h-8 px-3 text-muted-foreground font-medium",
                            header.column.getCanSort() &&
                                "cursor-pointer select-none",
                        )}
                        style={{ width: header.getSize() }}
                        onClick={header.column.getToggleSortingHandler()}
                    >
                        <div className="flex items-center gap-1">
                            {header.isPlaceholder
                                ? null
                                : flexRender(
                                        header.column.columnDef.header,
                                        header.getContext(),
                                    )}
                            {header.column.getCanSort() && (
                                <ArrowUpDown className="size-3 text-muted-foreground/50" />
                            )}
                        </div>
                    </TableHead>
                ))}
            </TableRow>
        ))}
    </TableHeader>
    <TableBody>
        {table.getRowModel().rows.length === 0 ? (
            <TableRow>
                <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                >
                    No results.
                </TableCell>
            </TableRow>
        ) : (
            table.getRowModel().rows.map((row) => (
                <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() ? "selected" : undefined}
                    className="transition-colors"
                >
                    {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} className="h-8 px-3 py-0">
                            {flexRender(
                                cell.column.columnDef.cell,
                                cell.getContext(),
                            )}
                        </TableCell>
                    ))}
                </TableRow>
            ))
        )}
    </TableBody>
</Table>
```

**Step 3: Verify**

Run: `npm run check`
Expected: No errors.

**Step 4: Commit**

```bash
git add src/features/data-table/data-table.tsx
git commit -m "refactor: use Shadcn Table components in DataTable

Replaces raw <table>/<thead>/<tbody>/<tr>/<th>/<td> with Table, TableHeader,
TableBody, TableRow, TableHead, TableCell from @/components/ui/table.
Removes manual overflow-auto wrapper (included in Shadcn Table container).
Selected row state now uses data-state attribute per Shadcn convention."
```

---

### Task 7: Fix `waitFor` timeout in `main.tsx`

**Files:**
- Modify: `src/main.tsx:64`

**Context:**
`waitFor(() => window.widget != null, 1000)` sets a 1-second timeout. The catch block logs "Widget not available after 10s timeout" — mismatch. Increase timeout to `10000` (10 seconds) to match the message and give slower environments a chance.

**Step 1: Update the timeout value**

File: `src/main.tsx`

Find:
```ts
waitFor(() => window.widget != null, 1000)
```

Replace with:
```ts
waitFor(() => window.widget != null, 10000)
```

**Step 2: Verify**

Run: `npm run check`
Expected: No errors.

**Step 3: Commit**

```bash
git add src/main.tsx
git commit -m "fix: increase widget waitFor timeout from 1s to 10s to match error message

Error catch said '10s timeout' but actual timeout was 1000ms (1s).
Changed to 10000ms so slower platforms have enough time to provide window.widget."
```

---

### Task 8: Vite cache-busting `?v=` plugin

**Files:**
- Modify: `vite.config.ts`

**Context:**
3DDashboard may cache `index.html` and serve stale JS/CSS references. A build-time Vite plugin appends `?v=<Date.now().toString(36)>` to all script `src` and stylesheet `href` values in the generated `index.html`. Vite's default content-hashed filenames are preserved — the `?v=` param is additional.

The plugin uses the `transformIndexHtml` hook, scoped to `apply: 'build'` so it never runs in dev mode. It targets only relative paths (not `https://` or `//` external URLs) and only CSS link tags (ignores `<link rel="modulepreload">` etc.).

**Step 1: Add the plugin function to `vite.config.ts`**

File: `vite.config.ts`

Add the plugin function before `export default defineConfig(...)`. Insert after the existing imports:

```ts
import type { Plugin } from 'vite'

function cacheVersionPlugin(): Plugin {
  const version = Date.now().toString(36)
  return {
    name: 'cache-version',
    apply: 'build',
    transformIndexHtml(html) {
      return html
        .replace(
          /(<script[^>]+\bsrc=["'])([^"'?]+)(["'])/g,
          `$1$2?v=${version}$3`,
        )
        .replace(
          /(<link[^>]+\brel=["']stylesheet["'][^>]+\bhref=["'])([^"'?]+)(["'])/g,
          `$1$2?v=${version}$3`,
        )
        .replace(
          /(<link[^>]+\bhref=["'])([^"'?]+\.css)(["'][^>]*>)/g,
          `$1$2?v=${version}$3`,
        )
    },
  }
}
```

**Step 2: Register the plugin in the plugins array**

Find:
```ts
plugins: [
    tanstackRouter({
```

Replace with:
```ts
plugins: [
    cacheVersionPlugin(),
    tanstackRouter({
```

**Step 3: Verify TypeScript compiles**

Run: `npm run build`
Expected: Build succeeds. Check `dist/index.html` — script `src` and link `href` values should end with `?v=<alphanumeric>`.

Verify manually:
```bash
grep -E '\?v=' dist/index.html
```
Expected: At least one match showing `?v=` appended.

**Step 4: Commit**

```bash
git add vite.config.ts
git commit -m "feat: add cache-busting ?v=<timestamp> to JS/CSS assets in built index.html

Adds cacheVersionPlugin() that runs only during build (apply: 'build').
Appends ?v=<Date.now().toString(36)> to script src and stylesheet href
in the generated index.html. Vite's existing content-hashed filenames
are preserved — the ?v param is additional for platform-level cache busting."
```

---

## Summary of All Files Changed

| Task | File | Type |
|------|------|------|
| 1 | `src/features/object-header/object-header.tsx` | Bug fix |
| 2 | `src/features/tab-manager/admin-tab.tsx` | Bug fix |
| 3 | `src/features/object-header/object-header.tsx` | UI fix + Shadcn |
| 4 | `src/features/drop-zone/drop-zone.tsx` | UI fix |
| 5 | `src/features/data-table/table-toolbar.tsx` | UI fix |
| 5 | `src/features/data-table/data-table.tsx` | UI fix |
| 5 | `src/features/widget-shell/tab-content-renderer.tsx` | UI fix |
| 6 | `src/features/data-table/data-table.tsx` | Shadcn reuse |
| 7 | `src/main.tsx` | Bug fix |
| 8 | `vite.config.ts` | New feature |

Note: Tasks 1 and 3 both modify `object-header.tsx` — implement them in order, committing between them.
