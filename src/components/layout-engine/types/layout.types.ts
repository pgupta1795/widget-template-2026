// src/components/layout-engine/types/layout.types.ts
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

// ── Content Config ────────────────────────────────────────────────────────────

export type LayoutContentType = "table" | "form" | "tabs" | "layout";

export interface LayoutContentConfig {
	/** Content type — dispatched to ConfiguredTable/Form/Tabs/LayoutEngine */
	type: LayoutContentType;
	/** Key for the config registry lookup (passed to ConfiguredTable/Form/Tabs/LayoutEngine). */
	configPath: string;
}

// ── Panel Configs ─────────────────────────────────────────────────────────────

export interface BasePanelConfig {
	/** Unique ID used with useLayoutContext().togglePanel(id) */
	id: string;
	/** Initial size as a percentage 0–100 (react-resizable-panels) */
	defaultSize: number;
	minSize?: number;
	maxSize?: number;
	collapsible?: boolean;
	content: LayoutContentConfig;
}

export interface SidebarPanelConfig extends BasePanelConfig {
	/** Whether the side panel starts collapsed */
	defaultCollapsed?: boolean;
}

// ── Layout Configs (discriminated union) ──────────────────────────────────────

interface BaseLayoutConfig {
	layoutId: string;
	/**
	 * TanStack Router route path — for documentation and createLayoutRoute() helper.
	 * e.g. "/xen/ca/$nodeId"
	 */
	routePath: string;
	title?: string;
}

export interface SplitLayoutConfig extends BaseLayoutConfig {
	type: "split";
	direction: "horizontal" | "vertical";
	panels: [BasePanelConfig, BasePanelConfig, ...BasePanelConfig[]];
}

export interface StackLayoutConfig extends BaseLayoutConfig {
	type: "stack";
	panels: [BasePanelConfig, ...BasePanelConfig[]];
}

export interface SidebarLayoutConfig extends BaseLayoutConfig {
	type: "sidebar";
	/** Which side the sidebar panel is rendered on. Defaults to "left" when omitted. */
	side?: "right" | "left";
	mainPanel: BasePanelConfig;
	sidePanel: SidebarPanelConfig;
	/** Accepted drag-and-drop object types — consumed by the feature route/Layout Engine */
	acceptedDropTypes?: string[];
	/** Param name for the dropped object's ID */
	dropParamName?: string;
}

export type DAGLayoutConfig =
	| SplitLayoutConfig
	| StackLayoutConfig
	| SidebarLayoutConfig;

// ── Context Types ─────────────────────────────────────────────────────────────

export interface PanelState {
	isCollapsed: boolean;
	size: number;
}

export interface LayoutContextValue {
	panels: Record<string, PanelState>;
	togglePanel: (panelId: string) => void;
	setPanelSize: (panelId: string, size: number) => void;
	/** Merged route params + DnD params — JsonPrimitive (route params are strings) */
	params: Record<string, JsonPrimitive>;
	/** Replace the entire params map. Callers must merge existing params manually before calling. */
	setParams: (params: Record<string, JsonPrimitive>) => void;
}
