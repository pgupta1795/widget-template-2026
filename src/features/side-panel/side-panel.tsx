import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { createQueryOptions } from "@/services/query-factory";
import type { PanelConfig } from "@/types/config";
import { AttributeList } from "./attribute-list";

type SidePanelProps = {
	config: PanelConfig;
	objectId: string | null;
	open: boolean;
	onOpenChange: (open: boolean) => void;
};

const WIDTH_MAP = {
	sm: "sm:max-w-sm",
	md: "sm:max-w-md",
	lg: "sm:max-w-lg",
};

export function SidePanel({
	config,
	objectId,
	open,
	onOpenChange,
}: SidePanelProps) {
	const { data, isLoading } = useQuery({
		...createQueryOptions(
			config.endpoint,
			{ objectId: objectId ?? "" },
			{ single: true },
		),
		enabled: open && !!objectId,
	});

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className={WIDTH_MAP[config.width ?? "md"]}>
				<SheetHeader>
					<SheetTitle className="text-sm font-semibold text-foreground">
						{config.title}
					</SheetTitle>
					<SheetDescription className="sr-only">
						Object attributes
					</SheetDescription>
				</SheetHeader>

				<ScrollArea className="h-[calc(100vh-8rem)] pr-4">
					{isLoading ? (
						<div className="space-y-3 pt-4">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={i} className="flex justify-between">
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
						<p className="pt-4 text-sm text-muted-foreground">
							No data available.
						</p>
					)}
				</ScrollArea>
			</SheetContent>
		</Sheet>
	);
}
