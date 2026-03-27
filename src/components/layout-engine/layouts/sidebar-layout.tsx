import { useEffect, useRef } from "react";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useLayoutContext } from "../core/layout-context";
import { LayoutContentRenderer } from "../content/layout-content-renderer";
import type { SidebarLayoutConfig } from "../types/layout.types";

interface SidebarLayoutProps {
	config: SidebarLayoutConfig;
}

export function SidebarLayout({ config }: SidebarLayoutProps) {
	const { panels, togglePanel, setPanelSize } = useLayoutContext();
	const mainRef = useRef<ImperativePanelHandle | null>(null);
	const sideRef = useRef<ImperativePanelHandle | null>(null);

	const sideState = panels[config.sidePanel.id];

	// Sync LayoutContext.togglePanel → react-resizable-panels
	useEffect(() => {
		if (!sideRef.current || !sideState) return;
		if (sideState.isCollapsed && !sideRef.current.isCollapsed()) {
			sideRef.current.collapse();
		} else if (!sideState.isCollapsed && sideRef.current.isCollapsed()) {
			sideRef.current.expand();
		}
	}, [sideState]);

	// Direction: right side panel = main first, side second
	// Left side panel = side first, main second
	const isRightSide = (config.side ?? "left") === "right";

	const mainPanel = (
		<ResizablePanel
			key={config.mainPanel.id}
			ref={mainRef}
			defaultSize={config.mainPanel.defaultSize}
			minSize={config.mainPanel.minSize ?? 30}
			maxSize={config.mainPanel.maxSize}
		>
			<LayoutContentRenderer
				content={config.mainPanel.content}
				panelId={config.mainPanel.id}
			/>
		</ResizablePanel>
	);

	const sidePanel = (
		<ResizablePanel
			key={config.sidePanel.id}
			ref={sideRef}
			defaultSize={config.sidePanel.defaultSize}
			minSize={config.sidePanel.minSize ?? 0}
			maxSize={config.sidePanel.maxSize ?? 50}
			collapsible={config.sidePanel.collapsible ?? true}
			onCollapse={() => {
				if (sideState && !sideState.isCollapsed)
					togglePanel(config.sidePanel.id);
			}}
			onExpand={() => {
				if (sideState?.isCollapsed) togglePanel(config.sidePanel.id);
			}}
			onResize={(size) => setPanelSize(config.sidePanel.id, size)}
		>
			<LayoutContentRenderer
				content={config.sidePanel.content}
				panelId={config.sidePanel.id}
			/>
		</ResizablePanel>
	);

	return (
		<ResizablePanelGroup direction="horizontal" className="h-full w-full">
			{isRightSide ? (
				<>
					{mainPanel}
					<ResizableHandle withHandle />
					{sidePanel}
				</>
			) : (
				<>
					{sidePanel}
					<ResizableHandle withHandle />
					{mainPanel}
				</>
			)}
		</ResizablePanelGroup>
	);
}
