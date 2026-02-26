import { Settings } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { TabDefinition } from "@/types/config";
import { AdminTab } from "./admin-tab";
import { useTabs } from "./use-tabs";

type TabManagerProps = {
	tabs: TabDefinition[];
	defaultTab?: string;
	renderTabContent: (tab: TabDefinition) => React.ReactNode;
	showAdmin?: boolean;
	className?: string;
};

export function TabManager({
	tabs,
	defaultTab,
	renderTabContent,
	showAdmin = true,
	className,
}: TabManagerProps) {
	const {
		visibleTabs,
		allTabs,
		activeTab,
		setActiveTab,
		toggleTab,
		reorderTabs,
	} = useTabs(tabs, defaultTab);

	return (
		<Tabs
			value={activeTab}
			onValueChange={setActiveTab}
			className={cn("flex flex-col overflow-hidden", className)}
		>
			<TabsList className="w-full shrink-0 justify-start border-b border-border rounded-none bg-card px-3 h-9 gap-0">
				{visibleTabs.map((tab) => (
					<TabsTrigger
						key={tab.id}
						value={tab.id}
						className="rounded-none border-b-2 border-transparent h-9 px-4 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/50 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:font-semibold data-[state=active]:shadow-none"
					>
						{tab.label}
						{tab.badge && (
							<span className="ml-1.5 rounded-full bg-primary/10 text-primary px-1.5 py-0.5 text-[0.625rem] font-medium">
								{tab.badge}
							</span>
						)}
					</TabsTrigger>
				))}
				{showAdmin && (
					<TabsTrigger
						value="__admin"
						className="ml-auto rounded-none border-b-2 border-transparent h-9 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
					>
						<Settings className="size-3.5" />
					</TabsTrigger>
				)}
			</TabsList>

			{visibleTabs.map((tab) => (
				<TabsContent key={tab.id} value={tab.id} className="flex-1 overflow-hidden mt-0">
					<Suspense fallback={<TabSkeleton />}>
						{renderTabContent(tab)}
					</Suspense>
				</TabsContent>
			))}

			{showAdmin && (
				<TabsContent value="__admin" className="flex-1 overflow-auto mt-0">
					<AdminTab
						tabs={allTabs}
						onToggle={toggleTab}
						onReorder={reorderTabs}
					/>
				</TabsContent>
			)}
		</Tabs>
	);
}

function TabSkeleton() {
	return (
		<div className="space-y-3 p-4">
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-full" />
			<Skeleton className="h-8 w-3/4" />
		</div>
	);
}
