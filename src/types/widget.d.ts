// -----------------------------------------------------
// Global widget object
// Docs: CAAWebAppsQrWidgetClass
// -----------------------------------------------------

export type WidgetEventName =
	| "endEdit"
	| "onEdit"
	| "onKeyboardAction"
	| "onLoad"
	| "onRefresh"
	| "onResize"
	| "onViewChange"
	| string;

export interface WidgetKeyboardActionEvent {
	key: string;
}

export type WidgetViewChangeType = "windowed" | "maximized" | "minimized";

export interface WidgetViewChangeEvent {
	type: WidgetViewChangeType;
	[key: string]: unknown;
}

export interface WidgetPreferenceDefinition {
	name: string;
	type: string;
	label?: string;
	defaultValue?: string;
	step?: string;
	min?: string;
	max?: string;
	// Allow other metadata attributes
	[key: string]: string | undefined;
}

export interface WidgetPreference extends WidgetPreferenceDefinition {
	value?: string;
}

export interface Widget {
	/** Main HTML element of the widget; null until onLoad. */
	body: HTMLElement | null;

	/** Unique identifier of the widget instance. */
	id: string;

	/** Widget metadata keyed by meta `name`. */
	metas: Record<string, string>;

	/** ISO language code: 'en', 'fr', 'de', 'ja', 'zh', ... */
	lang: string;

	// Events

	addEvent(
		name: "onKeyboardAction",
		listener: (evt: WidgetKeyboardActionEvent) => void,
		bind?: object,
		priority?: number,
	): this;

	addEvent(
		name: "onViewChange",
		listener: (evt: WidgetViewChangeEvent) => void,
		bind?: object,
		priority?: number,
	): this;

	addEvent(
		name: Exclude<WidgetEventName, "onKeyboardAction" | "onViewChange">,
		listener: () => void,
		bind?: object,
		priority?: number,
	): this;

	/** Custom events with arbitrary argument list. */
	addEvent(
		name: string,
		listener: (...args: unknown[]) => void,
		bind?: object,
		priority?: number,
	): this;

	/** Dispatches an event to listeners. */
	dispatchEvent(name: string, args?: unknown[], bind?: object): this;

	// Preferences

	/** Get value of a user preference; returns default if not overridden. */
	getValue(name: string): string | undefined;

	/**
	 * Set value of a user preference. Returns the new stored value.
	 * (Behavior is undefined if name is not a declared preference.)
	 */
	setValue(name: string, value: string): string;

	/** Get contextual part of widget title. */
	getTitle(): string;

	/**
	 * Set contextual part of the widget title, returns the input.
	 * Full title is `<appName> - <context>`.
	 */
	setTitle(title: string): string;

	/**
	 * Add or replace a preference definition at runtime.
	 * Preference is given in JSON form as in docs.
	 */
	addPreference(pref: WidgetPreferenceDefinition): void;

	/**
	 * Get full preference definition (including current value) by name.
	 */
	getPreference(name: string): WidgetPreference | undefined;
}

declare const widget: Widget;
