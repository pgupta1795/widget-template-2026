import { useQuery } from "@tanstack/react-query";
import {
	ChevronLeft,
	ChevronRight,
	Info,
	ListTree,
	MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { createQueryOptions } from "@/services/query-factory";
import type { PanelConfig } from "@/types/config";
import { AttributeList } from "./attribute-list";

type SidePanelProps = {
	config: PanelConfig | null;
	objectId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	collapsed?: boolean;
	onToggleCollapsed?: () => void;
};

const WIDTH_MAP = {
	sm: "w-72",
	md: "w-[360px]",
	lg: "w-[420px]",
};

export function SidePanel({
	config,
	objectId,
	open,
	onOpenChange,
	collapsed = false,
	onToggleCollapsed,
}: SidePanelProps) {
	const isMobile = useIsMobile();

	const { data, isLoading } = useQuery({
		...createQueryOptions(
			config?.endpoint ?? {
				id: "__panel_stub__",
				method: "GET",
				url: "",
			},
			{ objectId: objectId ?? "" },
			{ single: true },
		),
		enabled: open && !!objectId && !!config,
	});

	if (!config || !open) {
		return null;
	}

	if (isMobile) {
		return (
			<Drawer open={open} onOpenChange={onOpenChange} direction="right">
				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>{config.title}</DrawerTitle>
						<DrawerDescription>Object details</DrawerDescription>
					</DrawerHeader>
					<div className="px-4 pb-4">
						<PanelBody config={config} data={data} isLoading={isLoading} />
					</div>
				</DrawerContent>
			</Drawer>
		);
	}

	return (
		<aside
			className={cn(
				"shrink-0 border-l border-border bg-card transition-[width] duration-200",
				collapsed ? "w-11" : WIDTH_MAP[config.width ?? "md"],
			)}
		>
			<div className="flex h-9 items-center justify-between border-b border-border px-1.5">
				<div className={cn("flex items-center gap-0.5", collapsed && "hidden")}>
					<Button variant="ghost" size="icon-xs" title="Properties">
						<Info className="size-3.5" />
					</Button>
					<Button variant="ghost" size="icon-xs" title="Structure">
						<ListTree className="size-3.5" />
					</Button>
					<Button variant="ghost" size="icon-xs" title="Comments">
						<MessageSquare className="size-3.5" />
					</Button>
				</div>
				<Button
					variant="ghost"
					size="icon-xs"
					title={collapsed ? "Expand panel" : "Collapse panel"}
					onClick={onToggleCollapsed}
				>
					{collapsed ? (
						<ChevronLeft className="size-3.5" />
					) : (
						<ChevronRight className="size-3.5" />
					)}
				</Button>
			</div>

			{collapsed ? null : (
				<div className="flex h-[calc(100%-2.25rem)] flex-col">
					<div className="border-b border-border px-4 py-2">
						<h3 className="text-sm font-semibold text-foreground">
							{config.title}
						</h3>
					</div>
					<div className="min-h-0 flex-1 p-3">
						<PanelBody config={config} data={data} isLoading={isLoading} />
					</div>
				</div>
			)}
		</aside>
	);
}

function PanelBody({
	config,
	data,
	isLoading,
}: {
	config: PanelConfig;
	data: unknown;
	isLoading: boolean;
}) {
	return (
		<ScrollArea className="h-full pr-2">
			{isLoading ? (
				<div className="space-y-3 pt-2">
					{[
						"panel-skel-1",
						"panel-skel-2",
						"panel-skel-3",
						"panel-skel-4",
						"panel-skel-5",
						"panel-skel-6",
						"panel-skel-7",
						"panel-skel-8",
					].map((key) => (
						<div key={key} className="flex justify-between">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="h-4 w-32" />
						</div>
					))}
				</div>
			) : data ? (
				<AttributeList
					sections={config.sections}
					data={data as Record<string, unknown>}
				/>
			) : (
				<div className="rounded border border-dashed border-border bg-muted/25 p-3 text-xs text-muted-foreground">
					No data available for this selection.
				</div>
			)}
		</ScrollArea>
	);
}
