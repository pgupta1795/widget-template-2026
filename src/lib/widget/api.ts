import {logger} from "@/lib/logger";
import type {DSPlatformAPIs,UWA} from "@/lib/types/index";
import type {Widget} from '@/lib/types/widget';

let platformAPIs: DSPlatformAPIs | undefined;
let widgetRef: Widget | undefined;
let uwaRef: UWA | undefined;

export function init(apis: DSPlatformAPIs, widget: Widget, uwa: UWA) {
	logger.info("Initializing Widget APIs...");
	platformAPIs = apis;
	widgetRef = widget;
	uwaRef = uwa;
}

export function getAPIs(): DSPlatformAPIs {
	if (!platformAPIs)
		throw new Error("Platform APIs not initialized. Call init() first.");
	return platformAPIs;
}

export function getWidget(): Widget {
	if (!widgetRef) throw new Error("Widget not initialized. Call init() first.");
	return widgetRef;
}

export function getUWA(): UWA {
	if (!uwaRef) throw new Error("UWA not initialized. Call init() first.");
	return uwaRef;
}
