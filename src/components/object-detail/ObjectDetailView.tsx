// src/components/object-detail/ObjectDetailView.tsx

import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Info, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { DetailTabs } from "./DetailTabs";
import { HeaderBar } from "./HeaderBar";
import { PropertiesPanel } from "./PropertiesPanel";
import type { ObjectDetailConfig } from "./types";

interface ObjectDetailViewProps {
	config: ObjectDetailConfig;
	data: Record<string, unknown>;
	params?: Record<string, string>;
	className?: string;
}

export function ObjectDetailView({
	config,
	data,
	params,
	className,
}: ObjectDetailViewProps) {
	const { header, propertiesPanel, tabs } = config;
	const panelRef = useRef<PanelImperativeHandle | null>(null);
	const [isPanelOpen, setIsPanelOpen] = useState(
		propertiesPanel.defaultOpen !== false,
	);

	const togglePanel = useCallback(() => {
		const panel = panelRef.current;
		if (!panel) return;

		if (isPanelOpen) {
			panel.collapse();
			setIsPanelOpen(false);
		} else {
			panel.expand();
			setIsPanelOpen(true);
		}
	}, [isPanelOpen]);

	const handlePanelResize = useCallback(() => {
		const panel = panelRef.current;
		if (!panel) return;
		setIsPanelOpen(!panel.isCollapsed());
	}, []);

	const title = String(data[header.titleField] ?? config.title);
	const badgeValue = header.badgeField
		? String(data[header.badgeField] ?? "")
		: undefined;

	return (
		<div className={cn("flex h-full flex-col overflow-hidden", className)}>
			{/* Header bar with info toggle */}
			<div className="relative">
				<HeaderBar
					icon={config.icon}
					title={title}
					badgeValue={badgeValue}
					subtitleFields={header.subtitleFields}
					data={data}
				/>
				<Button
					variant="ghost"
					size="icon-sm"
					className="absolute top-3 right-3"
					aria-label={
						isPanelOpen ? "Close properties panel" : "Open properties panel"
					}
					onClick={togglePanel}
				>
					{isPanelOpen ? <X className="size-4" /> : <Info className="size-4" />}
				</Button>
			</div>

			{/* Main content + properties panel */}
			<ResizablePanelGroup orientation="horizontal" className="flex-1">
				{/* Main content: tabs with tables */}
				<ResizablePanel defaultSize={75} minSize={40}>
					<DetailTabs tabs={tabs} params={params} />
				</ResizablePanel>

				<ResizableHandle withHandle />

				{/* Properties panel */}
				<ResizablePanel
					panelRef={panelRef}
					defaultSize={propertiesPanel.defaultSize ?? 25}
					minSize={propertiesPanel.minSize ?? 15}
					collapsible
					collapsedSize={0}
					onResize={handlePanelResize}
				>
					<PropertiesPanel
						title={title}
						icon={config.icon}
						form={propertiesPanel.form}
						params={params}
						editable={propertiesPanel.editable}
					/>
				</ResizablePanel>
			</ResizablePanelGroup>
		</div>
	);
}
