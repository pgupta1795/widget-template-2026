import {
	GET_ENGINEERING_ITEM,
	UPDATE_ENGINEERING_ITEM,
} from "@/config/endpoints/engineering-item";
import {GET_ECOSYSTEM} from "@/config/endpoints/relations";
import {ZONE_QUERY} from "@/config/endpoints/zone-query";
import type {WidgetConfig} from "@/types/config";

export const engineeringBomConfig: WidgetConfig = {
	id: "engineering-bom",
	title: "Engineering BOM",
	description: "Engineering Bill of Materials viewer with structure navigation",

	sidebar: {
		title: "Engineering BOM",
		description: "Browse and manage engineering bill of materials",
		sections: [
			{
				id: "access",
				title: "Access Your Work",
				items: [
					{
						id: "recents",
						label: "Recents",
						icon: "clock",
						type: "link",
						view: "recents",
						active: true,
					},
					{
						id: "my-products",
						label: "My Products",
						icon: "box",
						type: "link",
						view: "my-products",
					},
				],
			},
			{
				id: "new",
				title: "Start a New Activity",
				items: [
					{
						id: "new-product",
						label: "New Product",
						icon: "plus-square",
						type: "action",
						action: "create-product",
					},
					{
						id: "new-part",
						label: "New Part",
						icon: "plus-square",
						type: "action",
						action: "create-part",
					},
				],
			},
		],
		collapsible: true,
		defaultWidth: 220,
	},

	header: {
		endpoint: ZONE_QUERY,
		titleField: "title",
		subtitleField: "name",
		stateField: "state",
		iconField: "icon",
		stateBadgeVariants: {
			"In Work": "info",
			Released: "success",
			Obsolete: "destructive",
			Frozen: "warning",
			Private: "secondary",
		},
		fields: [
			{ key: "owner", label: "Owner", type: "link" },
			{ key: "collabspace", label: "Collaborative Space", type: "link" },
			{ key: "organization", label: "Organization", type: "text" },
			{ key: "revision", label: "Revision", type: "text" },
			{ key: "description", label: "Description", type: "text" },
			{ key: "isLastVersion", label: "Is Last Version", type: "boolean" },
		],
	},

	dropZone: {
		enabled: true,
		acceptTypes: ["VPMReference", "3DPart"],
		message: "Drop an Engineering Item to view its BOM structure",
		idField: "objectId",
		typeField: "objectType",
	},

	modules: [
		"platform-api",
		"waf-data",
		"compass-services",
		"drag-drop",
		"webapps-utils",
	],

	defaultTab: "structure",

	tabs: [
		{
			id: "structure",
			label: "Structure",
			endpoint: ZONE_QUERY,
			content: {
				type: "table",
				table: {
					columns: [
						{
							id: "icon",
							header: "",
							accessorKey: "icon",
							type: "image",
							width: 36,
							sortable: false,
						},
						{
							id: "title",
							header: "Title",
							accessorKey: "title",
							type: "text",
							sortable: true,
							filterable: true,
							minWidth: 150,
						},
						{
							id: "name",
							header: "Name",
							accessorKey: "name",
							type: "text",
							sortable: true,
							filterable: true,
							minWidth: 180,
						},
						{
							id: "revision",
							header: "Revision",
							accessorKey: "revision",
							type: "text",
							sortable: true,
							width: 80,
						},
						{
							id: "state",
							header: "Maturity State",
							accessorKey: "state",
							type: "badge",
							sortable: true,
							width: 120,
							badgeVariants: {
								"In Work": "info",
								Released: "success",
								Obsolete: "destructive",
								Frozen: "warning",
							},
						},
						{
							id: "type",
							header: "Type",
							accessorKey: "type",
							type: "text",
							sortable: true,
							width: 120,
						},
						{
							id: "owner",
							header: "Owner",
							accessorKey: "owner",
							type: "text",
							sortable: true,
							width: 120,
						},
						{
							id: "description",
							header: "Description",
							accessorKey: "description",
							type: "text",
							sortable: false,
							minWidth: 200,
						},
					],
					commands: [
						{
							id: "view-info",
							label: "View Information",
							icon: "panel-right",
							type: "side-panel",
							panelConfig: {
								title: "Object Details",
								endpoint: GET_ENGINEERING_ITEM,
								width: "md",
								sections: [
									{
										label: "General",
										fields: [
											"title",
											"name",
											"revision",
											"type",
											"state",
											"description",
										],
									},
									{
										label: "Ownership",
										fields: ["owner", "organization", "collabspace"],
									},
									{
										label: "Weight & COG",
										fields: [
											"declaredWeight",
											"Weight",
											"V_WCG_Declared_COGx",
											"V_WCG_Declared_COGy",
											"V_WCG_Declared_COGz",
										],
									},
								],
							},
						},
						{
							id: "expand",
							label: "Expand",
							icon: "chevron-down",
							type: "expand",
						},
						{
							id: "edit",
							label: "Edit",
							icon: "pencil",
							type: "dialog",
							dialogConfig: {
								id: "edit-eng-item",
								title: "Edit Engineering Item",
								mode: "edit",
								columns: 2,
								submitEndpoint: UPDATE_ENGINEERING_ITEM,
								fields: [
									{
										id: "title",
										label: "Title",
										type: "text",
										accessorKey: "title",
										required: true,
									},
									{
										id: "name",
										label: "Name",
										type: "text",
										accessorKey: "name",
										readOnly: true,
									},
									{
										id: "revision",
										label: "Revision",
										type: "text",
										accessorKey: "revision",
										readOnly: true,
									},
									{
										id: "description",
										label: "Description",
										type: "textarea",
										accessorKey: "description",
										colSpan: 2,
									},
								],
							},
						},
						{
							id: "navigate",
							label: "Open in 3DDashboard",
							icon: "external-link",
							type: "navigate",
						},
					],
					selectable: true,
					expandable: true,
					pagination: { pageSize: 25, pageSizeOptions: [10, 25, 50, 100] },
					defaultSort: { id: "title", desc: false },
					toolbar: {
						search: true,
						actions: [
							{
								id: "refresh",
								label: "Refresh",
								icon: "refresh",
								variant: "ghost",
							},
						],
					},
				},
			},
		},
		{
			id: "ecosystem",
			label: "Relationships",
			endpoint: GET_ECOSYSTEM,
			content: {
				type: "table",
				table: {
					columns: [
						{
							id: "rel-type",
							header: "Relationship",
							accessorKey: "relationType",
							type: "text",
							sortable: true,
							minWidth: 150,
						},
						{
							id: "rel-target-title",
							header: "Title",
							accessorKey: "targetTitle",
							type: "text",
							sortable: true,
							minWidth: 180,
						},
						{
							id: "rel-target-type",
							header: "Type",
							accessorKey: "targetType",
							type: "badge",
							sortable: true,
							width: 120,
						},
						{
							id: "rel-target-state",
							header: "State",
							accessorKey: "targetState",
							type: "badge",
							sortable: true,
							width: 120,
							badgeVariants: { "In Work": "info", Released: "success" },
						},
					],
					commands: [
						{
							id: "view-rel-info",
							label: "View",
							icon: "panel-right",
							type: "side-panel",
							panelConfig: {
								title: "Relationship Details",
								endpoint: GET_ENGINEERING_ITEM,
								width: "md",
								sections: [
									{
										label: "Target",
										fields: ["targetTitle", "targetType", "targetState"],
									},
								],
							},
						},
					],
					selectable: false,
					pagination: { pageSize: 25 },
				},
			},
		},
		{
			id: "properties",
			label: "Properties",
			content: {
				type: "form",
				form: {
					id: "properties-form",
					title: "Object Properties",
					mode: "view",
					columns: 2,
					fields: [
						{
							id: "prop-title",
							label: "Title",
							type: "text",
							accessorKey: "title",
						},
						{
							id: "prop-name",
							label: "Name",
							type: "text",
							accessorKey: "name",
						},
						{
							id: "prop-revision",
							label: "Revision",
							type: "text",
							accessorKey: "revision",
						},
						{
							id: "prop-type",
							label: "Type",
							type: "text",
							accessorKey: "type",
						},
						{
							id: "prop-state",
							label: "State",
							type: "text",
							accessorKey: "state",
						},
						{
							id: "prop-owner",
							label: "Owner",
							type: "text",
							accessorKey: "owner",
						},
						{
							id: "prop-org",
							label: "Organization",
							type: "text",
							accessorKey: "organization",
						},
						{
							id: "prop-collab",
							label: "Collaborative Space",
							type: "text",
							accessorKey: "collabspace",
						},
						{
							id: "prop-description",
							label: "Description",
							type: "textarea",
							accessorKey: "description",
							colSpan: 2,
						},
						{
							id: "prop-partNumber",
							label: "Part Number",
							type: "text",
							accessorKey: "partNumber",
						},
						{
							id: "prop-weight",
							label: "Weight",
							type: "number",
							accessorKey: "Weight",
						},
						{
							id: "prop-declaredWeight",
							label: "Declared Weight",
							type: "number",
							accessorKey: "declaredWeight",
						},
					],
				},
			},
		},
	],
};
