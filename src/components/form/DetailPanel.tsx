import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { FormConfig } from "@/types";
import { ClipboardList, Pencil, Settings, X } from "lucide-react";
import { FormSection } from "./FormSection";

interface DetailPanelProps {
	config: FormConfig;
	data: Record<string, unknown> | null;
	isOpen: boolean;
	onClose?: () => void;
	className?: string;
}

const ACTION_ICONS: Record<string, React.ReactNode> = {
	edit: <Pencil />,
	history: <ClipboardList />,
	properties: <Settings />,
};

/**
 * DetailPanel renders a collapsible right-side panel showing full object details
 * as vertical label-value pairs. Matches the 3DExperience object detail panel.
 */
export function DetailPanel({
	config,
	data,
	isOpen,
	onClose,
	className,
}: DetailPanelProps) {
	if (!isOpen) return null;

	const objectTitle = data
		? ((data.title ?? data.name ?? config.title ?? "") as string)
		: "";
	const objectType = data ? ((data.type ?? "") as string) : "";
	const objectOwner = data ? ((data.owner ?? "") as string) : "";
	const objectDate = data ? ((data.modified ?? data.created ?? "") as string) : "";

	return (
		<Card
			className={cn(
				"flex h-full flex-col rounded-none border-y-0 border-r-0 border-l",
				className,
			)}
		>
			{/* Panel header */}
			<div className="flex shrink-0 items-start gap-3 p-3">
				{/* Object icon placeholder */}
				<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-primary/10 text-xl font-bold text-primary">
					{objectType ? objectType.slice(0, 2).toUpperCase() : "OB"}
				</div>

				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-semibold text-foreground">{objectTitle}</h3>
					<p className="text-xs text-muted-foreground">
						{objectOwner}
						{objectDate && (
							<span className="ml-1">{objectDate}</span>
						)}
					</p>
				</div>

				{/* Close button */}
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={onClose}
					aria-label="Close panel"
				>
					<X />
				</Button>
			</div>

			<Separator />

			{/* Panel toolbar */}
			{config.toolbar && (
				<>
					<TooltipProvider>
						<div className="flex shrink-0 items-center gap-1 px-3 py-1.5">
							{config.toolbar.actions.map((action) => (
								<Tooltip key={action.id}>
									<TooltipTrigger render={
										<Button
											variant="ghost"
											size="icon-sm"
										/>
									}>
										{ACTION_ICONS[action.id] ?? (
											<span className="text-xs">{action.icon ?? action.label.charAt(0)}</span>
										)}
									</TooltipTrigger>
									<TooltipContent>{action.label}</TooltipContent>
								</Tooltip>
							))}
						</div>
					</TooltipProvider>
					<Separator />
				</>
			)}

			{/* Panel content - scrollable */}
			<ScrollArea className="min-h-0 flex-1">
				<div className="p-3">
					{!data ? (
						<div className="space-y-3">
							{Array.from({ length: 8 }).map((_, i) => (
								<div key={`skeleton-${i}`} className="animate-pulse">
									<div className="mb-1 h-3 w-20 rounded bg-muted" />
									<div className="h-3 w-32 rounded bg-muted" />
								</div>
							))}
						</div>
					) : (
						<div className="flex flex-col gap-3">
							{config.sections.map((section, index) => (
								<div key={section.id}>
									{index > 0 && <Separator className="mb-3" />}
									<FormSection section={section} data={data} />
								</div>
							))}
						</div>
					)}
				</div>
			</ScrollArea>
		</Card>
	);
}
