// src/features/layouts/ca/ca-layout.config.ts
import type { SidebarLayoutConfig } from "@/components/layout-engine";

export const caLayoutConfig: SidebarLayoutConfig = {
	layoutId: "ca-layout",
	routePath: "/ca/$nodeId",
	title: "Change Action",
	type: "sidebar",
	side: "right",
	acceptedDropTypes: ["ChangeAction"],
	dropParamName: "nodeId",

	mainPanel: {
		id: "main",
		defaultSize: 75,
		minSize: 40,
		content: {
			type: "tabs",
			configPath: "./ca-tabs.config.ts",
		},
	},

	sidePanel: {
		id: "side-panel",
		defaultSize: 25,
		minSize: 0,
		maxSize: 50,
		collapsible: true,
		defaultCollapsed: false,
		content: {
			type: "form",
			configPath: "./ca-form.config.ts",
		},
	},
};
