// -----------------------------------------------------
// DS/i3DXCompassServices/i3DXCompassPubSub
// Docs: module-DS_i3DXCompassServices_i3DXCompassPubSub
// -----------------------------------------------------

export type CompassTopic = "launchApp" | "launchAppCallback" | string;

export interface LaunchAppParams {
	appId: string;
	widgetId?: string;
	fileName?: string;
	fileContent?: string;
	[key: string]: unknown;
}

export interface i3DXCompassPubSub {
	/**
	 * Publish a Compass event.
	 * For topic 'launchApp', `data` must be LaunchAppParams.
	 */
	publish(
		topic: "launchApp",
		data: LaunchAppParams,
		callback?: (response: unknown) => void,
	): void;

	publish(
		topic: CompassTopic,
		data?: unknown,
		callback?: (response: unknown) => void,
	): void;

	/**
	 * Subscribe to a Compass event, e.g. 'launchAppCallback'.
	 */
	subscribe(topic: CompassTopic, callback: (data: unknown) => void): void;

	/**
	 * Unsubscribe from a Compass event.
	 */
	unsubscribe(topic: CompassTopic): void;
}
