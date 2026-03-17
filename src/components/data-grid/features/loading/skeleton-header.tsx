import { TableHead } from "@/components/ui/table";

interface SkeletonHeaderProps {
	index: number;
}

export function SkeletonHeader({ index }: SkeletonHeaderProps) {
	const labelWidth = `${50 + (index % 3) * 15}%`;

	return (
		<TableHead className="border-r border-border/30 bg-muted/40 px-(--cell-px)">
			<div className="flex items-center gap-1.5">
				{/* Type icon placeholder */}
				<div className="h-3 w-3 shrink-0 animate-pulse rounded-sm bg-muted/60 motion-reduce:animate-none" />
				{/* Label placeholder */}
				<div
					className="h-[11px] animate-pulse rounded-sm bg-muted/60 motion-reduce:animate-none"
					style={{ width: labelWidth }}
				/>
			</div>
		</TableHead>
	);
}
