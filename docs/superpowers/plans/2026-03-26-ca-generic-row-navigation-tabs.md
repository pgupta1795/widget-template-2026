# CA Generic Row Navigation + Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the CA detail page ("Content not available" error) and replace hardcoded `row.identifier` in `ca.tsx` with a config-driven `rowNavigation` field on `DAGTableConfig`.

**Architecture:** Add `rowNavigation?: { to, paramField, paramName }` to `DAGTableConfig`; the list config declares navigation intent and the route reads it generically. Create three missing CA config files (`ca-tabs`, `ca-members`, `ca-proposed`) and register them in bootstrap so the detail layout resolves correctly.

**Tech Stack:** TypeScript, React 19, TanStack Router, JSONata (config transforms), Biome (lint/typecheck), Vite

**Verification commands:**
- Lint/typecheck: `npm run check`
- Build: `npm run build`

---

## File Map

| File | Action |
|------|--------|
| `src/components/data-grid/table-engine/types/table.types.ts` | Modify — add `rowNavigation` to `DAGTableConfig` |
| `src/features/layouts/ca/ca-search.config.ts` | Modify — add `rowNavigation` field |
| `src/routes/ca.tsx` | Modify — replace hardcoded `onRowClick` with config-driven version |
| `src/features/layouts/ca/ca-members.config.ts` | **Create** — members table config |
| `src/features/layouts/ca/ca-proposed.config.ts` | **Create** — proposed changes table config |
| `src/features/layouts/ca/ca-tabs.config.ts` | **Create** — tab config referencing the two above |
| `src/features/layouts/bootstrap.ts` | Modify — register 4 new configs (tabs, members, proposed, form) |
| `src/features/layouts/ca/ca-layout.config.ts` | Modify — fix stale `routePath` and file header comment |

---

## Task 1: Add `rowNavigation` to `DAGTableConfig`

**Files:**
- Modify: `src/components/data-grid/table-engine/types/table.types.ts` (line 295–307)

- [ ] **Step 1: Add the `rowNavigation` interface and field**

  Open `src/components/data-grid/table-engine/types/table.types.ts`. Find the `DAGTableConfig` interface (starts around line 295). Add `rowNavigation` above `toolbarCommands`:

  ```ts
  export interface DAGTableConfig {
  	tableId: string;
  	mode: GridMode;
  	dag: DAGConfig;
  	features?: DAGFeaturesConfig;
  	density?: GridDensity;
  	/**
  	 * When set, clicking a row navigates to this route.
  	 * `paramField` is the row field whose value fills `paramName` in the route.
  	 * e.g. { to: "/ca/$nodeId", paramField: "identifier", paramName: "nodeId" }
  	 */
  	rowNavigation?: {
  		/** TanStack Router route pattern, e.g. "/ca/$nodeId" */
  		to: string;
  		/** Field in the row object whose value becomes the route param */
  		paramField: string;
  		/** Route param key, e.g. "nodeId" — must match the $-prefixed segment in `to` */
  		paramName: string;
  	};
  	/**
  	 * Toolbar commands for this table.
  	 * Use action: 'apiNodeId' to wire to a DAG API node.
  	 * Consumer toolbarCommands on ConfiguredTable are merged on top (consumer wins on matching id).
  	 */
  	toolbarCommands?: SerializableToolbarCommand[];
  }
  ```

- [ ] **Step 2: Verify typecheck passes**

  ```bash
  npm run check
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/components/data-grid/table-engine/types/table.types.ts
  git commit -m "feat: add rowNavigation to DAGTableConfig type"
  ```

---

## Task 2: Wire `rowNavigation` in `ca-search.config.ts` and `ca.tsx`

**Files:**
- Modify: `src/features/layouts/ca/ca-search.config.ts`
- Modify: `src/routes/ca.tsx`

- [ ] **Step 1: Add `rowNavigation` to `caSearchConfig`**

  Open `src/features/layouts/ca/ca-search.config.ts`. After the `tableId` and `mode` fields (around line 35), add:

  ```ts
  export const caSearchConfig: DAGTableConfig = {
  	tableId: "ca-search",
  	mode: "infinite",
  	rowNavigation: { to: "/ca/$nodeId", paramField: "identifier", paramName: "nodeId" },
  	// ... rest unchanged
  ```

- [ ] **Step 2: Update `ca.tsx` to read navigation from the config**

  Open `src/routes/ca.tsx`. The file currently imports `useNavigate` and reads `listConfig` from `getConfig`. Replace the hardcoded `onRowClick` with the config-driven version.

  The full updated file:

  ```tsx
  // src/routes/ca.tsx
  import { createFileRoute, useNavigate, Outlet, useMatches } from "@tanstack/react-router";
  import { ConfiguredTable } from "@/components/data-grid/table-engine";
  import type { DAGTableConfig } from "@/components/data-grid/table-engine";
  import { getConfig } from "@/components/tab-engine";
  import { use3dxDropZone } from "@/hooks/use-3dx-drop-zone";
  import { cn } from "@/lib/utils";

  export const Route = createFileRoute("/ca")({
  	component: CAListView,
  });

  function CAListView() {
  	const navigate = useNavigate();
  	const matches = useMatches();
  	const isDetailActive = matches.some((m) => m.routeId === "/ca/$nodeId");
  	const { ref: dropRef, isDragOver } = use3dxDropZone<HTMLDivElement>({
  		onDrop: (items) => {
  			const item = items[0];
  			if (item?.objectId) {
  				void navigate({ to: "/ca/$nodeId", params: { nodeId: item.objectId } });
  			}
  		},
  	});

  	if (isDetailActive) {
  		return <Outlet />;
  	}

  	const listConfig = getConfig("./ca-search.config.ts") as DAGTableConfig | undefined;
  	if (!listConfig) {
  		return (
  			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
  				CA Search config not registered
  			</div>
  		);
  	}

  	const nav = listConfig.rowNavigation;

  	return (
  		<div
  			ref={dropRef}
  			className={cn(
  				"h-full w-full transition-all",
  				isDragOver && "ring-2 ring-primary ring-inset",
  			)}
  		>
  			<ConfiguredTable
  				config={listConfig}
  				className="h-full"
  				onRowClick={
  					nav
  						? (row) => {
  								const value = row[nav.paramField];
  								if (value != null && value !== "") {
  									void navigate({
  										to: nav.to as any,
  										params: { [nav.paramName]: String(value) },
  									});
  								}
  							}
  						: undefined
  				}
  			/>
  		</div>
  	);
  }
  ```

- [ ] **Step 3: Verify typecheck passes**

  ```bash
  npm run check
  ```

  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/features/layouts/ca/ca-search.config.ts src/routes/ca.tsx
  git commit -m "feat: config-driven row navigation in ca list view"
  ```

---

## Task 3: Create `ca-members.config.ts`

**Files:**
- Create: `src/features/layouts/ca/ca-members.config.ts`

- [ ] **Step 1: Create the file**

  ```ts
  // src/features/layouts/ca/ca-members.config.ts
  import type { DAGTableConfig } from "@/components/data-grid/table-engine";

  const CA_MEMBERS_URL =
  	'$:"/resources/v1/modeler/dslc/changeaction/" & $params.nodeId';

  export const caMembersConfig: DAGTableConfig = {
  	tableId: "ca-members",
  	mode: "flat",

  	dag: {
  		nodes: [
  			{
  				id: "root-api",
  				type: "api",
  				config: {
  					url: CA_MEMBERS_URL,
  					method: "GET",
  					authAdapterId: "wafdata",
  					queryParams: { $fields: "members" },
  					headers: {
  						"Content-Type": "application/json",
  						Accept: "application/json",
  					},
  					// Flatten assignees, reviewers, followers into role+name rows.
  					// $append treats undefined as empty — safe when a group is absent.
  					responseTransform: `
  						$append($append(
  							members.assignees.{"role": "Assignee", "name": $},
  							members.reviewers.{"role": "Reviewer", "name": $}
  						), members.followers.{"role": "Follower", "name": $})
  					`,
  				},
  			},
  			{
  				id: "columns",
  				type: "column",
  				config: {
  					columns: [
  						{ field: "role", header: "Role", sortable: true },
  						{ field: "name", header: "Name", sortable: true, filterable: true },
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
  		columnVisibility: { enabled: false },
  	},
  };
  ```

- [ ] **Step 2: Verify typecheck passes**

  ```bash
  npm run check
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/features/layouts/ca/ca-members.config.ts
  git commit -m "feat: add ca-members table config"
  ```

---

## Task 4: Create `ca-proposed.config.ts`

**Files:**
- Create: `src/features/layouts/ca/ca-proposed.config.ts`

- [ ] **Step 1: Create the file**

  ```ts
  // src/features/layouts/ca/ca-proposed.config.ts
  import type { DAGTableConfig } from "@/components/data-grid/table-engine";

  const CA_PROPOSED_URL =
  	'$:"/resources/v1/modeler/dslc/changeaction/" & $params.nodeId';

  export const caProposedConfig: DAGTableConfig = {
  	tableId: "ca-proposed",
  	mode: "flat",

  	dag: {
  		nodes: [
  			{
  				id: "root-api",
  				type: "api",
  				config: {
  					url: CA_PROPOSED_URL,
  					method: "GET",
  					authAdapterId: "wafdata",
  					queryParams: { $fields: "proposedChanges" },
  					headers: {
  						"Content-Type": "application/json",
  						Accept: "application/json",
  					},
  					// Guard against absent proposedChanges — $count returns 0 for undefined/empty.
  					responseTransform: `
  						$count(proposedChanges) > 0 ? proposedChanges.{
  							"status":     status,
  							"type":       where.type,
  							"identifier": where.identifier,
  							"why":        why
  						} : []
  					`,
  				},
  			},
  			{
  				id: "columns",
  				type: "column",
  				config: {
  					columns: [
  						{
  							field: "status",
  							header: "Status",
  							renderType: "badge",
  							sortable: true,
  						},
  						{ field: "type", header: "Type", sortable: true },
  						{
  							field: "identifier",
  							header: "Identifier",
  							sortable: true,
  							filterable: true,
  						},
  						{ field: "why", header: "Why" },
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
  		columnVisibility: { enabled: false },
  	},
  };
  ```

- [ ] **Step 2: Verify typecheck passes**

  ```bash
  npm run check
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/features/layouts/ca/ca-proposed.config.ts
  git commit -m "feat: add ca-proposed-changes table config"
  ```

---

## Task 5: Create `ca-tabs.config.ts`

**Files:**
- Create: `src/features/layouts/ca/ca-tabs.config.ts`

- [ ] **Step 1: Create the file**

  ```ts
  // src/features/layouts/ca/ca-tabs.config.ts
  import type { DAGTabConfig } from "@/components/tab-engine";

  export const caTabsConfig: DAGTabConfig = {
  	tabId: "ca-tabs",
  	indicatorStyle: "underline",
  	tabs: [
  		{
  			id: "members",
  			label: "Members",
  			icon: "Users",
  			content: {
  				type: "table",
  				configPath: "./ca-members.config.ts",
  			},
  		},
  		{
  			id: "proposed-changes",
  			label: "Proposed Changes",
  			icon: "ListChecks",
  			content: {
  				type: "table",
  				configPath: "./ca-proposed.config.ts",
  			},
  		},
  	],
  };
  ```

- [ ] **Step 2: Verify typecheck passes**

  ```bash
  npm run check
  ```

  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/features/layouts/ca/ca-tabs.config.ts
  git commit -m "feat: add ca-tabs config (Members + Proposed Changes)"
  ```

---

## Task 6: Register configs + fix `ca-layout.config.ts`

**Files:**
- Modify: `src/features/layouts/bootstrap.ts`
- Modify: `src/features/layouts/ca/ca-layout.config.ts`

- [ ] **Step 1: Replace `bootstrap.ts` with the following complete file**

  Open `src/features/layouts/bootstrap.ts` and **replace the entire file** with:

  ```ts
  // src/features/layouts/bootstrap.ts
  /**
   * Central export point for all layout-driven feature configs.
   * Also registers all configs with the central tab-engine config registry.
   * Must be called once at application startup before any layouts routes render.
   */

  import { registerConfig } from "@/components/tab-engine";
  import { caSearchConfig } from "./ca/ca-search.config";
  import { caLayoutConfig } from "./ca/ca-layout.config";
  import { caFormConfig } from "./ca/ca-form.config";
  import { caTabsConfig } from "./ca/ca-tabs.config";
  import { caMembersConfig } from "./ca/ca-members.config";
  import { caProposedConfig } from "./ca/ca-proposed.config";

  export { caFeatureConfig } from "./ca/ca-feature.config";

  let bootstrapped = false;

  export function bootstrapLayoutsFeature(): void {
  	if (bootstrapped) return;
  	bootstrapped = true;

  	// CA Domain Configs
  	registerConfig("./ca-search.config.ts", caSearchConfig);
  	registerConfig("./ca-layout.config.ts", caLayoutConfig);
  	registerConfig("./ca-form.config.ts", caFormConfig);
  	registerConfig("./ca-tabs.config.ts", caTabsConfig);
  	registerConfig("./ca-members.config.ts", caMembersConfig);
  	registerConfig("./ca-proposed.config.ts", caProposedConfig);
  }

  // Future domains:
  // export { drawingFeatureConfig } from './drawing/drawing-feature.config'
  // export { reportFeatureConfig } from './report/report-feature.config'
  ```

  > **Note:** `ca-form.config.ts` is also included here. It was previously missing from bootstrap, which would cause the CA detail page side panel to also show "Content not available".

- [ ] **Step 2: Fix stale file headers and `routePath` in CA layout and form configs**

  **In `src/features/layouts/ca/ca-layout.config.ts`** make two changes:

  1. Line 1 — update file header comment:
     ```ts
     // src/features/layouts/ca/ca-layout.config.ts
     ```

  2. Inside `caLayoutConfig` — fix `routePath`:
     ```ts
     routePath: "/ca/$nodeId",
     ```

  **In `src/features/layouts/ca/ca-form.config.ts`** make one change:

  3. Line 1 — update file header comment:
     ```ts
     // src/features/layouts/ca/ca-form.config.ts
     ```

- [ ] **Step 3: Verify typecheck and build both pass**

  ```bash
  npm run check
  ```
  Expected: no errors.

  ```bash
  npm run build
  ```
  Expected: build completes with no TypeScript errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/features/layouts/bootstrap.ts src/features/layouts/ca/ca-layout.config.ts src/features/layouts/ca/ca-form.config.ts
  git commit -m "feat: register CA tabs/members/proposed/form configs, fix stale file headers"
  ```

---

## Done

At this point:
- Clicking a row in the CA list navigates to `/ca/$nodeId` using `identifier` read from `rowNavigation` config — no hardcoded field names in the route.
- The CA detail page main panel loads `ca-tabs.config.ts`, showing **Members** and **Proposed Changes** tabs.
- All new configs are registered in bootstrap — "Content not available" error is resolved.

**If something looks wrong at runtime**, check:
1. `bootstrapLayoutsFeature()` is called before any CA route renders (trace from `main.tsx` or app entry).
2. The `members` and `proposedChanges` API fields exist on the 3DX response — the `$fields=members` / `$fields=proposedChanges` query params must be supported by your 3DX tenant.
