import { cn } from "@/lib/utils";
import type { LayoutConfig } from "@/types";

interface StackLayoutProps {
	config: LayoutConfig;
	renderChild: (child: LayoutConfig["children"][number], index: number) => React.ReactNode;
	className?: string;
}

/**
 * StackLayout renders children in a vertical stack.
 * Each child fills available space according to its type.
 */
export function StackLayout({ config, renderChild, className }: StackLayoutProps) {
	return (
		<div className={cn("flex h-full w-full flex-col", className)}>
			{config.children.map((child, index) => (
				<div
					key={child.configId}
					className={cn(
						"min-h-0",
						// Give flexible children (tabs, tables, layouts) flex-1
						["tabs", "table", "layout"].includes(child.type) && "flex-1",
					)}
				>
					{renderChild(child, index)}
				</div>
			))}
		</div>
	);
}
