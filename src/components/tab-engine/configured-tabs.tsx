import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { resolveLucideIcon } from "@/components/data-grid/toolbar/icon-resolver";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import { getConfig } from "./core/tab-config-registry";
import { tabContentRegistry } from "./core/tab-content-registry";
import { useTabDisplay } from "./hooks/use-tab-display";
import { tabTriggerVariants } from "./tab-trigger-variants";
import type { DAGTabConfig } from "./types/tab.types";

export interface ConfiguredTabsProps {
	config: DAGTabConfig;
	params?: Record<string, JsonPrimitive>;
	defaultTabId?: string;
	onTabChange?: (tabId: string) => void;
	className?: string;
}

export function ConfiguredTabs({
	config,
	params = {},
	defaultTabId,
	onTabChange,
	className,
}: ConfiguredTabsProps) {
	const { visibleTabs, activeTabId } = useTabDisplay(
		config.tabs,
		params,
		defaultTabId,
	);
	const [activeTab, setActiveTab] = useState(() => config.tabs[0]?.id ?? "");
	useEffect(() => {
		if (activeTabId) setActiveTab(activeTabId);
	}, [activeTabId]);
	const indicatorStyle = config.indicatorStyle ?? "underline";

	if (visibleTabs.length === 0) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				No content available.
			</div>
		);
	}

	return (
		<Tabs
			value={activeTab}
			onValueChange={(value) => {
				setActiveTab(value as string);
				onTabChange?.(value as string);
			}}
			className={cn("flex h-full flex-col", className)}
		>
			<TabsList
				className={cn(
					"h-auto w-full justify-start rounded-none border-b bg-transparent p-0",
					indicatorStyle === "underline" ? "gap-0" : "gap-1 p-1",
					config.className,
				)}
			>
				{visibleTabs.map((tab) => {
					const Icon = tab.icon ? resolveLucideIcon(tab.icon) : null;
					return (
						<TabsTrigger
							key={tab.id}
							value={tab.id}
							disabled={tab.disabled}
							className={cn(
								tabTriggerVariants({ indicatorStyle }),
								tab.className,
							)}
							style={tab.color ? { color: tab.color } : undefined}
						>
							{Icon && <Icon className="size-4" />}
							{tab.label}
						</TabsTrigger>
					);
				})}
			</TabsList>

			{visibleTabs.map((tab) => {
				const tabConfig = getConfig(tab.content.configPath);
				if (!tabConfig) {
					return (
						<TabsContent
							key={tab.id}
							value={tab.id}
							className="flex-1 overflow-auto"
						>
							<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
								Content not available: "{tab.content.configPath}" not
								registered.
							</div>
						</TabsContent>
					);
				}

				let renderer:
					| ((
							config: unknown,
							params: Record<string, JsonPrimitive>,
					  ) => React.ReactNode)
					| null = null;
				try {
					renderer = tabContentRegistry.resolve(tab.content.type).render;
				} catch {
					return (
						<TabsContent
							key={tab.id}
							value={tab.id}
							className="flex-1 overflow-auto"
						>
							<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
								Unknown content type: "{tab.content.type}"
							</div>
						</TabsContent>
					);
				}

				return (
					<TabsContent
						key={tab.id}
						value={tab.id}
						className="mt-0 flex-1 overflow-auto"
					>
						{renderer(tabConfig, params)}
					</TabsContent>
				);
			})}
		</Tabs>
	);
}
