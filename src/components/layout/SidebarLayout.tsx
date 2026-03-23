import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import type { LayoutConfig } from "@/types";
import { useState } from "react";

interface SidebarLayoutProps {
	config: LayoutConfig;
	renderChild: (child: LayoutConfig["children"][number], index: number) => React.ReactNode;
	className?: string;
}

/**
 * SidebarLayout renders main content with a collapsible side panel.
 * First child is the main content, second child is the sidebar.
 */
export function SidebarLayout({ config, renderChild, className }: SidebarLayoutProps) {
	const [main, sidebar] = config.children;
	const sizes = config.sizes ?? [70, 30];
	const resizable = config.resizable ?? true;
	const defaultCollapsed = sidebar?.defaultCollapsed ?? false;

	const [sidebarOpen] = useState(!defaultCollapsed);

	if (!main) return null;

	return (
		<div className={cn("flex h-full w-full flex-col", className)}>
			<ResizablePanelGroup orientation="horizontal" className="flex-1">
				<ResizablePanel
					defaultSize={sidebar && sidebarOpen ? sizes[0] ?? 70 : 100}
					minSize={main.minSize ?? 30}
					className="min-h-0 min-w-0"
				>
					{renderChild(main, 0)}
				</ResizablePanel>

				{sidebar && sidebarOpen && (
					<>
						<ResizableHandle withHandle={resizable} />
						<ResizablePanel
							defaultSize={sizes[1] ?? 30}
							minSize={sidebar.minSize ?? 15}
							maxSize={sidebar.maxSize ?? 50}
							collapsible={sidebar.collapsible}
							className="min-h-0 min-w-0"
						>
							{renderChild(sidebar, 1)}
						</ResizablePanel>
					</>
				)}
			</ResizablePanelGroup>
		</div>
	);
}
