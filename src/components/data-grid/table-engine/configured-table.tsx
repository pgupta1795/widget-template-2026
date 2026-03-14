// src/components/data-grid/table-engine/configured-table.tsx
import { useMemo } from "react";
import { DataGrid } from "@/components/data-grid/data-grid";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { createDefaultEngine } from "./bootstrap";
import { useDAGTable } from "./hooks/use-dag-table";
import type { JsonPrimitive } from "./types/dag.types";
import type { DAGTableConfig } from "./types/table.types";

export interface ConfiguredTableProps {
	config: DAGTableConfig;
	className?: string;
	params?: Record<string, JsonPrimitive>;
}

/**
 * Declarative table component. Pass a DAGTableConfig and get a fully-featured DataGrid.
 *
 * Handles:
 * - DAG-based API fetching with topological wave execution
 * - JSONata data transforms and per-cell derived values
 * - Flat, Paginated, Infinite, and Tree modes
 * - Lazy row expansion via RowExpandNode
 * - Row/toolbar/cell actions via ActionNode
 */
export function ConfiguredTable({
	config,
	className,
	params,
}: ConfiguredTableProps) {
	// One engine instance per table mount — createDefaultEngine is cheap
	const engine = useMemo(() => createDefaultEngine(), []);

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
	} = useDAGTable(config, engine, params);

	// Strip engine-only feature fields before passing to DataGrid
	const {
		columnOrdering: _co,
		columnResizing: _cr,
		columnVisibility: _cv,
		...gridFeatures
	} = config.features ?? {};

	if (error) {
		return (
			<Alert variant="destructive" className="m-4">
				<AlertTitle>Failed to load table</AlertTitle>
				<AlertDescription>{error.message}</AlertDescription>
			</Alert>
		);
	}

	// For infinite mode: DataGrid's infinite query setup conflicts with useDAGTable's.
	// Solution: Pass the data as flat mode, but include fetchNextPage/hasNextPage
	// so DataGrid can still support "load more" via virtual scrolling.
	const gridMode =
		config.mode === "infinite" ? ("flat" as const) : config.mode;

	return (
		<DataGrid
			data={data}
			columns={columns}
			mode={gridMode}
			features={gridFeatures}
			density={config.density}
			isLoading={isLoading}
			initialColumnVisibility={columnVisibility}
			isFetchingNextPage={isFetchingNextPage}
			hasNextPage={hasNextPage}
			fetchNextPage={fetchNextPage}
			onExpand={onExpand}
			className={className}
		/>
	);
}
