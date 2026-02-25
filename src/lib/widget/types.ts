// 3DDashboard Widget & Platform API type declarations

export interface Widget {
	addEvent: (event: string, callback: () => void) => void;
	getValue: (key: string) => string;
	setValue: (key: string, value: string) => void;
	setTitle: (title: string) => void;
	setBody: (html: string) => void;
	getBody: () => HTMLElement;
}

export interface UWA {
	hosts: {
		uwa: string;
		[key: string]: string;
	};
}

export interface PlatformAPI {
	getUser: () => Promise<unknown>;
	getTenant: () => Promise<unknown>;
	[key: string]: unknown;
}

export interface WAFData {
	authenticatedRequest: (
		url: string,
		options: Record<string, unknown>,
	) => Promise<unknown>;
	[key: string]: unknown;
}

export interface I3DXCompassServices {
	getServiceUrl: (options: Record<string, unknown>) => Promise<string>;
	[key: string]: unknown;
}

export interface DataDragAndDrop {
	droppable: (element: HTMLElement, options: Record<string, unknown>) => void;
	[key: string]: unknown;
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
	i3DXCompassServices: I3DXCompassServices;
	DataDragAndDrop: DataDragAndDrop;
	UWA_Core: unknown;
	UWA_Utils_InterCom: InterCom;
	WebappsUtils: WebappsUtils;
}

// Augment window with 3DDashboard globals
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
