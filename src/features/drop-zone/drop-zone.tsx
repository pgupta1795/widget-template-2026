import { Upload } from "lucide-react";
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
				"relative rounded-md border border-dashed transition-colors",
				isDragging
					? "border-primary bg-primary/5"
					: "border-border hover:border-primary/50 hover:bg-primary/5",
				children &&
					"border-transparent hover:border-transparent hover:bg-transparent",
				!children && "max-w-sm w-full",
				className,
			)}
		>
			{children ?? (
				<div className="flex flex-col items-center justify-center gap-4 p-10 text-center">
					<div className="rounded-full bg-muted p-3">
						<Upload className="size-6 text-muted-foreground" />
					</div>
					<div className="space-y-1">
						<p className="text-sm font-medium text-foreground">
							{config.message ?? "Drop here to open"}
						</p>
						{config.acceptTypes && (
							<p className="text-xs text-muted-foreground">
								Accepts: {config.acceptTypes.join(", ")}
							</p>
						)}
					</div>
					<div className="flex w-full items-center gap-3">
						<div className="h-px flex-1 bg-border" />
						<span className="text-xs text-muted-foreground">or</span>
						<div className="h-px flex-1 bg-border" />
					</div>
					<button
						type="button"
						className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 cursor-pointer"
					>
						Start with New Product
					</button>
				</div>
			)}
			{isDragging && children && (
				<div className="absolute inset-0 z-10 flex items-center justify-center rounded-md border-2 border-dashed border-primary bg-primary/10">
					<div className="flex items-center gap-2 rounded-md bg-background/90 px-4 py-2 text-sm font-medium shadow-sm">
						<Upload className="size-4" />
						Drop here
					</div>
				</div>
			)}
		</div>
	);
}
