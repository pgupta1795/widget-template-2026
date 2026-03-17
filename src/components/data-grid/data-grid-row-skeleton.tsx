import { memo } from "react";
import { TableRow } from "@/components/ui/table";
import { SkeletonCell } from "@/components/data-grid/features/loading/skeleton-cell";
import { getSkeletonWidth } from "@/components/data-grid/utils/grid-utils";
import type { ColumnType } from "@/components/data-grid/types/column-types";

interface SkeletonColumn {
	id: string;
	meta?: { type?: ColumnType };
}

interface DataGridRowSkeletonProps {
	columns: SkeletonColumn[];
}

export const DataGridRowSkeleton = memo(function DataGridRowSkeleton({
	columns,
}: DataGridRowSkeletonProps) {
	return (
		<TableRow className="border-b border-border/50 hover:bg-transparent">
			{columns.map((col, i) => (
				<SkeletonCell
					key={col.id}
					width={getSkeletonWidth(col.meta?.type, i)}
				/>
			))}
		</TableRow>
	);
});
