import type { DataDragAndDrop } from "@/lib/types/DataDragAndDrop";
import type { i3DXCompassServices } from "@/lib/types/i3DXCompassServices";
import type { PlatformAPI } from "@/lib/types/PlatformAPI";
import type { WAFData } from "@/lib/types/WAFData";
import type { Widget } from "@/lib/types/widget";

export interface UWA {
	hosts: {
		uwa: string;
		[key: string]: string;
	};
}

export interface WebappsUtils {
	getWebappsBaseUrl: () => string;
	[key: string]: unknown;
}

export interface InterCom {
	publish: (topic: string, data?: unknown) => void;
	subscribe: (topic: string, callback: (data: unknown) => void) => void;
	[key: string]: unknown;
}

export interface DSPlatformAPIs {
	PlatformAPI: PlatformAPI;
	WAFData: WAFData;
	i3DXCompassServices: i3DXCompassServices;
	DataDragAndDrop: DataDragAndDrop;
	UWA_Core: unknown;
	UWA_Utils_InterCom: InterCom;
	WebappsUtils: WebappsUtils;
}

declare global {
	interface Window {
		widget: Widget;
		UWA: UWA;
		requirejs: (
			modules: string[],
			callback: (...modules: unknown[]) => void,
			errback?: (err: Error) => void,
		) => void;
	}
}
