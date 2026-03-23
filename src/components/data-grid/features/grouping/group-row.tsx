import type { GridRow } from "@/components/data-grid/types/grid-types";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Row } from "@tanstack/react-table";
import { flexRender } from "@tanstack/react-table";
import { ChevronDown, ChevronRight } from "lucide-react";

interface GroupRowProps {
	row: Row<GridRow>;
}

export function GroupRow({ row }: GroupRowProps) {
	const isExpanded = row.getIsExpanded();

	return (
		<TableRow
			className="cursor-pointer border-b border-border bg-muted/50 transition-colors duration-100 hover:bg-muted/70"
			onClick={() => row.toggleExpanded()}
		>
			{row.getVisibleCells().map((cell) => {
				if (cell.getIsGrouped()) {
					return (
						<TableCell
							key={cell.id}
							className="border-r border-border/30 px-(--cell-px) py-1.5 last:border-r-0"
						>
							<div className="flex items-center gap-1.5">
								{isExpanded ? (
									<ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150" />
								) : (
									<ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-150" />
								)}
								<span className="text-[12px] font-medium">
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</span>
								<span className="text-[11px] text-muted-foreground">
									({row.subRows.length})
								</span>
							</div>
						</TableCell>
					);
				}

				if (cell.getIsAggregated()) {
					return (
						<TableCell
							key={cell.id}
							className={cn(
								"border-r border-border/30 px-(--cell-px) py-1.5 last:border-r-0",
								"text-right font-mono text-[11px] text-muted-foreground",
							)}
						>
							{flexRender(
								cell.column.columnDef.aggregatedCell ??
									cell.column.columnDef.cell,
								cell.getContext(),
							)}
						</TableCell>
					);
				}

				// Placeholder
				return (
					<TableCell
						key={cell.id}
						className="border-r border-border/30 px-(--cell-px) py-1.5 last:border-r-0"
					/>
				);
			})}
		</TableRow>
	);
}
