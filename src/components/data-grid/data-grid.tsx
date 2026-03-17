import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import type {
	InfiniteQueryFn,
	PaginatedQueryFn,
} from "@/components/data-grid/hooks/use-data-grid";
import { useDataGrid } from "@/components/data-grid/hooks/use-data-grid";
import type { ToolbarCommand } from "@/components/data-grid/toolbar/toolbar.types";
import { cn } from "@/lib/utils";
import type { GridSlots } from "@/components/data-grid/types";
import type { GridColumnDef } from "@/components/data-grid/types/column-types";
import type {
	GridDensity,
	GridFeaturesConfig,
	GridMode,
	GridRow,
} from "@/components/data-grid/types/grid-types";
import {
	closestCenter,
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import type { QueryKey } from "@tanstack/react-query";
import type { Row } from "@tanstack/react-table";
import React, { memo } from "react";
import { DataGridProvider, useDataGridContext } from "./data-grid-context";
import { DataGridEmpty } from "./data-grid-empty";
import { DataGridHeader } from "./data-grid-header";
import { DataGridPagination } from "./data-grid-pagination";
import { DataGridRow } from "./data-grid-row";
import { DataGridRowSkeleton } from "./data-grid-row-skeleton";
import { DataGridSkeleton } from "./data-grid-skeleton";
import { DataGridToolbar } from "./data-grid-toolbar";

const DENSITY_VARS: Record<GridDensity, Record<string, string>> = {
	compact: {
		"--cell-px": "8px",
		"--cell-py": "4px",
		"--row-height": "32px",
		"--header-height": "32px",
		"--font-size": "12px",
	},
	normal: {
		"--cell-px": "12px",
		"--cell-py": "8px",
		"--row-height": "40px",
		"--header-height": "38px",
		"--font-size": "13px",
	},
	comfortable: {
		"--cell-px": "16px",
		"--cell-py": "12px",
		"--row-height": "52px",
		"--header-height": "46px",
		"--font-size": "14px",
	},
};

// Skeleton rows shown while lazy-expanding a tree node
const TreeSkeletonRows = memo(function TreeSkeletonRows({
	depth,
	colCount,
}: {
	depth: number;
	colCount: number;
}) {
	return (
		<>
			{[0, 1, 2].map((i) => (
				<TableRow key={i} className="border-b border-border/50 bg-background">
					<TableCell
						colSpan={colCount}
						style={{
							padding: `6px 12px 6px ${(depth + 1) * 20 + 12}px`,
						}}
					>
						<div
							className="h-3.5 animate-pulse rounded-sm bg-muted"
							style={{ width: `${55 + i * 15}%` }}
						/>
					</TableCell>
				</TableRow>
			))}
		</>
	);
});

function DataGridBody() {
	const {
		table,
		features,
		mode,
		loadingRowIds,
		rowVirtualizer,
		isFetchingNextPage,
		hasNextPage,
		fetchNextPage,
		tableContainerRef,
	} = useDataGridContext();

	React.useEffect(() => {
		if (!fetchNextPage) return;
		const container = tableContainerRef.current;
		if (!container) return;

		const handleScroll = () => {
			const { scrollTop, scrollHeight, clientHeight } = container;
			if (
				scrollHeight - scrollTop - clientHeight < 300 &&
				hasNextPage &&
				!isFetchingNextPage
			) {
				fetchNextPage();
			}
		};

		container.addEventListener("scroll", handleScroll);
		return () => container.removeEventListener("scroll", handleScroll);
	}, [hasNextPage, isFetchingNextPage, fetchNextPage, tableContainerRef]);

	const isVirtualized = features?.virtualization?.enabled ?? false;
	const isTreeMode = mode === "tree";

	// For tree mode use all rows (flat expanded list); for flat use center rows
	const allRows = isTreeMode ? table.getRowModel().rows : undefined;

	const topRows = table.getTopRows();
	const centerRows = isTreeMode ? [] : table.getCenterRows();
	const bottomRows = table.getBottomRows();

	const rowsToVirtualize = allRows ?? centerRows;
	const hasRows =
		topRows.length +
			(allRows?.length ?? centerRows.length) +
			bottomRows.length >
		0;

	const colCount = table.getVisibleLeafColumns().length;
	const visibleColumns = table.getVisibleLeafColumns().map((col) => ({
		id: col.id,
		meta: col.columnDef.meta,
	}));
	const shouldAnimateRows = !isVirtualized;

	// Determine which rows to render (virtual or all)
	const virtualItems = isVirtualized ? rowVirtualizer.getVirtualItems() : null;
	const totalSize = rowVirtualizer.getTotalSize();

	const renderedCenterRows = virtualItems
		? virtualItems.map((vr) => rowsToVirtualize[vr.index]).filter(Boolean)
		: rowsToVirtualize;

	const paddingTop =
		isVirtualized && virtualItems && virtualItems.length > 0
			? (virtualItems[0]?.start ?? 0)
			: 0;
	const paddingBottom =
		isVirtualized && virtualItems && virtualItems.length > 0
			? totalSize - (virtualItems[virtualItems.length - 1]?.end ?? 0)
			: 0;

	if (!hasRows) {
		return (
			<TableRow>
				<TableCell colSpan={colCount}>
					<DataGridEmpty />
				</TableCell>
			</TableRow>
		);
	}

	return (
		<>
			{/* Pinned top rows (always rendered, sticky) */}
			{topRows.map((row) => (
				<DataGridRow key={row.id} row={row as Row<GridRow>} pinned="top" />
			))}

			{/* Top padding spacer for row virtualization */}
			{isVirtualized && paddingTop > 0 && (
				<TableRow>
					<TableCell
						colSpan={colCount}
						style={{ height: `${paddingTop}px`, padding: 0 }}
					/>
				</TableRow>
			)}

			{/* Center rows */}
			{renderedCenterRows.map((row, renderIdx) => {
				if (!row) return null;
				const isLoading = loadingRowIds.has(row.id);
				return (
					<React.Fragment key={row.id}>
						<DataGridRow
							row={row as Row<GridRow>}
							initialIndex={shouldAnimateRows ? renderIdx : undefined}
						/>
						{/* Show skeleton children while lazy-fetching */}
						{isTreeMode && isLoading && (
							<TreeSkeletonRows depth={row.depth} colCount={colCount} />
						)}
					</React.Fragment>
				);
			})}

			{/* Infinite scroll — append skeleton rows while fetching next page */}
			{isFetchingNextPage && (
				<>
					<DataGridRowSkeleton columns={visibleColumns} />
					<DataGridRowSkeleton columns={visibleColumns} />
					<DataGridRowSkeleton columns={visibleColumns} />
				</>
			)}

			{/* Bottom padding spacer for row virtualization */}
			{isVirtualized && paddingBottom > 0 && (
				<TableRow>
					<TableCell
						colSpan={colCount}
						style={{ height: `${paddingBottom}px`, padding: 0 }}
					/>
				</TableRow>
			)}

			{/* Pinned bottom rows (always rendered, sticky) */}
			{bottomRows.map((row) => (
				<DataGridRow key={row.id} row={row as Row<GridRow>} pinned="bottom" />
			))}
		</>
	);
}

function DataGridInner() {
	const { table, isLoading, features, tableContainerRef, mode } =
		useDataGridContext();

	const skeletonRows = features?.loading?.skeletonRows ?? 8;

	// Derive visible columns for skeleton
	const visibleColumns = table.getVisibleLeafColumns().map((col) => ({
		id: col.id,
		meta: col.columnDef.meta,
	}));

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
	);

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		if (!over || active.id === over.id) return;

		const allCols = table.getAllLeafColumns();
		const currentOrder =
			table.getState().columnOrder.length > 0
				? table.getState().columnOrder
				: allCols.map((c) => c.id);

		const fromIdx = currentOrder.indexOf(String(active.id));
		const toIdx = currentOrder.indexOf(String(over.id));
		if (fromIdx === -1 || toIdx === -1) return;

		const newOrder = [...currentOrder];
		newOrder.splice(fromIdx, 1);
		newOrder.splice(toIdx, 0, String(active.id));
		table.setColumnOrder(newOrder);
	};

	// Compute total table width for column virtualization
	const totalTableWidth = table
		.getVisibleLeafColumns()
		.reduce((sum, col) => sum + col.getSize(), 0);

	return (
		<div className="flex min-h-0 flex-1 flex-col">
			<DataGridToolbar />

			<div
				ref={tableContainerRef}
				className="relative min-h-0 flex-1 overflow-auto rounded-md border border-border bg-background [&>div]:min-w-full! [&>div]:overflow-visible!"
			>
				<DndContext
					sensors={sensors}
					collisionDetection={closestCenter}
					onDragEnd={handleDragEnd}
				>
					<Table
						className="border-collapse text-sm"
						style={{ width: `${totalTableWidth}px`, minWidth: "100%" }}
					>
						{isLoading ? (
							<DataGridSkeleton
								columns={visibleColumns}
								skeletonRows={skeletonRows}
								showHeaderSkeleton
							/>
						) : (
							<>
								<DataGridHeader />
								<TableBody className="animate-in duration-200 fade-in">
									<DataGridBody />
								</TableBody>
							</>
						)}
					</Table>
				</DndContext>
				{mode === "paginated" && <DataGridPagination />}
			</div>
		</div>
	);
}

/**
 * Configuration props for the DataGrid component.
 */
export interface DataGridProps<TData extends GridRow> {
	/** The data to display in the grid (for flat and tree modes). */
	data?: TData[];
	/** React Query key array for paginated and infinite modes. */
	queryKey?: QueryKey;
	/** The fetch function for paginated and infinite modes. */
	queryFn?: PaginatedQueryFn<TData> | InfiniteQueryFn<TData>;
	/** Array of column definitions created via column factories. */
	columns: GridColumnDef<TData>[];
	/** Operational mode of the grid. Defaults to 'flat'. */
	mode?: GridMode;
	/** Density spacing for rows and cells. Defaults to 'normal'. */
	density?: GridDensity;
	/** Configuration for features like sorting, filtering, grouping, editing, virtualization, etc. */
	features?: GridFeaturesConfig;
	/** Custom render slots for grid sections like toolbar and pagination. */
	slots?: GridSlots;
	/** Additional CSS classes for the root container. */
	className?: string;
	/** Used in tree mode to resolve children nodes from a given row. */
	getSubRows?: (row: TData) => TData[] | undefined;
	/** Triggered when an Expandable row requests to load children lazily. */
	onExpand?: (row: GridRow) => Promise<GridRow[]> | void;
	/** Indicates if external data is currently refetching. */
	isRefetching?: boolean;
	/** Indicates if infinite scroll is currently fetching the next page. */
	isFetchingNextPage?: boolean;
	/** Indicates if data is currently loading */
	isLoading?: boolean;
	/** For infinite mode: whether more pages are available to load. */
	hasNextPage?: boolean;
	/** For infinite mode: callback to fetch the next page of data. */
	fetchNextPage?: () => Promise<unknown> | void;
	/** Callback fired when the user clicks the refresh button. */
	onRefresh?: () => void;
	/**
	 * Initial column visibility state. Columns with false are hidden on mount.
	 * Produced by the table engine — no need to set manually when using ConfiguredTable.
	 */
	initialColumnVisibility?: Record<string, boolean>;
	/**
	 * Toolbar command definitions.
	 * - undefined: no toolbar bar rendered
	 * - []: empty toolbar bar (height preserved)
	 * - [...]: render only enabled:true commands
	 */
	toolbarCommands?: ToolbarCommand[];
	/** CSS classes merged onto the toolbar bar element only (not SelectionActionBar) */
	toolbarClassName?: string;
	/**
	 * Fires a DAG ActionDef by id. Provided by ConfiguredTable from useDAGTable.
	 * Toolbar handlers call ctx.executeApiNode(actionId) which wraps this.
	 */
	onAction?: (actionId: string, row?: GridRow) => Promise<void>;
	/**
	 * Called when a toolbar command with action property is executed.
	 * Provides direct DAG API node execution (in ConfiguredTable).
	 * In standalone DataGrid: undefined, use handler instead.
	 */
	onExecuteNode?: (nodeId: string) => Promise<void>;
	/**
	 * Server-side search callback. Called by search commands when apiNodeId is set.
	 * Signature: (paramName, query) — paramName defaults to 'q'.
	 */
	onSearch?: (paramName: string, query: string) => void;
}

/**
 * A highly capable data grid built on top of TanStack Table.
 * Supports Flat, Paginated, Infinite, and Tree modes with full virtualization and editing.
 */
export function DataGrid<TData extends GridRow>(props: DataGridProps<TData>) {
	const grid = useDataGrid(props);
	const densityVars = DENSITY_VARS[grid.density];

	return (
		<DataGridProvider value={grid}>
			<div
				data-density={grid.density}
				className={cn(
					"relative flex h-full w-full flex-col font-sans",
					props.className,
				)}
				style={densityVars as React.CSSProperties}
			>
				<DataGridInner />
			</div>
		</DataGridProvider>
	);
}
