import { useCallback, useEffect, useRef, useState } from "react";
import { logger } from "@/lib/logger";
import { getModule, hasModule } from "@/lib/modules/registry";
import type { DataDragAndDrop } from "@/lib/widget/types";
import type { DropZoneConfig } from "@/types/config";

export type DroppedObject = {
	objectId: string;
	objectType: string;
	displayName?: string;
	envId?: string;
	serviceId?: string;
	contextId?: string;
	[key: string]: unknown;
};

export type UseObjectDropOptions = {
	config: DropZoneConfig;
	onDrop: (objects: DroppedObject[]) => void;
};

export function useObjectDrop({ config, onDrop }: UseObjectDropOptions) {
	const [isDragging, setIsDragging] = useState(false);
	const elementRef = useRef<HTMLDivElement>(null);
	const registeredRef = useRef(false);

	const handleDrop = useCallback(
		(data: string) => {
			setIsDragging(false);
			try {
				const parsed = JSON.parse(data);
				if (parsed.protocol !== "3DXContent") {
					logger.warn("Unsupported drop protocol:", parsed.protocol);
					return;
				}

				let items: DroppedObject[] = parsed.data?.items ?? [];

				if (config.acceptTypes?.length) {
					items = items.filter((item) =>
						config.acceptTypes?.includes(item.objectType),
					);
				}

				if (items.length > 0) {
					onDrop(items);
				}
			} catch (err) {
				logger.error("Failed to parse drop data", err);
			}
		},
		[config.acceptTypes, onDrop],
	);

	useEffect(() => {
		const el = elementRef.current;
		if (!el) return;

		// Native DnD fallback improves hover/allow-drop affordance in non-3DX contexts.
		const onDragEnter = (event: DragEvent) => {
			event.preventDefault();
			setIsDragging(true);
		};
		const onDragOver = (event: DragEvent) => {
			event.preventDefault();
			if (event.dataTransfer) {
				event.dataTransfer.dropEffect = "copy";
			}
			setIsDragging(true);
		};
		const onDragLeave = () => {
			setIsDragging(false);
		};
		const onDropNative = (event: DragEvent) => {
			event.preventDefault();
			setIsDragging(false);
		};
		el.addEventListener("dragenter", onDragEnter);
		el.addEventListener("dragover", onDragOver);
		el.addEventListener("dragleave", onDragLeave);
		el.addEventListener("drop", onDropNative);

		const register3dxDrop = () => {
			if (registeredRef.current || !hasModule("drag-drop")) return false;

			const dnd = getModule<DataDragAndDrop>("drag-drop");
			dnd.droppable(el, {
				drop: handleDrop,
				enter: () => setIsDragging(true),
				leave: () => setIsDragging(false),
				over: () => setIsDragging(true),
			});
			registeredRef.current = true;
			logger.debug("3DX dropzone registered.");
			return true;
		};

		// If module timing is delayed, retry briefly so dropzone still activates.
		let attempts = 0;
		const maxAttempts = 20;
		const intervalId = window.setInterval(() => {
			if (register3dxDrop() || attempts >= maxAttempts) {
				window.clearInterval(intervalId);
			}
			attempts += 1;
		}, 100);
		register3dxDrop();

		return () => {
			window.clearInterval(intervalId);
			el.removeEventListener("dragenter", onDragEnter);
			el.removeEventListener("dragover", onDragOver);
			el.removeEventListener("dragleave", onDragLeave);
			el.removeEventListener("drop", onDropNative);
			registeredRef.current = false;
		};
	}, [handleDrop]);

	return { elementRef, isDragging };
}
