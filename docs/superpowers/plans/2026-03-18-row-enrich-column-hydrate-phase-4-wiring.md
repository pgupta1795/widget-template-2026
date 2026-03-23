# RowEnrich + ColumnHydrate — Phase 4: Toolbar Wiring and Barrel Exports

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `isEnriching`, `isHydrating`, `triggerEnrich`, and `triggerHydrate` from `useDAGTable` all the way into `ToolbarContext` so toolbar commands can use them. Export new types from the public barrel. Add an example config file.

**Architecture:** Four files form the data path: `configured-table.tsx` destructures from `useDAGTable` → passes as `DataGrid` props → `use-data-grid.ts` adds them to `DataGridConfig` and `DataGridContextValue` → `toolbar-renderer.tsx` reads from context and adds to `ToolbarContext`. `ToolbarContext` and `DataGridContextValue` each get four new optional/required fields. `index.ts` exports the new types. The example config shows eager `rowEnrich` + lazy `columnHydrate` (triggered by a toolbar command handler).

**Tech Stack:** TypeScript 5, React 19, Biome

**Spec:** `docs/superpowers/specs/2026-03-18-row-enrich-column-hydrate-design.md`

**Prev phase:** `docs/superpowers/plans/2026-03-18-row-enrich-column-hydrate-phase-3-hook.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/data-grid/toolbar/toolbar.types.ts` | Modify — add 4 fields to `ToolbarContext` |
| `src/components/data-grid/data-grid-context.tsx` | Modify — add 4 fields to `DataGridContextValue` |
| `src/components/data-grid/hooks/use-data-grid.ts` | Modify — add 4 fields to `DataGridConfig`, wire into return + deps |
| `src/components/data-grid/data-grid.tsx` | Modify — add 4 fields to `DataGridProps`, pass to `useDataGrid` |
| `src/components/data-grid/toolbar/toolbar-renderer.tsx` | Modify — destructure + add to `ctx` useMemo |
| `src/components/data-grid/table-engine/configured-table.tsx` | Modify — destructure new fields from `useDAGTable`, pass to `DataGrid` |
| `src/components/data-grid/table-engine/index.ts` | Modify — export new types |
| `src/features/xen/configs/eng-enriched.config.ts` | Create — example config |

---

## Chunk 1: ToolbarContext and DataGridContextValue

### Task 1: Extend ToolbarContext

**File:** `src/components/data-grid/toolbar/toolbar.types.ts`

- [ ] Find the `ToolbarContext` interface (around line 129). It currently ends with:
  ```ts
  	// ── Infinite ─────────────────────────────────────────────────────────────
  	hasNextPage: boolean;
  	fetchNextPage: () => void;
  }
  ```
  Add the four new fields before the closing brace:
  ```ts
  	// ── Infinite ─────────────────────────────────────────────────────────────
  	hasNextPage: boolean;
  	fetchNextPage: () => void;

  	// ── Row/Column enrichment ─────────────────────────────────────────────────
  	/** True while any per-row enrichment query is in-flight */
  	isEnriching: boolean;
  	/** True while any per-column hydration query is in-flight */
  	isHydrating: boolean;
  	/** Trigger eager rowEnrich queries (lazy === true). Undefined when not applicable. */
  	triggerEnrich?: () => void;
  	/** Trigger a column's hydration queries (lazy === true). Undefined when not applicable. */
  	triggerHydrate?: (columnId: string) => void;
  }
  ```

- [ ] Run: `npm run check`
  Expected: TypeScript errors in `toolbar-renderer.tsx` — `ctx` object is missing the new required fields. These will be fixed in Task 5.

### Task 2: Extend DataGridContextValue

**File:** `src/components/data-grid/data-grid-context.tsx`

- [ ] Find the `DataGridContextValue` interface (line 17). It currently ends with:
  ```ts
  	// Infinite
  	hasNextPage: boolean;
  	fetchNextPage: () => void;
  }
  ```
  Add four new fields before the closing brace:
  ```ts
  	// Infinite
  	hasNextPage: boolean;
  	fetchNextPage: () => void;

  	// Row/Column enrichment
  	isEnriching: boolean;
  	isHydrating: boolean;
  	triggerEnrich?: () => void;
  	triggerHydrate?: (columnId: string) => void;
  }
  ```

- [ ] Run: `npm run check`
  Expected: TypeScript errors in `use-data-grid.ts` — the return `useMemo` is missing the new required fields. Fixed in Task 3.

---

## Chunk 2: DataGrid hook and component

### Task 3: Extend DataGridConfig and useDataGrid return value

**File:** `src/components/data-grid/hooks/use-data-grid.ts`

- [ ] Find the `DataGridConfig` interface (around line 71). It currently ends with:
  ```ts
  	initialColumnVisibility?: Record<string, boolean>;
  }
  ```
  Add four new optional fields before the closing brace:
  ```ts
  	initialColumnVisibility?: Record<string, boolean>;
  	/** True while any per-row enrichment query is in-flight */
  	isEnriching?: boolean;
  	/** True while any per-column hydration query is in-flight */
  	isHydrating?: boolean;
  	/** Trigger eager rowEnrich queries when rowEnrich node has lazy === true */
  	triggerEnrich?: () => void;
  	/** Trigger a column's hydration queries when that column has lazy === true */
  	triggerHydrate?: (columnId: string) => void;
  }
  ```

- [ ] In the `useDataGrid` function body, find the destructure of `config` (around line 152). The current destructure ends with:
  ```ts
  		initialColumnVisibility,
  	} = config;
  ```
  Add the four new fields:
  ```ts
  		initialColumnVisibility,
  		isEnriching: externalIsEnriching = false,
  		isHydrating: externalIsHydrating = false,
  		triggerEnrich,
  		triggerHydrate,
  	} = config;
  ```

- [ ] Find the return `useMemo` (around line 472). It currently ends with:
  ```ts
  		// Infinite
  		// Use prop values if provided (for pre-paginated data from ConfiguredTable),
  		// otherwise use infiniteQuery values
  		hasNextPage: config.hasNextPage ?? infiniteQuery.hasNextPage,
  		fetchNextPage: config.fetchNextPage ?? infiniteQuery.fetchNextPage,
  	}),
  ```
  Add the four new fields before the closing `})`:
  ```ts
  		// Infinite
  		// Use prop values if provided (for pre-paginated data from ConfiguredTable),
  		// otherwise use infiniteQuery values
  		hasNextPage: config.hasNextPage ?? infiniteQuery.hasNextPage,
  		fetchNextPage: config.fetchNextPage ?? infiniteQuery.fetchNextPage,
  		// Row/Column enrichment
  		isEnriching: externalIsEnriching,
  		isHydrating: externalIsHydrating,
  		triggerEnrich,
  		triggerHydrate,
  	}),
  ```

- [ ] Find the `useMemo` deps array (the `// eslint-disable-next-line` comment is followed by the deps array around line 517). The array currently ends with:
  ```ts
  		groupingHook.grouping,
  		groupingHook.expanded,
  	],
  ```
  Add the four new deps before the closing `]`:
  ```ts
  		groupingHook.grouping,
  		groupingHook.expanded,
  		externalIsEnriching,
  		externalIsHydrating,
  		triggerEnrich,
  		triggerHydrate,
  	],
  ```

- [ ] Run: `npm run check`
  Expected: Errors in `data-grid.tsx` about missing props passed to `useDataGrid`. Fixed in Task 4.

### Task 4: Extend DataGridProps and pass to useDataGrid

**File:** `src/components/data-grid/data-grid.tsx`

- [ ] Find `DataGridProps` interface. Add four new optional fields after the `onSearch` prop block:
  ```ts
  	/** True while any per-row enrichment query is in-flight */
  	isEnriching?: boolean;
  	/** True while any per-column hydration query is in-flight */
  	isHydrating?: boolean;
  	/** Trigger eager rowEnrich queries when rowEnrich node has lazy === true */
  	triggerEnrich?: () => void;
  	/** Trigger a column's hydration queries when that column has lazy === true */
  	triggerHydrate?: (columnId: string) => void;
  ```

- [ ] Find where `DataGrid` destructures its props. Add the four new names to the destructure:
  ```ts
  	isEnriching,
  	isHydrating,
  	triggerEnrich,
  	triggerHydrate,
  ```

- [ ] Find where `useDataGrid` is called inside `DataGrid`. Add the four new fields to the config object passed to `useDataGrid`:
  ```ts
  	isEnriching,
  	isHydrating,
  	triggerEnrich,
  	triggerHydrate,
  ```

- [ ] Run: `npm run check`
  Expected: The `data-grid-context.tsx` errors should be resolved. Any remaining errors are in `toolbar-renderer.tsx` (fixed next).

---

## Chunk 3: Toolbar renderer

### Task 5: Extend ToolbarRenderer to pass new fields into ctx

**File:** `src/components/data-grid/toolbar/toolbar-renderer.tsx`

- [ ] Find the destructure from `useDataGridContext()` (around line 320). It currently ends with:
  ```ts
  		hasNextPage,
  		fetchNextPage,
  	} = useDataGridContext();
  ```
  Add the four new fields:
  ```ts
  		hasNextPage,
  		fetchNextPage,
  		isEnriching,
  		isHydrating,
  		triggerEnrich,
  		triggerHydrate,
  	} = useDataGridContext();
  ```

- [ ] Find the `ctx` `useMemo` body. It currently ends with:
  ```ts
  		hasNextPage,
  		fetchNextPage,
  	}),
  ```
  Add the four new fields before the closing `})`:
  ```ts
  		hasNextPage,
  		fetchNextPage,
  		isEnriching,
  		isHydrating,
  		triggerEnrich,
  		triggerHydrate,
  	}),
  ```

- [ ] Find the `useMemo` deps array for `ctx`. It currently ends with:
  ```ts
  		hasNextPage,
  		fetchNextPage,
  	],
  ```
  Add the four new deps:
  ```ts
  		hasNextPage,
  		fetchNextPage,
  		isEnriching,
  		isHydrating,
  		triggerEnrich,
  		triggerHydrate,
  	],
  ```

- [ ] Run: `npm run check`
  Expected: No remaining TypeScript errors from the context/toolbar chain.

---

## Chunk 4: ConfiguredTable wiring

### Task 6: Wire new fields from useDAGTable into DataGrid

**File:** `src/components/data-grid/table-engine/configured-table.tsx`

- [ ] Find the `useDAGTable` destructure (around line 67). It currently is:
  ```ts
  	const {
  		data,
  		columns,
  		columnVisibility,
  		isLoading,
  		error,
  		isFetchingNextPage,
  		hasNextPage,
  		fetchNextPage,
  		onExpand,
  		onAction,
  		executeNode,
  	} = useDAGTable(
  ```
  Add the four new fields:
  ```ts
  	const {
  		data,
  		columns,
  		columnVisibility,
  		isLoading,
  		error,
  		isFetchingNextPage,
  		hasNextPage,
  		fetchNextPage,
  		onExpand,
  		onAction,
  		executeNode,
  		isEnriching,
  		isHydrating,
  		triggerEnrich,
  		triggerHydrate,
  	} = useDAGTable(
  ```

- [ ] Find the `<DataGrid` JSX block. After the existing `onSearch={handleSearch}` prop, add:
  ```tsx
  			isEnriching={isEnriching}
  			isHydrating={isHydrating}
  			triggerEnrich={triggerEnrich}
  			triggerHydrate={triggerHydrate}
  ```

- [ ] Run: `npm run check`
  Expected: No errors.

- [ ] Run: `npm run build`
  Expected: Clean build.

---

## Chunk 5: Barrel exports and example config

### Task 7: Export new types from index.ts

**File:** `src/components/data-grid/table-engine/index.ts`

- [ ] Find the `table.types` export block. It currently includes:
  ```ts
  export type {
  	ActionDef,
  	ActionNodeConfig,
  	ApiNodeConfig,
  	ColumnDef,
  	ColumnNodeConfig,
  	DAGFeaturesConfig,
  	DAGTableConfig,
  	DAGTableResult,
  	GridColumnDef,
  	GridRow,
  	MergeNodeConfig,
  	RowExpandNodeConfig,
  	TransformNodeConfig,
  } from "./types/table.types";
  ```
  Add the six new types (sorted alphabetically with the others):
  ```ts
  export type {
  	ActionDef,
  	ActionNodeConfig,
  	ApiNodeConfig,
  	ColumnDef,
  	ColumnHydrateDescriptor,
  	ColumnHydrateEntry,
  	ColumnHydrateNodeConfig,
  	ColumnHydrateNodeOutput,
  	ColumnNodeConfig,
  	DAGFeaturesConfig,
  	DAGTableConfig,
  	DAGTableResult,
  	GridColumnDef,
  	GridRow,
  	MergeNodeConfig,
  	RowEnrichDescriptor,
  	RowEnrichNodeConfig,
  	RowEnrichNodeOutput,
  	RowExpandNodeConfig,
  	TransformNodeConfig,
  } from "./types/table.types";
  ```

- [ ] Run: `npm run check`
  Expected: No errors.

### Task 8: Create example config

**File:** `src/features/xen/configs/eng-enriched.config.ts`

- [ ] Verify the directory exists: `src/features/xen/configs/`. If it does not, check `src/features/` — configs live alongside other xen configs.

- [ ] Create the file with this content (adjust `authAdapterId` and URLs to match the rest of the xen configs in that directory):

  ```ts
  // src/features/xen/configs/eng-enriched.config.ts
  //
  // Example: rowEnrich (eager) + columnHydrate with one lazy column.
  //
  // rowEnrich fires immediately after the root load and merges the first row of
  // the childApi response onto each root row.
  //
  // columnHydrate 'status' column fires immediately; 'details' is lazy and is
  // triggered by a toolbar button (ctx.triggerHydrate('details')).

  import type { DAGTableConfig } from "@/components/data-grid/table-engine";

  export const engEnrichedConfig: DAGTableConfig = {
    tableId: "eng-enriched",
    mode: "flat",
    dag: {
      nodes: [
        // Root API — fetches the main row list
        {
          id: "root-api",
          type: "api",
          config: {
            url: "/api/eng/items",
            method: "GET",
            authAdapterId: "wafdata",
          },
        },
        // Column definition
        {
          id: "col",
          type: "column",
          config: {
            columns: [
              { field: "id", header: "ID" },
              { field: "name", header: "Name" },
              { field: "owner", header: "Owner" },
              { field: "status", header: "Status" },
              { field: "details", header: "Details" },
            ],
          },
        },
        // Lazy ApiNode for rowEnrich — NOT in edges
        {
          id: "enrich-api",
          type: "api",
          config: {
            url: "/api/eng/item-details",
            method: "GET",
            authAdapterId: "wafdata",
            queryParams: { id: { $expr: "$row.id" } },
          },
        },
        // Lazy ApiNode for columnHydrate 'status' column — NOT in edges
        {
          id: "status-api",
          type: "api",
          config: {
            url: "/api/eng/status",
            method: "GET",
            authAdapterId: "wafdata",
            queryParams: { itemId: { $expr: "$row.id" } },
          },
        },
        // Lazy ApiNode for columnHydrate 'details' column — NOT in edges
        {
          id: "details-api",
          type: "api",
          config: {
            url: "/api/eng/details",
            method: "GET",
            authAdapterId: "wafdata",
            queryParams: { itemId: { $expr: "$row.id" } },
          },
        },
        // rowEnrich node — eager (lazy not set, defaults false)
        {
          id: "row-enrich",
          type: "rowEnrich",
          config: {
            sourceNodeId: "root-api",
            childApiNodeId: "enrich-api",
            rowKeyField: "id",
            // mergeTransform: optional JSONata to shape the patch before merge
          },
        },
        // columnHydrate node — 'status' eager, 'details' lazy
        {
          id: "col-hydrate",
          type: "columnHydrate",
          config: {
            sourceNodeId: "root-api",
            rowKeyField: "id",
            columns: [
              {
                columnId: "status",
                childApiNodeId: "status-api",
                // lazy not set → fires immediately
              },
              {
                columnId: "details",
                childApiNodeId: "details-api",
                lazy: true, // waits for ctx.triggerHydrate('details')
              },
            ],
          },
        },
      ],
      edges: [
        { from: "root-api", to: "col" },
        { from: "row-enrich", to: "col" },
        { from: "col-hydrate", to: "col" },
      ],
      rootNodeId: "col",
    },
    toolbarCommands: [
      {
        id: "load-details",
        type: "command",
        label: "Load Details",
        icon: "Download",
        enabled: true,
        handler: async (ctx) => {
          ctx.triggerHydrate?.("details");
        },
      },
    ],
  };
  ```

- [ ] Run: `npm run check`
  Expected: No errors. The config is valid TypeScript — all node types and IDs referenced in edges and childApiNodeIds exist in the nodes array.

### Task 9: Final build verification

- [ ] Run: `npm run check && npm run build`
  Expected: Clean run — zero TypeScript errors, zero build errors.

### Task 10: Commit

- [ ] Run:
  ```bash
  git add \
    src/components/data-grid/toolbar/toolbar.types.ts \
    src/components/data-grid/data-grid-context.tsx \
    src/components/data-grid/hooks/use-data-grid.ts \
    src/components/data-grid/data-grid.tsx \
    src/components/data-grid/toolbar/toolbar-renderer.tsx \
    src/components/data-grid/table-engine/configured-table.tsx \
    src/components/data-grid/table-engine/index.ts \
    src/features/xen/configs/eng-enriched.config.ts
  git commit -m "feat(wiring): wire isEnriching/isHydrating/triggerEnrich/triggerHydrate to toolbar context"
  ```
