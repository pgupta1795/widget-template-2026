import type { ViewConfig } from "@/types";

/**
 * BOM Explorer View Config
 *
 * Example config for a Bill of Materials tree table view.
 * Shows a header form with part info and a tree-mode data grid
 * for navigating the BOM structure.
 */
export const bomExplorerConfig: ViewConfig = {
	id: "bom-explorer-view",
	title: "BOM Explorer",
	description: "Bill of Materials tree explorer with part header and BOM table",

	context: {
		type: "Physical Product",
		objectId: "{{widgetContext.objectId}}",
		dataSource: {
			id: "ds-bom-root",
			service: "3DSpace",
			endpoint:
				"/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}",
			method: "GET",
			transform: "$.data[0]",
		},
	},

	layout: {
		id: "bom-root-layout",
		type: "stack",
		children: [
			{
				type: "header-form",
				configId: "bom-header-form",
			},
			{
				type: "tabs",
				configId: "bom-tabs",
			},
		],
	},

	forms: {
		"bom-header-form": {
			id: "bom-header-form",
			type: "header",
			title: "Part Details",
			dataSource: {
				id: "ds-bom-header",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}",
				method: "GET",
				transform: "$.data[0]",
			},
			sections: [
				{
					id: "bom-header-main",
					layout: "horizontal",
					fields: [
						{
							id: "state",
							label: "Maturity State",
							attribute: "current",
							type: "badge",
							badgeConfig: {
								colorMap: {
									"In Work": { bg: "#E0F2FE", text: "#0369A1" },
									Frozen: { bg: "#E0E7FF", text: "#3730A3" },
									Released: { bg: "#DCFCE7", text: "#166534" },
									Obsolete: { bg: "#F3F4F6", text: "#374151" },
								},
							},
						},
						{
							id: "revision",
							label: "Revision",
							attribute: "revision",
							type: "text",
						},
						{
							id: "owner",
							label: "Owner",
							attribute: "owner",
							type: "link",
							linkConfig: {
								urlTemplate: "#/person/{{value}}",
								target: "_self",
							},
						},
						{
							id: "collabspace",
							label: "Collaborative Space",
							attribute: "collabSpace",
							type: "text",
						},
					],
				},
			],
		},
	},

	tabs: {
		"bom-tabs": [
			{
				id: "bom-structure",
				label: "BOM Structure",
				icon: "🌳",
				content: {
					type: "table",
					tableId: "bom-tree-table",
				},
			},
			{
				id: "where-used",
				label: "Where Used",
				icon: "🔍",
				content: {
					type: "table",
					tableId: "where-used-table",
				},
			},
			{
				id: "alternates",
				label: "Alternates",
				content: {
					type: "table",
					tableId: "alternates-table",
				},
			},
		],
	},

	tables: {
		"bom-tree-table": {
			mode: "tree",
			columns: [
				{ id: "title", header: "Title", accessorKey: "title" },
				{ id: "name", header: "Name", accessorKey: "name" },
				{ id: "type", header: "Type", accessorKey: "type" },
				{ id: "revision", header: "Revision", accessorKey: "revision" },
				{ id: "state", header: "State", accessorKey: "current" },
				{ id: "quantity", header: "Quantity", accessorKey: "quantity" },
				{ id: "unit", header: "Unit", accessorKey: "unit" },
				{
					id: "findNumber",
					header: "Find Number",
					accessorKey: "findNumber",
				},
			],
			dataSource: {
				id: "ds-bom-structure",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}/dseng:EngRepresentation",
				method: "GET",
				transform: "$.data",
			},
		},
		"where-used-table": {
			columns: [
				{ id: "parentTitle", header: "Parent Title", accessorKey: "parentTitle" },
				{ id: "parentName", header: "Parent Name", accessorKey: "parentName" },
				{ id: "parentType", header: "Type", accessorKey: "parentType" },
				{ id: "parentRevision", header: "Revision", accessorKey: "parentRevision" },
				{ id: "parentState", header: "State", accessorKey: "parentCurrent" },
			],
			dataSource: {
				id: "ds-where-used",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}/navigate",
				method: "POST",
				params: { direction: "up", depth: "1" },
				transform: "$.data",
			},
		},
		"alternates-table": {
			columns: [
				{ id: "altTitle", header: "Title", accessorKey: "title" },
				{ id: "altName", header: "Name", accessorKey: "name" },
				{ id: "altRevision", header: "Revision", accessorKey: "revision" },
				{ id: "altState", header: "State", accessorKey: "current" },
			],
			dataSource: {
				id: "ds-alternates",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}/dseng:AlternateEngItem",
				method: "GET",
				transform: "$.data",
			},
		},
	},
};
