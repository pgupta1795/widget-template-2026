# Xen Engineering Tables Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the eBOM/mBOM tabs in the Xen component with two Engineering Item tables: an infinite-scroll search table and a drop-driven tree expand table.

**Architecture:** Two small engine enhancements (params injection + offset pagination) enable purely declarative DAGTableConfig objects for both tables. Xen holds minimal UI state (searchStr, droppedNodeId) and passes it to `ConfiguredTable` via a new `params` prop.

**Tech Stack:** React 19, TanStack Query v5, TanStack Table v8, DAG Table Engine (custom), JSONata, `use3dxDropZone` hook, shadcn/ui Tabs + Input, lucide-react

---

## Chunk 1: Engine — `params` prop + offset pagination

### Task 1: Offset pagination — failing tests

**Files:**
- Modify: `src/components/data-grid/table-engine/__tests__/api-node.test.ts`

- [ ] **Step 1: Add two failing tests for `ApiNodeExecutor` offset pagination**

Append to `src/components/data-grid/table-engine/__tests__/api-node.test.ts`:

```typescript
it("computes nextPage when paginationConfig is offset and rows fills the page", async () => {
	const rows = Array.from({ length: 50 }, (_, i) => ({ id: String(i) }));
	const { registry } = makeAuth(rows);
	const ctx = new NodeContext().withParams({ cursor: "50" });
	const result = await new ApiNodeExecutor(registry).execute(
		{
			url: "/items",
			method: "GET",
			authAdapterId: "test",
			queryParams: { $top: "50", $skip: "$:$params.cursor" },
			paginationConfig: { type: "offset", pageParam: "$skip", pageSizeParam: "$top" },
		},
		ctx,
		[],
	);
	expect(result.nextPage).toBe("100");
});

it("returns nextPage null when rows count is less than page size", async () => {
	const rows = Array.from({ length: 30 }, (_, i) => ({ id: String(i) }));
	const { registry } = makeAuth(rows);
	const result = await new ApiNodeExecutor(registry).execute(
		{
			url: "/items",
			method: "GET",
			authAdapterId: "test",
			queryParams: { $top: "50", $skip: "0" },
			paginationConfig: { type: "offset", pageParam: "$skip", pageSizeParam: "$top" },
		},
		new NodeContext(),
		[],
	);
	expect(result.nextPage).toBeNull();
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/api-node.test.ts
```

Expected: 2 new tests FAIL — `result.nextPage` is `undefined`, not `"100"` / `null`.

---

### Task 2: Offset pagination — implementation

**Files:**
- Modify: `src/components/data-grid/table-engine/nodes/api-node.ts`

- [ ] **Step 3: Implement offset nextPage computation in `ApiNodeExecutor.execute`**

In `api-node.ts`, after the `rows` array is built (just before `return { rows }`), add:

```typescript
		// 6. Compute nextPage for offset pagination
		let nextPage: string | null | undefined;
		if (config.paginationConfig?.type === "offset") {
			const { pageParam, pageSizeParam } = config.paginationConfig;
			const currentSkip = parseInt(queryParams[pageParam] ?? "0", 10);
			const pageSize = parseInt(queryParams[pageSizeParam] ?? "50", 10);
			nextPage = rows.length >= pageSize ? String(currentSkip + pageSize) : null;
		}

		return { rows, nextPage };
```

> `queryParams` is the `Record<string, string>` already built in step 2 of the executor, containing resolved values for `$skip` and `$top`.

- [ ] **Step 4: Run tests — both new tests must pass, no regressions**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/api-node.test.ts
```

Expected: all tests PASS (7 total).

---

### Task 3: `params` arg on `useDAGTable` — failing test

**Files:**
- Modify: `src/components/data-grid/table-engine/__tests__/use-dag-table.test.ts`

- [ ] **Step 5: Add a failing test for params injection**

Append to `use-dag-table.test.ts` inside the existing `describe` block:

```typescript
it("injects params into NodeContext so $params.* resolves in API URL", async () => {
	const paramConfig: DAGTableConfig = {
		tableId: "test-params",
		mode: "flat",
		dag: {
			nodes: [
				{
					id: "api1",
					type: "api",
					config: {
						url: '$:"/items/" & $params.rootId',
						method: "GET",
						authAdapterId: "wafdata",
					},
				},
				{
					id: "cols",
					type: "column",
					config: { columns: [{ field: "id", header: "ID" }] },
				},
			],
			edges: [{ from: "api1", to: "cols" }],
			rootNodeId: "cols",
		},
	};
	mockExecute.mockResolvedValue(twoRowResponse);
	const engine = createDefaultEngine();
	const { result } = renderHook(
		() => useDAGTable(paramConfig, engine, { rootId: "ABC" }),
		{ wrapper: makeWrapper() },
	);
	await waitFor(() => expect(result.current.isLoading).toBe(false));
	expect(mockExecute).toHaveBeenCalledWith(
		expect.objectContaining({ url: "/items/ABC" }),
	);
});
```

- [ ] **Step 6: Run test to confirm it fails**

```bash
npx vitest run src/components/data-grid/table-engine/__tests__/use-dag-table.test.ts
```

Expected: new test FAILS — `useDAGTable` doesn't accept a third argument yet, so `$params.rootId` is undefined and URL resolves to `"/items/"`.

---

### Task 4: `params` arg — implementation

**Files:**
- Modify: `src/components/data-grid/table-engine/hooks/use-dag-table.ts`
- Modify: `src/components/data-grid/table-engine/configured-table.tsx`

- [ ] **Step 7: Add `params` to `useDAGTable` signature and both query functions**

In `use-dag-table.ts`:

1. Change the function signature:
```typescript
export function useDAGTable(
	config: DAGTableConfig,
	engine: DAGEngine,
	params: Record<string, JsonPrimitive> = {},
): DAGTableResult {
```

2. In the `flatQuery` `queryKey`, add params so changing params triggers a re-fetch:
```typescript
queryKey: [tableId, mode, pageIndex, params],
```

3. In the `flatQuery` `queryFn`, merge `params` into `initialParams`:
```typescript
const initialParams: Record<string, JsonPrimitive> =
    mode === "paginated"
        ? { ...params, pageIndex: String(pageIndex), pageSize: String(pageSize) }
        : { ...params };
```

4. In the `infiniteQuery` `queryKey`:
```typescript
queryKey: [tableId, "infinite", params],
```

5. In the `infiniteQuery` `queryFn`, merge `params` into the context:
```typescript
const ctx = new NodeContext().withParams(
    pageParam ? { ...params, cursor: pageParam } : { ...params },
);
```

- [ ] **Step 8: Add `params` prop to `ConfiguredTable`**

In `configured-table.tsx`, update the interface and component:

```typescript
export interface ConfiguredTableProps {
  config: DAGTableConfig
  className?: string
  params?: Record<string, JsonPrimitive>
}

export function ConfiguredTable({ config, className, params }: ConfiguredTableProps) {
  const engine = useMemo(() => createDefaultEngine(), [])

  const {
    data,
    columns,
    columnVisibility,
    isLoading,
    error,
    isFetchingNextPage,
    onExpand,
  } = useDAGTable(config, engine, params)
  // ... rest unchanged
```

Add the import for `JsonPrimitive` at the top:
```typescript
import type { JsonPrimitive } from './types/dag.types'
```

- [ ] **Step 9: Run all engine tests — must all pass**

```bash
npx vitest run src/components/data-grid/table-engine/
```

Expected: all tests PASS (including the new params test).

- [ ] **Step 10: Commit Chunk 1**

```bash
git add src/components/data-grid/table-engine/nodes/api-node.ts \
        src/components/data-grid/table-engine/hooks/use-dag-table.ts \
        src/components/data-grid/table-engine/configured-table.tsx \
        src/components/data-grid/table-engine/__tests__/api-node.test.ts \
        src/components/data-grid/table-engine/__tests__/use-dag-table.test.ts
git commit -m "feat(table-engine): add params prop to ConfiguredTable/useDAGTable, offset pagination nextPage"
```

---

## Chunk 2: New DAGTableConfig files

### Task 5: `eng-search.config.ts`

**Files:**
- Create: `src/features/xen/configs/eng-search.config.ts`

- [ ] **Step 11: Create the search config**

Create `src/features/xen/configs/eng-search.config.ts`:

```typescript
// src/features/xen/configs/eng-search.config.ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

/**
 * Engineering Item search table config.
 *
 * DAG structure (all initial-wave):
 *   root-api → columns
 *
 * Runtime params (injected via ConfiguredTable.params):
 *   searchStr — bound to the $searchStr query parameter
 *   cursor    — injected by useDAGTable infinite query for offset pagination
 */
export const engSearchConfig: DAGTableConfig = {
	tableId: "eng-search",
	mode: "infinite",

	dag: {
		nodes: [
			{
				id: "root-api",
				type: "api",
				config: {
					url: "/resources/v1/modeler/dseng/dseng:EngItem/search",
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: {
						$searchStr: "$:$params.searchStr ?? \"\"",
						$top: "50",
						$skip: "$:$exists($params.cursor) ? $params.cursor : \"0\"",
						$mask: "dskern:Mask.Default",
					},
					paginationConfig: {
						type: "offset",
						pageParam: "$skip",
						pageSizeParam: "$top",
					},
					responseTransform: `
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
          `,
				},
			},

			{
				id: "columns",
				type: "column",
				config: {
					columns: [
						{ field: "name", header: "Name", sortable: true, filterable: true },
						{ field: "title", header: "Title", sortable: true, filterable: true },
						{ field: "type", header: "Type" },
						{ field: "revision", header: "Rev" },
						{
							field: "state",
							header: "State",
							renderType: "badge",
						},
						{ field: "owner", header: "Owner" },
						{ field: "organization", header: "Organization" },
						{ field: "collabspace", header: "Collab Space" },
						{ field: "created", header: "Created", type: "date" },
						{ field: "modified", header: "Modified", type: "date" },
					],
				},
			},
		],

		edges: [{ from: "root-api", to: "columns" }],

		rootNodeId: "columns",
	},

	features: {
		sorting: { enabled: true },
		filtering: { enabled: true },
		columnResizing: { enabled: true },
		columnVisibility: { enabled: true },
		selection: { enabled: true, mode: "multi" },
	},
};
```

- [ ] **Step 12: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

---

### Task 6: `eng-expand.config.ts`

**Files:**
- Create: `src/features/xen/configs/eng-expand.config.ts`

- [ ] **Step 13: Create the expand config**

Create `src/features/xen/configs/eng-expand.config.ts`:

```typescript
// src/features/xen/configs/eng-expand.config.ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

/**
 * Engineering Item expand tree config.
 *
 * DAG structure:
 *   Initial-wave: root-api → row-expand → columns
 *   Lazy:         child-expand-api  (triggered by RowExpandNode on row open)
 *
 * Runtime params (injected via ConfiguredTable.params):
 *   nodeId — the engineering item ID whose immediate children to load
 *
 * The RowExpandNodeExecutor re-injects `nodeId` for each expansion,
 * so root-api and child-expand-api share the same URL and responseTransform.
 *
 * responseTransform filters out the expanded node itself (id != $params.nodeId)
 * and keeps only VPMReference items (excludes VPMInstance and Path entries).
 *
 * _hasChildren is set to true for all children. Leaf nodes will show an expand
 * affordance; clicking it fires the API and returns empty rows, collapsing the
 * row. This is a known UX trade-off — the expand API does not expose a child
 * count, so we cannot pre-determine which nodes are leaves.
 */
const EXPAND_URL =
	'$:"/resources/v1/modeler/dseng/dseng:EngItem/" & $params.nodeId & "/expand"';

const EXPAND_RESPONSE_TRANSFORM = `
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
`;

export const engExpandConfig: DAGTableConfig = {
	tableId: "eng-expand",
	mode: "tree",

	dag: {
		nodes: [
			// ─── Initial-wave nodes ───────────────────────────────────────────────

			{
				id: "root-api",
				type: "api",
				config: {
					url: EXPAND_URL,
					method: "POST",
					authAdapterId: "wafdata",
					body: { expandDepth: 1 },
					responseTransform: EXPAND_RESPONSE_TRANSFORM,
				},
			},

			{
				id: "row-expand",
				type: "rowExpand",
				config: {
					triggerOnExpand: true,
					// Lazy node — NOT in edges
					childApiNodeId: "child-expand-api",
					// Evaluates $row.id → injected as $params.nodeId in child context
					childKeyExpr: "$:$row.id",
					childQueryParam: "nodeId",
					maxDepth: 10,
				},
			},

			{
				id: "columns",
				type: "column",
				config: {
					columns: [
						{ field: "name", header: "Name", sortable: true, filterable: true },
						{ field: "title", header: "Title", sortable: true, filterable: true },
						{ field: "type", header: "Type" },
						{ field: "revision", header: "Rev" },
						{
							field: "state",
							header: "State",
							renderType: "badge",
						},
						{ field: "owner", header: "Owner" },
						{ field: "organization", header: "Organization" },
						{ field: "collabspace", header: "Collab Space" },
						{ field: "created", header: "Created", type: "date" },
						{ field: "modified", header: "Modified", type: "date" },
					],
				},
			},

			// ─── Lazy node ────────────────────────────────────────────────────────

			{
				id: "child-expand-api",
				type: "api",
				config: {
					// $params.nodeId is injected by RowExpandNodeExecutor via childQueryParam
					url: EXPAND_URL,
					method: "POST",
					authAdapterId: "wafdata",
					body: { expandDepth: 1 },
					responseTransform: EXPAND_RESPONSE_TRANSFORM,
				},
			},
		],

		edges: [
			{ from: "root-api", to: "row-expand" },
			{ from: "row-expand", to: "columns" },
		],

		rootNodeId: "columns",
	},

	features: {
		sorting: { enabled: true },
		filtering: { enabled: true },
		columnResizing: { enabled: true },
		columnVisibility: { enabled: true },
		selection: { enabled: true, mode: "multi" },
	},
};
```

- [ ] **Step 14: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 15: Commit Chunk 2**

```bash
git add src/features/xen/configs/eng-search.config.ts \
        src/features/xen/configs/eng-expand.config.ts
git commit -m "feat(xen): add eng-search and eng-expand DAGTableConfig objects"
```

---

## Chunk 3: Xen component rewrite + cleanup

### Task 7: Rewrite `xen.tsx`

**Files:**
- Modify: `src/features/xen/components/xen.tsx`
- Delete: `src/features/xen/configs/ebom.config.ts`
- Delete: `src/features/xen/configs/mbom.config.ts`

- [ ] **Step 16: Delete old config files**

```bash
git rm src/features/xen/configs/ebom.config.ts \
       src/features/xen/configs/mbom.config.ts
```

- [ ] **Step 17: Rewrite `xen.tsx`**

Replace the entire contents of `src/features/xen/components/xen.tsx` with:

```typescript
// src/features/xen/components/xen.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { MousePointerClick } from "lucide-react";
import { ConfiguredTable } from "@/components/data-grid/table-engine";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { use3dxDropZone } from "@/hooks/use-3dx-drop-zone";
import { engExpandConfig } from "../configs/eng-expand.config";
import { engSearchConfig } from "../configs/eng-search.config";

/**
 * Xen feature root component.
 *
 * Tab 1 — Search: infinite-scroll Engineering Item search with a debounced
 *   search input. Passes `searchStr` to ConfiguredTable via the `params` prop
 *   so the DAG URL's $params.searchStr resolves correctly.
 *
 * Tab 2 — Expand: tree table driven by the dseng:EngItem expand API.
 *   An Engineering Item must be dropped onto the widget first; its objectId
 *   becomes `nodeId` and is passed to ConfiguredTable via `params`.
 *   Shows an empty-state prompt until an item is dropped.
 */
export function Xen() {
	// ── Search state ────────────────────────────────────────────────────────
	const [searchInput, setSearchInput] = useState("");
	const [searchStr, setSearchStr] = useState("");
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearchInput(e.target.value);
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => {
				setSearchStr(e.target.value);
			}, 300);
		},
		[],
	);

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	// ── Expand / dropzone state ──────────────────────────────────────────────
	const [nodeId, setNodeId] = useState<string | null>(null);

	const { ref: dropRef, isDragOver } = use3dxDropZone<HTMLDivElement>({
		onDrop: (items) => {
			const id = items[0]?.objectId;
			if (id) setNodeId(id);
		},
	});

	// ── Render ───────────────────────────────────────────────────────────────
	return (
		<div
			ref={dropRef}
			className={[
				"flex h-full flex-col overflow-hidden transition-all",
				isDragOver ? "ring-2 ring-primary ring-inset" : "",
			].join(" ")}
		>
			<Tabs defaultValue="search" className="flex h-full flex-col">
				<div className="border-b px-4">
					<TabsList className="mt-3 mb-0 h-9">
						<TabsTrigger value="search" className="text-sm">
							Search
						</TabsTrigger>
						<TabsTrigger value="expand" className="text-sm">
							Expand
						</TabsTrigger>
					</TabsList>
				</div>

				{/* ── Search tab ─────────────────────────────────────────── */}
				<TabsContent
					value="search"
					className="mt-0 flex flex-1 flex-col gap-2 overflow-hidden p-2"
				>
					<Input
						placeholder="Search engineering items…"
						value={searchInput}
						onChange={handleSearchChange}
						className="h-8 text-sm"
					/>
					<div className="min-h-0 flex-1 overflow-hidden">
						<ConfiguredTable
							config={engSearchConfig}
							params={{ searchStr }}
							className="h-full"
						/>
					</div>
				</TabsContent>

				{/* ── Expand tab ─────────────────────────────────────────── */}
				<TabsContent
					value="expand"
					className="mt-0 flex-1 overflow-hidden"
				>
					{nodeId ? (
						<ConfiguredTable
							key={nodeId}
							config={engExpandConfig}
							params={{ nodeId }}
							className="h-full"
						/>
					) : (
						<div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
							<MousePointerClick className="h-8 w-8 opacity-40" />
							<p className="text-sm">
								Drop an Engineering Item to explore its structure
							</p>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
```

- [ ] **Step 18: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 19: Run Biome and fix any formatting issues**

```bash
npx @biomejs/biome check --write src/features/xen/ src/components/data-grid/table-engine/
```

Expected: clean (auto-fixed if any whitespace/quote issues).

- [ ] **Step 20: Run full test suite**

```bash
npx vitest run
```

Expected: all tests pass (≥91 tests).

- [ ] **Step 21: Build**

```bash
npm run build
```

Expected: build succeeds with no TypeScript errors. (Pre-existing chunk-size warning is acceptable.)

- [ ] **Step 22: Commit Chunk 3**

```bash
git add src/features/xen/components/xen.tsx \
        src/features/xen/configs/
git commit -m "feat(xen): replace eBOM/mBOM tabs with Engineering Item search + expand tables"
```

---

## Verification Checklist

After all tasks complete, confirm:

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npx vitest run` — all tests pass
- [ ] `npm run build` — builds cleanly
- [ ] `npx @biomejs/biome check src/` — no lint/format issues
- [ ] `ebom.config.ts` and `mbom.config.ts` no longer exist
- [ ] `eng-search.config.ts` and `eng-expand.config.ts` exist in `src/features/xen/configs/`
- [ ] `ConfiguredTable` accepts `params` prop without type errors
- [ ] `useDAGTable` third argument (`params`) is optional and backward-compatible
