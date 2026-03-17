import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";

interface SortIndicatorProps {
	direction: "asc" | "desc" | false;
	sortIndex?: number;
}

export function SortIndicator({ direction, sortIndex }: SortIndicatorProps) {
	return (
		<span className="transition-all duration-150 inline-flex items-center gap-0.5 shrink-0">
			{direction === "asc" && <ArrowUp className="h-3 w-3 text-primary" />}
			{direction === "desc" && <ArrowDown className="h-3 w-3 text-primary" />}
			{direction === false && (
				<ArrowUpDown className="h-3 w-3 text-muted-foreground/40" />
			)}
			{direction !== false && sortIndex !== undefined && sortIndex >= 0 && (
				<span className="text-[9px] leading-none font-bold text-primary tabular-nums">
					{sortIndex + 1}
				</span>
			)}
		</span>
	);
}
