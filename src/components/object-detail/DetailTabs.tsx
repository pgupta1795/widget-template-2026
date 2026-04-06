import { ConfiguredTable } from "@/components/data-grid/table-engine";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { icons, type LucideIcon } from "lucide-react";
import type { TabConfig } from "./types";

interface DetailTabsProps {
	tabs: TabConfig[];
	defaultTab?: string;
	params?: Record<string, string>;
	className?: string;
}

function getIcon(name: string): LucideIcon | null {
	return (icons as Record<string, LucideIcon>)[name] ?? null;
}

export function DetailTabs({
	tabs,
	defaultTab,
	params,
	className,
}: DetailTabsProps) {
	const activeDefault = defaultTab ?? tabs[0]?.id;

	return (
		<Tabs
			defaultValue={activeDefault}
			className={cn("flex h-full flex-col", className)}
		>
			<div className="shrink-0 border-b bg-card/60 px-4">
				<TabsList variant="line" className="h-10 gap-5">
					{tabs.map((tab) => {
						const Icon = getIcon(tab.icon);
						return (
							<TabsTrigger
								key={tab.id}
								value={tab.id}
								className="gap-1.5 px-0.5 pb-0.5 text-sm font-medium data-active:text-primary"
							>
								{Icon && <Icon className="size-3.5" />}
								{tab.label}
							</TabsTrigger>
						);
					})}
				</TabsList>
			</div>

			{tabs.map((tab) => (
				<TabsContent
					key={tab.id}
					value={tab.id}
					className="mt-0 flex flex-1 flex-col overflow-hidden p-2"
				>
					<div className="min-h-0 flex-1 overflow-hidden">
						{tab.type === "table" && (
							<ConfiguredTable
								config={tab.tableConfig}
								params={params}
								className="h-full"
							/>
						)}
					</div>
				</TabsContent>
			))}
		</Tabs>
	);
}
