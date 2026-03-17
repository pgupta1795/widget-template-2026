import { memo } from "react";
import { TableHeader, TableRow, TableBody } from "@/components/ui/table";
import { SkeletonCell } from "@/components/data-grid/features/loading/skeleton-cell";
import { SkeletonHeader } from "@/components/data-grid/features/loading/skeleton-header";
import { getSkeletonWidth } from "@/components/data-grid/utils/grid-utils";
import type { ColumnType } from "@/components/data-grid/types/column-types";

interface SkeletonColumn {
	id: string;
	meta?: { type?: ColumnType };
}

interface DataGridSkeletonProps {
	columns: SkeletonColumn[];
	skeletonRows?: number;
	showHeaderSkeleton?: boolean;
}

export const DataGridSkeleton = memo(function DataGridSkeleton({
	columns,
	skeletonRows = 8,
	showHeaderSkeleton = true,
}: DataGridSkeletonProps) {
	return (
		<>
			{showHeaderSkeleton && (
				<TableHeader>
					<TableRow className="bg-muted/40 border-b-2 border-border hover:bg-muted/40">
						{columns.map((col, i) => (
							<SkeletonHeader key={col.id} index={i} />
						))}
					</TableRow>
				</TableHeader>
			)}
			<TableBody>
				{Array.from({ length: skeletonRows }).map((_, i) => (
					<TableRow
						key={i}
						className="border-b border-border/50 hover:bg-transparent"
					>
						{columns.map((col, j) => (
							<SkeletonCell
								key={col.id}
								width={getSkeletonWidth(col.meta?.type, j)}
							/>
						))}
					</TableRow>
				))}
			</TableBody>
		</>
	);
});
