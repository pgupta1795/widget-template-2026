import type { ViewConfig } from "@/types";

/**
 * Part Detail View Config
 *
 * Simple example showing a header form with part info and a single table
 * for associated documents. Demonstrates the simplest view composition.
 */
export const partDetailConfig: ViewConfig = {
	id: "part-detail-view",
	title: "Part Detail",
	description: "Simple part detail view with header form and documents table",

	context: {
		type: "VPMReference",
		objectId: "{{widgetContext.objectId}}",
		dataSource: {
			id: "ds-part",
			service: "3DSpace",
			endpoint:
				"/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}",
			method: "GET",
			transform: "$.data[0]",
		},
	},

	layout: {
		id: "part-root-layout",
		type: "stack",
		children: [
			{
				type: "header-form",
				configId: "part-header-form",
			},
			{
				type: "table",
				configId: "part-documents-table",
			},
		],
	},

	forms: {
		"part-header-form": {
			id: "part-header-form",
			type: "header",
			title: "Part",
			dataSource: {
				id: "ds-part-header",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}",
				method: "GET",
				transform: "$.data[0]",
			},
			sections: [
				{
					id: "part-header-primary",
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
					],
				},
				{
					id: "part-header-attributes",
					layout: "horizontal",
					fields: [
						{
							id: "weight",
							label: "Weight",
							attribute: "weight",
							type: "number",
						},
						{
							id: "material",
							label: "Material",
							attribute: "material",
							type: "text",
						},
						{
							id: "designation",
							label: "Designation",
							attribute: "designation",
							type: "text",
						},
					],
				},
			],
		},
	},

	tabs: {},

	tables: {
		"part-documents-table": {
			columns: [
				{ id: "title", header: "Title", accessorKey: "title" },
				{ id: "name", header: "Name", accessorKey: "name" },
				{ id: "type", header: "Type", accessorKey: "type" },
				{ id: "revision", header: "Revision", accessorKey: "revision" },
				{ id: "state", header: "State", accessorKey: "current" },
				{ id: "modified", header: "Modified", accessorKey: "modified" },
			],
			dataSource: {
				id: "ds-documents",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}/dsdoc:Documents",
				method: "GET",
				transform: "$.data",
			},
		},
	},
};
