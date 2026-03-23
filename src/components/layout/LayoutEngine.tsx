import type { LayoutConfig } from "@/types";
import { SidebarLayout } from "./SidebarLayout";
import { SplitLayout } from "./SplitLayout";
import { StackLayout } from "./StackLayout";

interface LayoutEngineProps {
	config: LayoutConfig;
	renderChild: (child: LayoutConfig["children"][number], index: number) => React.ReactNode;
	className?: string;
}

/**
 * LayoutEngine dispatches to the appropriate layout component based on config type.
 */
export function LayoutEngine({ config, renderChild, className }: LayoutEngineProps) {
	switch (config.type) {
		case "split":
			return (
				<SplitLayout config={config} renderChild={renderChild} className={className} />
			);
		case "stack":
			return (
				<StackLayout config={config} renderChild={renderChild} className={className} />
			);
		case "sidebar":
			return (
				<SidebarLayout config={config} renderChild={renderChild} className={className} />
			);
		default:
			return (
				<div className="p-4 text-xs text-destructive">
					Unknown layout type: {(config as LayoutConfig).type}
				</div>
			);
	}
}
