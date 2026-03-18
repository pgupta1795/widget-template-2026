// src/features/xen/configs/eng-enriched.config.ts
//
// Example: rowEnrich (eager) + columnHydrate with one lazy column.
//
// rowEnrich fires immediately after the root load and merges the first row of
// the childApi response onto each root row.
//
// columnHydrate 'status' column fires immediately; 'details' is lazy and is
// triggered by a toolbar button (ctx.triggerHydrate('details')).

import type { DAGTableConfig } from "@/components/data-grid/table-engine";

export const engEnrichedConfig: DAGTableConfig = {
	tableId: "eng-enriched",
	mode: "flat",
	dag: {
		nodes: [
			// Root API — fetches the main row list
			{
				id: "root-api",
				type: "api",
				config: {
					url: "/api/eng/items",
					method: "GET",
					authAdapterId: "wafdata",
				},
			},
			// Column definition
			{
				id: "col",
				type: "column",
				config: {
					columns: [
						{ field: "id", header: "ID" },
						{ field: "name", header: "Name" },
						{ field: "owner", header: "Owner" },
						{ field: "status", header: "Status" },
						{ field: "details", header: "Details" },
					],
				},
			},
			// Lazy ApiNode for rowEnrich — NOT in edges
			{
				id: "enrich-api",
				type: "api",
				config: {
					url: "/api/eng/item-details",
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: { id: "$:$row.id" },
				},
			},
			// Lazy ApiNode for columnHydrate 'status' column — NOT in edges
			{
				id: "status-api",
				type: "api",
				config: {
					url: "/api/eng/status",
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: { itemId: "$:$row.id" },
				},
			},
			// Lazy ApiNode for columnHydrate 'details' column — NOT in edges
			{
				id: "details-api",
				type: "api",
				config: {
					url: "/api/eng/details",
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: { itemId: "$:$row.id" },
				},
			},
			// rowEnrich node — eager (lazy not set, defaults false)
			{
				id: "row-enrich",
				type: "rowEnrich",
				config: {
					sourceNodeId: "root-api",
					childApiNodeId: "enrich-api",
					rowKeyField: "id",
					// mergeTransform: optional JSONata to shape the patch before merge
				},
			},
			// columnHydrate node — 'status' eager, 'details' lazy
			{
				id: "col-hydrate",
				type: "columnHydrate",
				config: {
					sourceNodeId: "root-api",
					rowKeyField: "id",
					columns: [
						{
							columnId: "status",
							childApiNodeId: "status-api",
							// lazy not set → fires immediately
						},
						{
							columnId: "details",
							childApiNodeId: "details-api",
							lazy: true, // waits for ctx.triggerHydrate('details')
						},
					],
				},
			},
		],
		edges: [
			{ from: "root-api", to: "col" },
			{ from: "row-enrich", to: "col" },
			{ from: "col-hydrate", to: "col" },
		],
		rootNodeId: "col",
	},
	toolbarCommands: [
		{
			id: "load-details",
			type: "command",
			label: "Load Details",
			icon: "Download",
			enabled: true,
			handler: async (ctx) => {
				ctx.triggerHydrate?.("details");
			},
		},
	],
};
