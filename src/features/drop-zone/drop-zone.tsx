import {cn} from "@/lib/utils";
import type {DropZoneConfig} from "@/types/config";
import {Upload} from "lucide-react";
import {type DroppedObject,useObjectDrop} from "./use-object-drop";

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
				"relative min-h-30 rounded-lg border-2 border-dashed transition-colors",
				isDragging
					? "border-primary bg-primary/5"
					: "border-muted-foreground/25 hover:border-muted-foreground/40",
				children && "border-transparent hover:border-transparent",
				className,
			)}
		>
			{children ?? (
				<div className="flex flex-col items-center justify-center gap-2 p-8 text-muted-foreground">
					<Upload className="size-8" />
					<p className="text-sm font-medium">
						{config.message ?? "Drop an object here to begin"}
					</p>
					{config.acceptTypes && (
						<p className="text-xs">Accepts: {config.acceptTypes.join(", ")}</p>
					)}
				</div>
			)}
			{isDragging && children && (
				<div className="absolute inset-0 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-primary bg-primary/10">
					<div className="flex items-center gap-2 rounded-md bg-background/90 px-4 py-2 text-sm font-medium shadow-sm">
						<Upload className="size-4" />
						Drop here
					</div>
				</div>
			)}
		</div>
	);
}
