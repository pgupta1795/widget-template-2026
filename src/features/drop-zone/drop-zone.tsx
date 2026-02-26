import { Plus } from "lucide-react";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyMedia,
	EmptyTitle,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";
import type { DropZoneConfig } from "@/types/config";
import { type DroppedObject, useObjectDrop } from "./use-object-drop";

type DropZoneProps = {
	config: DropZoneConfig;
	onDrop: (objects: DroppedObject[]) => void;
	children?: React.ReactNode;
	className?: string;
};

export function DropZone({
	config,
	onDrop,
	children,
	className,
}: DropZoneProps) {
	const { elementRef, isDragging } = useObjectDrop({ config, onDrop });

	if (!config.enabled) return <>{children}</>;

	return (
		<div
			ref={elementRef}
			className={cn(
				"relative h-full rounded-lg border border-dashed transition-all duration-150",
				isDragging
					? "border-primary bg-primary/10 shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
					: "border-border hover:border-primary/70 hover:bg-primary/5",
				children &&
					"border-transparent hover:border-transparent hover:bg-transparent",
				!children && "w-full",
				className,
			)}
		>
			{children ?? (
				<Empty className="h-full min-h-[420px] border-0">
					<EmptyHeader>
						<EmptyMedia className="mb-3">
							<div className="flex size-36 items-center justify-center rounded-full border-4 border-dashed border-primary/70 bg-primary/8">
								<Plus className="size-20 text-primary" />
							</div>
						</EmptyMedia>
						<EmptyTitle className="text-lg">
							{config.message ?? "Drop an object to open"}
						</EmptyTitle>
						{config.acceptTypes && (
							<EmptyDescription className="text-sm">
								Accepts: {config.acceptTypes.join(", ")}
							</EmptyDescription>
						)}
					</EmptyHeader>
				</Empty>
			)}
			{isDragging && (
				<div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/20">
					<div className="rounded-md bg-background/95 px-5 py-2 text-sm font-semibold shadow-sm">
						Release to drop object
					</div>
				</div>
			)}
		</div>
	);
}
