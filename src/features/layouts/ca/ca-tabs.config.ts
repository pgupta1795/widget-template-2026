// src/features/layouts/ca/ca-tabs.config.ts
import type { DAGTabConfig } from "@/components/tab-engine";

export const caTabsConfig: DAGTabConfig = {
	tabId: "ca-tabs",
	indicatorStyle: "underline",
	tabs: [
		{
			id: "members",
			label: "Members",
			icon: "Users",
			content: {
				type: "table",
				configPath: "./ca-members.config.ts",
			},
		},
		{
			id: "proposed-changes",
			label: "Proposed Changes",
			icon: "ListChecks",
			content: {
				type: "table",
				configPath: "./ca-proposed.config.ts",
			},
		},
	],
};
