// ─── Data Source ──────────────────────────────────────────────────────────────

export interface DataSourceConfig {
	id: string;
	service: string;
	endpoint: string;
	method: "GET" | "POST" | "PUT" | "DELETE";
	params?: Record<string, string>;
	headers?: Record<string, string>;
	transform?: string;
	refreshInterval?: number;
	dependsOn?: string[];
}

// ─── Toolbar ─────────────────────────────────────────────────────────────────

export interface ToolbarAction {
	id: string;
	label: string;
	icon?: string;
	variant?: "default" | "outline" | "ghost" | "destructive";
	onClick?: string;
	disabled?: boolean | string;
}

export interface ToolbarConfig {
	actions: ToolbarAction[];
	position?: "top" | "bottom";
}

// ─── Form Types ──────────────────────────────────────────────────────────────

export interface BadgeColorConfig {
	bg: string;
	text: string;
	border?: string;
}

export interface FormFieldConfig {
	id: string;
	label: string;
	attribute: string;
	type:
		| "text"
		| "date"
		| "badge"
		| "link"
		| "dropdown"
		| "number"
		| "boolean"
		| "richtext"
		| "image"
		| "state";
	editable?: boolean;
	visible?: boolean | string;
	width?: string;
	options?: { label: string; value: string }[];
	badgeConfig?: {
		colorMap: Record<string, BadgeColorConfig>;
	};
	linkConfig?: {
		urlTemplate: string;
		target?: "_blank" | "_self";
	};
}

export interface FormSectionConfig {
	id: string;
	label?: string;
	collapsible?: boolean;
	layout: "horizontal" | "vertical" | "grid";
	columns?: number;
	fields: FormFieldConfig[];
}

export interface FormConfig {
	id: string;
	type: "header" | "detail" | "edit";
	title?: string;
	dataSource: DataSourceConfig;
	sections: FormSectionConfig[];
	toolbar?: ToolbarConfig;
}

// ─── Tab Types ───────────────────────────────────────────────────────────────

export interface TabContentConfig {
	type: "table" | "form" | "tabs" | "custom" | "layout";
	tableId?: string;
	formId?: string;
	tabs?: TabConfig[];
	layoutId?: string;
}

export interface TabConfig {
	id: string;
	label: string;
	icon?: string;
	badge?: string | { dataSource: string; expression: string };
	content: TabContentConfig;
	visible?: boolean | string;
	disabled?: boolean | string;
}

// ─── Layout Types ────────────────────────────────────────────────────────────

export interface LayoutChildConfig {
	type: "header-form" | "tabs" | "table" | "detail-panel" | "layout";
	configId: string;
	collapsible?: boolean;
	defaultCollapsed?: boolean;
	minSize?: number;
	maxSize?: number;
}

export interface LayoutConfig {
	id: string;
	type: "split" | "stack" | "sidebar";
	direction?: "horizontal" | "vertical";
	sizes?: number[];
	resizable?: boolean;
	children: LayoutChildConfig[];
}

// ─── View Config (top-level) ─────────────────────────────────────────────────

export interface ViewConfig {
	id: string;
	title: string;
	description?: string;
	context: {
		type: string;
		objectId?: string;
		dataSource: DataSourceConfig;
	};
	layout: LayoutConfig;
	forms: Record<string, FormConfig>;
	tabs: Record<string, TabConfig[]>;
	tables: Record<string, unknown>;
	layouts?: Record<string, LayoutConfig>;
}
