import { useDataGridContext } from "@/components/data-grid/data-grid-context";
import type { GridRow } from "@/components/data-grid/types/grid-types";
import { cn } from "@/lib/utils";
import type { Row } from "@tanstack/react-table";
import { ChevronRight, Loader2 } from "lucide-react";

export function ExpandToggle({ row }: { row: Row<GridRow> }) {
	const { handleExpand, loadingRowIds } = useDataGridContext();
	const isLoadingChildren = loadingRowIds.has(row.id);
	const canExpand = row.original._hasChildren === true || row.getCanExpand();

	if (!canExpand) return null;

	return (
		<button
			onClick={async (e) => {
				e.stopPropagation();
				const nextExpanded = !row.getIsExpanded();
				row.toggleExpanded(nextExpanded);

				if (nextExpanded) {
					await handleExpand(row);
				}
			}}
			style={{ paddingLeft: `${row.depth * 20}px` }}
			aria-label={row.getIsExpanded() ? "Collapse row" : "Expand row"}
			aria-expanded={row.getIsExpanded()}
			className="flex items-center gap-1 text-muted-foreground transition-colors hover:text-foreground"
		>
			{isLoadingChildren ? (
				<Loader2 size={14} className="animate-spin" />
			) : (
				<ChevronRight
					size={14}
					className={cn(
						"transition-transform duration-150",
						row.getIsExpanded() && "rotate-90",
					)}
				/>
			)}
		</button>
	);
}

// eslint-disable-next-line react-refresh/only-export-components
export const expandColumnDef = {
	id: "__expand__",
	size: 32,
	maxSize: 32,
	enableSorting: false,
	enableResizing: false,
	enableHiding: false,
	header: () => null,
	cell: ({ row }: { row: Row<GridRow> }) => <ExpandToggle row={row} />,
};
