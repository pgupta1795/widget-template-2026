import { cn } from "@/lib/utils";
import type { TabConfig } from "@/types";
import { useState } from "react";
import { Tab } from "./Tab";

interface TabContainerProps {
	tabs: TabConfig[];
	defaultActiveId?: string;
	onTabChange?: (tabId: string) => void;
	renderContent?: (tab: TabConfig) => React.ReactNode;
	className?: string;
}

export function TabContainer({
	tabs,
	defaultActiveId,
	onTabChange,
	renderContent,
	className,
}: TabContainerProps) {
	const visibleTabs = tabs.filter((t) => {
		if (typeof t.visible === "boolean") return t.visible;
		return true;
	});

	const [activeId, setActiveId] = useState(
		defaultActiveId ?? visibleTabs[0]?.id ?? "",
	);

	const activeTab = visibleTabs.find((t) => t.id === activeId);

	const handleTabChange = (tabId: string) => {
		setActiveId(tabId);
		onTabChange?.(tabId);
	};

	return (
		<div className={cn("flex min-h-0 flex-1 flex-col", className)}>
			{/* Tab bar */}
			<div
				role="tablist"
				className="flex shrink-0 items-center gap-0 border-b border-border bg-background px-1"
			>
				{visibleTabs.map((tab) => (
					<Tab
						key={tab.id}
						tab={tab}
						isActive={tab.id === activeId}
						onClick={() => handleTabChange(tab.id)}
					/>
				))}
			</div>

			{/* Tab content */}
			<div role="tabpanel" className="min-h-0 flex-1 overflow-auto">
				{activeTab && renderContent?.(activeTab)}
			</div>
		</div>
	);
}
