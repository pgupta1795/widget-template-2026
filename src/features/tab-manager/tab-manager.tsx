import { Settings } from "lucide-react";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
		<Tabs value={activeTab} onValueChange={setActiveTab} className={className}>
			<TabsList className="w-full justify-start border-b rounded-none bg-transparent px-4 h-auto gap-0">
				{visibleTabs.map((tab) => (
					<TabsTrigger
						key={tab.id}
						value={tab.id}
						className="rounded-none border-b-2 border-transparent px-4 py-2 text-xs text-muted-foreground transition-colors data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
					>
						{tab.label}
						{tab.badge && (
							<span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[0.625rem]">
								{tab.badge}
							</span>
						)}
					</TabsTrigger>
				))}
				{showAdmin && (
					<TabsTrigger
						value="__admin"
						className="ml-auto rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-2 py-2"
					>
						<Settings className="size-3.5" />
					</TabsTrigger>
				)}
			</TabsList>

			{visibleTabs.map((tab) => (
				<TabsContent key={tab.id} value={tab.id} className="mt-0">
					<Suspense fallback={<TabSkeleton />}>
						{renderTabContent(tab)}
					</Suspense>
				</TabsContent>
			))}

			{showAdmin && (
				<TabsContent value="__admin" className="mt-0">
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
