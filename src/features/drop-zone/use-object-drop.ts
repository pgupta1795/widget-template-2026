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
		if (!el || registeredRef.current || !hasModule("drag-drop")) return;

		const dnd = getModule<DataDragAndDrop>("drag-drop");
		dnd.droppable(el, {
			drop: handleDrop,
			enter: () => setIsDragging(true),
			leave: () => setIsDragging(false),
			over: () => {},
		});
		registeredRef.current = true;

		return () => {
			registeredRef.current = false;
		};
	}, [handleDrop]);

	return { elementRef, isDragging };
}
