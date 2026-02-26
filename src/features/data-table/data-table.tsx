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
import { ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
	Pagination,
	PaginationContent,
	PaginationItem,
	PaginationLink,
	PaginationNext,
	PaginationPrevious,
} from "@/components/ui/pagination";
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
	const [columnVisibility, setColumnVisibility] = useState({});

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
						onCommand={(cmd, rowData) => {
							onCommand?.(cmd, rowData);
							toast.success(`${cmd.label} action triggered.`);
						}}
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
		state: { sorting, globalFilter, rowSelection, expanded, columnVisibility },
		onSortingChange: setSorting,
		onGlobalFilterChange: setGlobalFilter,
		onRowSelectionChange: setRowSelection,
		onExpandedChange: setExpanded,
		onColumnVisibilityChange: setColumnVisibility,
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
				{["row-a", "row-b", "row-c", "row-d", "row-e"].map((key) => (
					<Skeleton key={key} className="h-8 w-full" />
				))}
			</div>
		);
	}

	const pageIndex = table.getState().pagination.pageIndex;
	const pageCount = table.getPageCount();

	return (
		<div className={cn("flex flex-col overflow-hidden", className)}>
			<TableToolbar
				table={table}
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
								className="bg-muted/60 hover:bg-muted/60"
							>
								{headerGroup.headers.map((header) => (
									<TableHead
										key={header.id}
										className={cn(
											"h-7 px-2.5 text-[0.6875rem] font-semibold text-muted-foreground",
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
											{header.column.getCanSort() ? (
												<ArrowUpDown className="size-3 text-muted-foreground/70" />
											) : null}
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
								<ContextMenu key={row.id}>
									<ContextMenuTrigger className="contents">
										<TableRow
											data-state={row.getIsSelected() ? "selected" : undefined}
											className="transition-colors hover:bg-muted/20"
										>
											{row.getVisibleCells().map((cell) => (
												<TableCell
													key={cell.id}
													className="h-7 px-2.5 py-0 text-[0.6875rem]"
												>
													{flexRender(
														cell.column.columnDef.cell,
														cell.getContext(),
													)}
												</TableCell>
											))}
										</TableRow>
									</ContextMenuTrigger>
									<ContextMenuContent>
										{config.commands.map((cmd) => (
											<ContextMenuItem
												key={`${row.id}-${cmd.id}`}
												onClick={() => {
													onCommand?.(cmd, row.original);
													toast.success(`${cmd.label} executed.`);
												}}
											>
												{cmd.label}
											</ContextMenuItem>
										))}
									</ContextMenuContent>
								</ContextMenu>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{config.pagination && pageCount > 0 && (
				<div className="shrink-0 border-t border-border px-3 py-1.5">
					<div className="flex items-center justify-between">
						<p className="text-[0.6875rem] text-muted-foreground">
							Page {pageIndex + 1} of {pageCount}
						</p>
						<Pagination className="mx-0 w-auto justify-end">
							<PaginationContent>
								<PaginationItem>
									<PaginationPrevious
										href="#"
										onClick={(e) => {
											e.preventDefault();
											table.previousPage();
										}}
										aria-disabled={!table.getCanPreviousPage()}
										className={
											!table.getCanPreviousPage()
												? "pointer-events-none opacity-50"
												: ""
										}
									/>
								</PaginationItem>
								{getVisiblePageNumbers(pageIndex, pageCount).map((page) => (
									<PaginationItem key={page}>
										<PaginationLink
											href="#"
											isActive={page === pageIndex}
											onClick={(e) => {
												e.preventDefault();
												table.setPageIndex(page);
											}}
										>
											{page + 1}
										</PaginationLink>
									</PaginationItem>
								))}
								<PaginationItem>
									<PaginationNext
										href="#"
										onClick={(e) => {
											e.preventDefault();
											table.nextPage();
										}}
										aria-disabled={!table.getCanNextPage()}
										className={
											!table.getCanNextPage()
												? "pointer-events-none opacity-50"
												: ""
										}
									/>
								</PaginationItem>
							</PaginationContent>
						</Pagination>
					</div>
				</div>
			)}
		</div>
	);
}

function getVisiblePageNumbers(current: number, total: number) {
	if (total <= 5) return Array.from({ length: total }, (_, i) => i);
	if (current < 2) return [0, 1, 2, 3, 4];
	if (current > total - 3)
		return [total - 5, total - 4, total - 3, total - 2, total - 1];
	return [current - 2, current - 1, current, current + 1, current + 2];
}
