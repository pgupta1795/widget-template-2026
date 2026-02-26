import {
	type ExpandedState,
	flexRender,
	getCoreRowModel,
	getExpandedRowModel,
	getFilteredRowModel,
	getPaginationRowModel,
	getSortedRowModel,
	type RowSelectionState,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { CommandDefinition, TableConfig } from "@/types/config";
import { buildColumns } from "./table-columns";
import { TableCommands } from "./table-commands";
import { TableToolbar } from "./table-toolbar";

type RowData = Record<string, unknown>;

type DataTableProps = {
	config: TableConfig;
	data: RowData[];
	isLoading?: boolean;
	onCommand?: (command: CommandDefinition, row: RowData) => void;
	onToolbarAction?: (actionId: string) => void;
	className?: string;
};

export function DataTable({
	config,
	data,
	isLoading,
	onCommand,
	onToolbarAction,
	className,
}: DataTableProps) {
	const [sorting, setSorting] = useState<SortingState>(
		config.defaultSort ? [config.defaultSort] : [],
	);
	const [globalFilter, setGlobalFilter] = useState("");
	const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
	const [expanded, setExpanded] = useState<ExpandedState>({});

	const columns = useMemo(() => {
		const cols = buildColumns(config.columns, {
			selectable: config.selectable,
		});

		if (config.commands.length > 0) {
			cols.push({
				id: "__commands",
				header: "",
				cell: ({ row }) => (
					<TableCommands
						commands={config.commands}
						row={row.original}
						onCommand={(cmd, data) => onCommand?.(cmd, data)}
					/>
				),
				size: config.commands.length * 28 + 16,
				enableSorting: false,
			});
		}

		return cols;
	}, [config.columns, config.commands, config.selectable, onCommand]);

	const table = useReactTable({
		data,
		columns,
		state: { sorting, globalFilter, rowSelection, expanded },
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onRowSelectionChange: setRowSelection,
		onExpandedChange: setExpanded,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		...(config.pagination && {
			getPaginationRowModel: getPaginationRowModel(),
		}),
		...(config.expandable && { getExpandedRowModel: getExpandedRowModel() }),
		initialState: {
			...(config.pagination && {
				pagination: { pageSize: config.pagination.pageSize },
			}),
		},
	});

	if (isLoading) {
		return (
			<div className="space-y-1 p-4">
				{Array.from({ length: 5 }).map((_, i) => (
					<Skeleton key={i} className="h-8 w-full" />
				))}
			</div>
		);
	}

	return (
		<div className={cn("flex flex-col overflow-hidden", className)}>
			<TableToolbar
				config={config.toolbar}
				globalFilter={globalFilter}
				onGlobalFilterChange={setGlobalFilter}
				totalItems={data.length}
				selectedItems={Object.keys(rowSelection).length}
				onAction={onToolbarAction}
			/>

			<div className="flex-1 overflow-auto">
				<Table>
					<TableHeader>
						{table.getHeaderGroups().map((headerGroup) => (
							<TableRow
								key={headerGroup.id}
								className="bg-muted hover:bg-muted"
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
			</div>

			{config.pagination && (
				<div className="shrink-0 flex items-center justify-between border-t px-4 py-2">
					<p className="text-xs text-muted-foreground">
						Page {table.getState().pagination.pageIndex + 1} of{" "}
						{table.getPageCount()}
					</p>
					<div className="flex items-center gap-1">
						<Button
							variant="outline"
							size="icon-xs"
							onClick={() => table.previousPage()}
							disabled={!table.getCanPreviousPage()}
						>
							<ChevronLeft />
						</Button>
						<Button
							variant="outline"
							size="icon-xs"
							onClick={() => table.nextPage()}
							disabled={!table.getCanNextPage()}
						>
							<ChevronRight />
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
