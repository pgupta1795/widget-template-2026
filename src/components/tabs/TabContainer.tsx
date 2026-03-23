import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { TabConfig } from "@/types";
import { useState } from "react";

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

	const defaultValue = defaultActiveId ?? visibleTabs[0]?.id ?? "";
	const [activeId, setActiveId] = useState(defaultValue);

	const handleTabChange = (value: string | null) => {
		if (value === null) return;
		setActiveId(value);
		onTabChange?.(value);
	};

	return (
		<Tabs
			value={activeId}
			onValueChange={handleTabChange}
			className={cn("flex min-h-0 flex-1 flex-col", className)}
		>
			<TabsList variant="line" className="shrink-0 border-b border-border bg-background px-1">
				{visibleTabs.map((tab) => {
					const isDisabled =
						typeof tab.disabled === "boolean" ? tab.disabled : false;
					return (
						<TabsTrigger
							key={tab.id}
							value={tab.id}
							disabled={isDisabled}
						>
							{tab.icon && (
								<span className="text-[14px] leading-none">{tab.icon}</span>
							)}
							{tab.label}
							{typeof tab.badge === "string" && tab.badge && (
								<Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
									{tab.badge}
								</Badge>
							)}
						</TabsTrigger>
					);
				})}
			</TabsList>

			{visibleTabs.map((tab) => (
				<TabsContent
					key={tab.id}
					value={tab.id}
					className="min-h-0 flex-1 overflow-auto"
				>
					{tab.id === activeId && renderContent?.(tab)}
				</TabsContent>
			))}
		</Tabs>
	);
}
