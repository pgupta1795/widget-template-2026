// src/components/tab-engine/types/tab.types.ts
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

export type TabIndicatorStyle = "underline" | "filled" | "pill";

export interface DAGTabConfig {
	tabId: string;
	/** Visual style of the active tab indicator. Default: "underline" */
	indicatorStyle?: TabIndicatorStyle;
	/** Extra className applied to the tab list container */
	className?: string;
	tabs: TabItemConfig[];
}

export interface TabItemConfig {
	id: string;
	label: string;
	/** lucide-react icon name e.g. "Users", "ListChecks" */
	icon?: string;
	/** CSS color value for the icon/label e.g. "#3b82f6" or "hsl(var(--primary))" */
	color?: string;
	/** Extra className applied to this tab's trigger */
	className?: string;
	disabled?: boolean;
	/**
	 * JSONata expression evaluated against params context.
	 * If falsy, tab is hidden (not rendered).
	 * Binding: $params (from LayoutContext or props), $tab.id, $tab.label
	 */
	displayExpression?: string;
	content: TabContentConfig;
}

export interface TabContentConfig {
	/**
	 * Open string — extensible via TabContentRegistry.
	 * Built-in types: "table" | "form" | "tabs"
	 */
	type: string;
	/**
	 * Key used to look up the config object from TabConfigRegistry.
	 * Must match the path string used in registerConfig() calls.
	 * e.g. "./ca-search.config.ts"
	 */
	configPath: string;
}

export interface TabContentDefinition {
	type: string;
	render: (
		config: unknown,
		params: Record<string, JsonPrimitive>,
	) => React.ReactNode;
}
