import { Fragment, useEffect, useRef } from "react";
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "@/components/ui/resizable";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { useLayoutContext } from "../core/layout-context";
import { LayoutContentRenderer } from "../content/layout-content-renderer";
import type { StackLayoutConfig } from "../types/layout.types";

interface StackLayoutProps {
	config: StackLayoutConfig;
}

export function StackLayout({ config }: StackLayoutProps) {
	const { panels, togglePanel, setPanelSize } = useLayoutContext();
	const panelRefs = useRef<Record<string, ImperativePanelHandle | null>>({});

	useEffect(() => {
		for (const panel of config.panels) {
			const ref = panelRefs.current[panel.id];
			if (!ref) continue;
			const state = panels[panel.id];
			if (!state) continue;
			if (state.isCollapsed && !ref.isCollapsed()) ref.collapse();
			if (!state.isCollapsed && ref.isCollapsed()) ref.expand();
		}
	}, [panels, config.panels]);

	return (
		<ResizablePanelGroup
			direction="vertical"
			className="h-full w-full"
			onLayout={(sizes) => {
				config.panels.forEach((panel, i) => {
					setPanelSize(panel.id, sizes[i] ?? panel.defaultSize);
				});
			}}
		>
			{config.panels.map((panel, index) => (
				<Fragment key={panel.id}>
					{index > 0 && <ResizableHandle withHandle />}
					<ResizablePanel
						ref={(el) => {
							panelRefs.current[panel.id] = el;
						}}
						defaultSize={panel.defaultSize}
						minSize={panel.minSize ?? 10}
						maxSize={panel.maxSize}
						collapsible={panel.collapsible}
						onCollapse={() => {
							const state = panels[panel.id];
							if (state && !state.isCollapsed) togglePanel(panel.id);
						}}
						onExpand={() => {
							const state = panels[panel.id];
							if (state?.isCollapsed) togglePanel(panel.id);
						}}
					>
						<LayoutContentRenderer content={panel.content} panelId={panel.id} />
					</ResizablePanel>
				</Fragment>
			))}
		</ResizablePanelGroup>
	);
}
