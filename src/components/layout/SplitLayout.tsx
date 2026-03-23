import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn } from "@/lib/utils";
import type { LayoutConfig } from "@/types";

interface SplitLayoutProps {
	config: LayoutConfig;
	renderChild: (child: LayoutConfig["children"][number], index: number) => React.ReactNode;
	className?: string;
}

/**
 * SplitLayout renders children in resizable split panels.
 * Supports horizontal/vertical orientation with configurable sizes.
 */
export function SplitLayout({ config, renderChild, className }: SplitLayoutProps) {
	const orientation = config.direction ?? "horizontal";
	const sizes = config.sizes ?? config.children.map(() => 100 / config.children.length);
	const resizable = config.resizable ?? true;

	return (
		<ResizablePanelGroup
			orientation={orientation}
			className={cn("h-full w-full", className)}
		>
			{config.children.map((child, index) => (
				<SplitChild
					key={child.configId}
					child={child}
					index={index}
					defaultSize={sizes[index] ?? 50}
					isLast={index === config.children.length - 1}
					resizable={resizable}
					renderChild={renderChild}
				/>
			))}
		</ResizablePanelGroup>
	);
}

function SplitChild({
	child,
	index,
	defaultSize,
	isLast,
	resizable,
	renderChild,
}: {
	child: LayoutConfig["children"][number];
	index: number;
	defaultSize: number;
	isLast: boolean;
	resizable: boolean;
	renderChild: (child: LayoutConfig["children"][number], index: number) => React.ReactNode;
}) {
	return (
		<>
			<ResizablePanel
				defaultSize={defaultSize}
				minSize={child.minSize ?? 10}
				maxSize={child.maxSize ?? 90}
				className="min-h-0 min-w-0"
			>
				{renderChild(child, index)}
			</ResizablePanel>
			{!isLast && <ResizableHandle withHandle={resizable} />}
		</>
	);
}
