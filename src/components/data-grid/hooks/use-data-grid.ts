import type { DataGridContextValue } from "@/components/data-grid/data-grid-context";
import type { ToolbarCommand } from "@/components/data-grid/toolbar/toolbar.types";
import { useEditing } from "@/components/data-grid/features/editing/use-editing";
import { filterFnForType } from "@/components/data-grid/features/filtering/filter-functions";
import { useFiltering } from "@/components/data-grid/features/filtering/use-filtering";
import { useGrouping } from "@/components/data-grid/features/grouping/use-grouping";
import { useLoadingState } from "@/components/data-grid/features/loading/use-loading-state";
import { useColumnOrdering } from "@/components/data-grid/features/ordering/use-column-ordering";
import { useColumnPinning } from "@/components/data-grid/features/pinning/use-column-pinning";
import { useRowPinning } from "@/components/data-grid/features/pinning/use-row-pinning";
import { selectionColumnDef } from "@/components/data-grid/features/selection/selection-cell";
import { useSelection } from "@/components/data-grid/features/selection/use-selection";
import { useSorting } from "@/components/data-grid/features/sorting/use-sorting";
import { expandColumnDef } from "@/components/data-grid/features/tree/expand-toggle";
import { useLazyExpand } from "@/components/data-grid/features/tree/use-lazy-expand";
import {
	useColVirtualizer,
	useRowVirtualizer,
} from "@/components/data-grid/features/virtualization/use-virtualization";
import {
	useInfiniteData,
	type InfinitePageResult,
} from "@/components/data-grid/hooks/use-infinite-data";
import type {
	ColumnType,
	GridColumnDef,
} from "@/components/data-grid/types/column-types";
import type { FilterState } from "@/components/data-grid/types/filter-types";
import type {
	GridDensity,
	GridFeaturesConfig,
	GridMode,
	GridRow,
} from "@/components/data-grid/types/grid-types";
import type { GridSlots } from "@/components/data-grid/types/slot-types";
import type { SortState } from "@/components/data-grid/types/sort-types";
import type { QueryKey } from "@tanstack/react-query";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { FilterFnOption, Table } from "@tanstack/react-table";
import {
	getCoreRowModel,
	getExpandedRowModel,
	getFacetedMinMaxValues,
	getFacetedRowModel,
	getFacetedUniqueValues,
	getFilteredRowModel,
	getGroupedRowModel,
	getSortedRowModel,
	useReactTable,
} from "@tanstack/react-table";
import React from "react";
import { useColumnResize } from "./use-column-resize";

export type PaginatedQueryFn<TData> = (params: {
	pageIndex: number;
	pageSize: number;
	sort: SortState[];
	filters: FilterState[];
}) => Promise<{ rows: TData[]; total: number }>;

export type InfiniteQueryFn<TData> = (params: {
	pageParam: number;
	sort: SortState[];
	filters: FilterState[];
}) => Promise<InfinitePageResult<TData>>;

/**
 * Configuration for the useDataGrid hook.
 * Shared mostly with DataGridProps, but tailored for internal hook usage.
 */
export interface DataGridConfig<TData extends GridRow> {
	/** Array of rows for client-side modes (flat and tree) */
	data?: TData[];
	/** Array of column configurations */
	columns: GridColumnDef<TData>[];
	/** Operation mode of the grid. 'flat', 'tree', 'paginated', or 'infinite' */
	mode?: GridMode;
	/** Visual density spacing */
	density?: GridDensity;
	/** Settings for interactive grid features (sorting, filtering, editing, etc.) */
	features?: GridFeaturesConfig;
	/** Render overrides for specific wrapper sections of the grid */
	slots?: GridSlots;
	/** Function to extract nested children arrays for Tree mode */
	getSubRows?: (row: TData) => TData[] | undefined;
	/** Async callback fired when expanding a node in Tree mode */
	onExpand?: (row: GridRow) => Promise<GridRow[]> | void;
	/** Indicates if remote data is currently refetching */
	isRefetching?: boolean;
	/** Indicates if an infinite scroll query is fetching the next page */
	isFetchingNextPage?: boolean;
	/** Indicates if data is currently loading */
	isLoading?: boolean;
	/** For infinite mode: whether more pages are available. Used with flat mode when data is pre-paginated. */
	hasNextPage?: boolean;
	/** For infinite mode: callback to fetch next page. Used with flat mode when data is pre-paginated. */
	fetchNextPage?: () => Promise<unknown> | void;
	/** Action handler for the toolbar refresh button */
	onRefresh?: () => void;
	/** Toolbar command definitions. undefined = no toolbar rendered. */
	toolbarCommands?: ToolbarCommand[];
	/** CSS classes for the toolbar bar element */
	toolbarClassName?: string;
	/**
	 * Fires a DAG ActionDef by id. Signature matches useDAGTable's onAction return.
	 * At toolbar level row is always undefined.
	 */
	onAction?: (actionId: string, row?: GridRow) => Promise<void>;
	/**
	 * Called when a toolbar command with action property is executed.
	 * Provides direct DAG API node execution (in ConfiguredTable).
	 * In standalone DataGrid: undefined, use handler instead.
	 */
	onExecuteNode?: (nodeId: string) => Promise<GridRow[]>;
	/** Server-side search callback. Wired by ConfiguredTable to update searchParams state. */
	onSearch?: (paramName: string, query: string) => void;
	/** Required QueryKey for query-driven modes (paginated, infinite) */
	queryKey?: QueryKey;
	/** Data fetching query function for server modes */
	queryFn?: PaginatedQueryFn<TData> | InfiniteQueryFn<TData>;
	/**
	 * Initial column visibility state. Columns listed as false are hidden on mount.
	 * Produced by the table engine's column-builder from ColumnConfig.visible settings.
	 * Example: { internalCode: false, notes: false }
	 */
	initialColumnVisibility?: Record<string, boolean>;
	/** True while any per-row enrichment query is in-flight */
	isEnriching?: boolean;
	/** True while any per-column hydration query is in-flight */
	isHydrating?: boolean;
	/** Trigger rowEnrich queries when rowEnrich node has lazy === true */
	triggerEnrich?: () => void;
	/** Trigger a column's hydration queries when that column has lazy === true */
	triggerHydrate?: (columnId: string) => void;
	/** Called when the user clicks a data row. Receives the row's original data object. */
	onRowClick?: (row: GridRow) => void;
}

/**
 * Headless hook that manages state and orchestration for TanStack Table wrapped with internal features.
 * Integrates directly with sorting, filtering, row selection, pinning, grouping, editing, and virtualization hooks.
 * config:
 *  - data: Array of rows for client-side modes (flat and tree)
 *  - columns: Array of column configurations
 *  - mode: Operation mode of the grid. 'flat', 'tree', 'paginated', or 'infinite'
 *  - density: Visual density spacing
 *  - features: Settings for interactive grid features (sorting, filtering, editing, etc.)
 *  - slots: Render overrides for specific wrapper sections of the grid
 *  - getSubRows: Function to extract nested children arrays for Tree mode
 *  - onExpand: Async callback fired when expanding a node in Tree mode
 *  - isRefetching: Indicates if remote data is currently refetching
 *  - isFetchingNextPage: Indicates if an infinite scroll query is fetching the next page
 *  - onRefresh: Action handler for the toolbar refresh button
 *  - queryKey: Required QueryKey for query-driven modes (paginated, infinite)
 *  - queryFn: Data fetching query function for server modes
 * @param config DataGrid parameters and configuration flags
 * @returns An aggregated state context object ready to be provided to grid UI components via DataGridProvider
 */
export function useDataGrid<TData extends GridRow>(
	config: DataGridConfig<TData>,
): DataGridContextValue {
	const {
		columns,
		density: initialDensity = "normal",
		features,
		mode,
		slots,
		isRefetching: externalIsRefetching = false,
		isFetchingNextPage: externalIsFetchingNextPage = false,
		isLoading: externalIsLoading = false,
		onRefresh,
		toolbarCommands,
		toolbarClassName,
		onExecuteNode,
		onSearch,
		initialColumnVisibility,
		isEnriching: externalIsEnriching = false,
		isHydrating: externalIsHydrating = false,
		triggerEnrich,
		triggerHydrate,
		onRowClick,
	} = config;

	const executeApiNode = React.useCallback(
		(nodeId: string): Promise<GridRow[]> => {
			if (onExecuteNode) {
				return onExecuteNode(nodeId);
			}
			return Promise.resolve([]);
		},
		[onExecuteNode],
	);

	const [density, setDensity] = React.useState<GridDensity>(initialDensity);
	const [columnVisibility, setColumnVisibility] = React.useState<
		Record<string, boolean>
	>(initialColumnVisibility ?? {});
	const tableContainerRef = React.useRef<HTMLDivElement>(null);

	// Pagination state (for paginated mode)
	const [pagination, setPagination] = React.useState({
		pageIndex: 0,
		pageSize: 50,
	});

	const isServerMode = mode === "paginated" || mode === "infinite";

	// Feature hooks
	const sortingHook = useSorting({
		...features?.sorting,
		mode: isServerMode ? "server" : (features?.sorting?.mode ?? "client"),
	});
	const filteringHook = useFiltering({
		...features?.filtering,
		mode: isServerMode ? "server" : (features?.filtering?.mode ?? "client"),
	});
	const resizeHook = useColumnResize();
	const selectionHook = useSelection(features?.selection);
	const columnPinningHook = useColumnPinning(features?.columnPinning);
	const rowPinningHook = useRowPinning(features?.rowPinning);
	const groupingHook = useGrouping(features?.grouping);
	const orderingHook = useColumnOrdering();

	// Convert TanStack Table sorting/filtering state to SortState[]/FilterState[]
	const sortState = React.useMemo<SortState[]>(
		() =>
			sortingHook.sortingState.map((s) => ({
				columnId: s.id,
				direction: s.desc ? ("desc" as const) : ("asc" as const),
			})),
		[sortingHook.sortingState],
	);
	const filterState = React.useMemo<FilterState[]>(
		() =>
			filteringHook.columnFilters.map((f) => ({
				columnId: f.id,
				value: f.value,
			})),
		[filteringHook.columnFilters],
	);

	// Paginated query (always called, enabled only when mode === 'paginated')
	const paginatedQuery = useQuery({
		queryKey: [
			...(config.queryKey ?? []),
			{
				page: pagination.pageIndex,
				pageSize: pagination.pageSize,
				sort: sortState,
				filters: filterState,
			},
		],
		queryFn: () =>
			(config.queryFn as PaginatedQueryFn<TData>)({
				pageIndex: pagination.pageIndex,
				pageSize: pagination.pageSize,
				sort: sortState,
				filters: filterState,
			}),
		enabled: mode === "paginated" && !!config.queryKey,
		placeholderData: keepPreviousData,
	});

	// Infinite query (always called, enabled only when mode === 'infinite')
	const infiniteQuery = useInfiniteData<TData>({
		queryKey: config.queryKey ?? [],
		queryFn: config.queryFn as InfiniteQueryFn<TData>,
		sortState,
		filterState,
		enabled: mode === "infinite" && !!config.queryKey,
	});

	// Editing
	const editingHook = useEditing(features?.editing);

	// Loading state
	const loadingState = useLoadingState({
		enabled: features?.loading?.enabled,
		isRefetching: externalIsRefetching,
		isFetchingNextPage: externalIsFetchingNextPage,
		isMutating: editingHook.mutatingRowIds.size > 0,
	});

	// Determine effective data source based on mode
	const effectiveData = React.useMemo<TData[]>(() => {
		if (mode === "paginated")
			return (paginatedQuery.data?.rows ?? []) as TData[];
		if (mode === "infinite") return infiniteQuery.rows as TData[];
		return (config.data ?? []) as TData[];
	}, [mode, paginatedQuery.data, infiniteQuery.rows, config.data]);

	// Internal data state — allows lazy tree expand to merge children
	const [internalData, setInternalData] =
		React.useState<TData[]>(effectiveData);
	React.useEffect(() => {
		setInternalData(effectiveData);
	}, [effectiveData]);

	// Reset page to 0 on sort/filter change (paginated mode)
	React.useEffect(() => {
		if (mode === "paginated") {
			setPagination((prev) => ({ ...prev, pageIndex: 0 }));
		}
	}, [sortingHook.sortingState, filteringHook.columnFilters, mode]);

	// Lazy tree expand
	const { loadingRowIds, handleExpand } = useLazyExpand({
		onExpand: config.onExpand,
		setData: setInternalData as React.Dispatch<React.SetStateAction<GridRow[]>>,
	});

	// Post-process columns: add filterFn + aggregationFn per column type
	const processedColumns = React.useMemo(
		() =>
			columns.map((col) => {
				const type = col.meta?.type as ColumnType | undefined;
				const fn = filterFnForType(type);
				return {
					...col,
					...(fn ? { filterFn: fn as FilterFnOption<TData> } : {}),
					...(type === "number" ? { aggregationFn: "sum" as const } : {}),
				};
			}),
		[columns],
	);

	// Inject special columns
	const finalColumns = React.useMemo(() => {
		let cols: GridColumnDef<TData>[] = processedColumns;
		if (features?.selection?.enabled) {
			cols = [selectionColumnDef as GridColumnDef<TData>, ...cols];
		}
		if (mode === "tree") {
			cols = [expandColumnDef as GridColumnDef<TData>, ...cols];
		}
		return cols;
	}, [features?.selection?.enabled, mode, processedColumns]);

	// Destructure all table options from hooks
	const {
		manualSorting,
		onSortingChange,
		enableMultiSort,
		sortDescFirst,
		manualFiltering,
		filterFns,
		globalFilterFn,
		onColumnFiltersChange,
		onGlobalFilterChange,
		columnResizeMode,
		enableColumnResizing,
		columnResizeDirection,
		enableRowSelection,
		enableMultiRowSelection,
		onRowSelectionChange,
		enableColumnPinning,
		onColumnPinningChange,
		enableRowPinning,
		keepPinnedRows,
		onRowPinningChange,
		enableGrouping,
		groupedColumnMode,
		onGroupingChange,
		onExpandedChange,
		autoResetExpanded,
		onColumnOrderChange,
	} = {
		...sortingHook.tableOptions,
		...filteringHook.tableOptions,
		...resizeHook.tableOptions,
		...selectionHook.tableOptions,
		...columnPinningHook.tableOptions,
		...rowPinningHook.tableOptions,
		...groupingHook.tableOptions,
		...orderingHook.tableOptions,
	};

	const table = useReactTable<TData>({
		data: internalData,
		columns: finalColumns,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		getFacetedMinMaxValues: getFacetedMinMaxValues(),
		getGroupedRowModel: getGroupedRowModel(),
		getExpandedRowModel: getExpandedRowModel(),
		// Tree mode: teach TanStack Table how to traverse child rows
		...(mode === "tree"
			? {
					getSubRows: (row: TData) =>
						config.getSubRows
							? config.getSubRows(row)
							: (row.children as TData[] | undefined),
					enableExpanding: true,
					autoResetExpanded: false,
				}
			: {}),
		// Paginated mode: manual pagination with server-driven row count
		...(mode === "paginated"
			? {
					manualPagination: true,
					rowCount: paginatedQuery.data?.total ?? -1,
					onPaginationChange: setPagination,
				}
			: {}),
		state: {
			sorting: sortingHook.sortingState,
			columnFilters: filteringHook.columnFilters,
			globalFilter: filteringHook.globalFilter,
			columnVisibility,
			rowSelection: selectionHook.rowSelection,
			columnPinning: columnPinningHook.columnPinning,
			rowPinning: rowPinningHook.rowPinning,
			grouping: groupingHook.grouping,
			expanded: groupingHook.expanded,
			columnOrder: orderingHook.columnOrder,
			...(mode === "paginated" ? { pagination } : {}),
		},
		onColumnVisibilityChange: setColumnVisibility,
		// Sorting
		manualSorting,
		onSortingChange,
		enableMultiSort,
		sortDescFirst,
		// Filtering
		manualFiltering,
		filterFns,
		globalFilterFn,
		onColumnFiltersChange,
		onGlobalFilterChange,
		// Resize
		columnResizeMode,
		enableColumnResizing,
		columnResizeDirection,
		// Selection
		enableRowSelection,
		enableMultiRowSelection,
		onRowSelectionChange,
		// Column pinning
		enableColumnPinning,
		onColumnPinningChange,
		// Row pinning
		enableRowPinning,
		keepPinnedRows,
		onRowPinningChange,
		// Grouping
		enableGrouping,
		groupedColumnMode,
		onGroupingChange,
		onExpandedChange,
		autoResetExpanded,
		// Column ordering
		onColumnOrderChange,
	});

	// Row virtualization — count center rows for flat, all visible rows for tree
	const rowsForVirtualizer =
		mode === "tree" ? table.getRowModel().rows : table.getCenterRows();
	const rowVirtualizer = useRowVirtualizer({
		enabled: features?.virtualization?.enabled ?? false,
		rowCount: rowsForVirtualizer.length,
		density,
		rowHeight: features?.virtualization?.rowHeight,
		containerRef: tableContainerRef,
		overscan: features?.virtualization?.overscan,
	});

	// Column virtualization — only center (non-pinned) columns
	const centerColumns = table.getCenterLeafColumns();
	const columnVirtualizer = useColVirtualizer({
		enabled: features?.virtualization?.enabled ?? false,
		columns: centerColumns,
		containerRef: tableContainerRef,
	});

	// Determine effective isLoading based on mode
	const isLoading =
		externalIsLoading ||
		(mode === "paginated"
			? paginatedQuery.isLoading
			: mode === "infinite"
				? infiniteQuery.isLoading
				: loadingState.isInitialLoading);

	return React.useMemo<DataGridContextValue>(
		() => ({
			table: table as unknown as Table<GridRow>,
			isLoading,
			isRefetching: loadingState.isRefetching,
			isFetchingNextPage:
				mode === "infinite"
					? infiniteQuery.isFetchingNextPage
					: loadingState.isFetchingNextPage,
			density,
			setDensity,
			globalFilter: filteringHook.globalFilter,
			setGlobalFilter: filteringHook.setGlobalFilter,
			tableContainerRef,
			features,
			mode,
			slots,
			onRefresh,
			toolbarCommands,
			toolbarClassName,
			executeApiNode,
			setRows: setInternalData as (rows: GridRow[]) => void,
			onSearch,
			handleExpand: handleExpand as (
				row: import("@tanstack/react-table").Row<GridRow>,
			) => Promise<void>,
			loadingRowIds,
			rowVirtualizer,
			columnVirtualizer,
			activeEdit: editingHook.activeEdit,
			startEditing: editingHook.startEditing,
			cancelEditing: editingHook.cancelEditing,
			commitEditing: editingHook.commitEditing,
			mutatingRowIds: editingHook.mutatingRowIds,
			errorRowIds: editingHook.errorRowIds,
			// Pagination
			pagination,
			setPagination,
			paginatedTotal: paginatedQuery.data?.total,
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
			onRowClick,
		}),
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[
			table,
			isLoading,
			loadingState.isRefetching,
			loadingState.isFetchingNextPage,
			mode,
			infiniteQuery.isFetchingNextPage,
			infiniteQuery.hasNextPage,
			infiniteQuery.fetchNextPage,
			density,
			setDensity,
			filteringHook.globalFilter,
			filteringHook.setGlobalFilter,
			tableContainerRef,
			features,
			slots,
			onRefresh,
			toolbarCommands,
			toolbarClassName,
			executeApiNode,
			onSearch,
			handleExpand,
			loadingRowIds,
			rowVirtualizer,
			columnVirtualizer,
			editingHook.activeEdit,
			editingHook.startEditing,
			editingHook.cancelEditing,
			editingHook.commitEditing,
			editingHook.mutatingRowIds,
			editingHook.errorRowIds,
			pagination,
			setPagination,
			paginatedQuery.data?.total,
			config.hasNextPage,
			config.fetchNextPage,
			orderingHook.columnOrder,
			columnPinningHook.columnPinning,
			groupingHook.grouping,
			groupingHook.expanded,
			externalIsEnriching,
			externalIsHydrating,
			triggerEnrich,
			triggerHydrate,
			onRowClick,
		],
	);
}
