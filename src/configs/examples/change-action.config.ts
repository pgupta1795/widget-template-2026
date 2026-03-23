import type { ViewConfig } from "@/types";

/**
 * Change Action View Config
 *
 * Matches the 3DExperience CHG-01 Change Action view from the reference screenshots:
 * - Header form showing CHG-01 details (title, state, owner, org, etc.)
 * - Tab bar: Members, Proposed Changes, Realized Changes, Approvals
 * - Proposed Changes tab shows a data-grid table
 * - Object detail panel on the right side
 */
export const changeActionConfig: ViewConfig = {
	id: "change-action-view",
	title: "Change Action",
	description: "Change Action detail view with header form, tabs, and detail panel",

	context: {
		type: "Change Action",
		objectId: "{{widgetContext.objectId}}",
		dataSource: {
			id: "ds-change-action",
			service: "3DSpace",
			endpoint:
				"/resources/v1/modeler/dsca/dsca:ChangeAction/{{objectId}}",
			method: "GET",
			transform: "$.data[0]",
		},
	},

	// ── Layout: main content (stack of header + tabs) with sidebar detail panel ──
	layout: {
		id: "ca-root-layout",
		type: "sidebar",
		sizes: [72, 28],
		resizable: true,
		children: [
			{
				type: "layout",
				configId: "ca-main-stack",
			},
			{
				type: "detail-panel",
				configId: "ca-detail-form",
				collapsible: true,
				defaultCollapsed: false,
				minSize: 20,
				maxSize: 40,
			},
		],
	},

	// ── Forms ────────────────────────────────────────────────────────────────────
	forms: {
		"ca-header-form": {
			id: "ca-header-form",
			type: "header",
			title: "CHG-01",
			dataSource: {
				id: "ds-ca-header",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dsca/dsca:ChangeAction/{{objectId}}",
				method: "GET",
				transform: "$.data[0]",
			},
			sections: [
				{
					id: "ca-header-primary",
					layout: "horizontal",
					fields: [
						{
							id: "state",
							label: "Maturity State",
							attribute: "current",
							type: "badge",
							badgeConfig: {
								colorMap: {
									Draft: { bg: "#DBEAFE", text: "#1E40AF" },
									"In Work": { bg: "#E0F2FE", text: "#0369A1" },
									"In Approval": {
										bg: "#FEF3C7",
										text: "#92400E",
									},
									Complete: { bg: "#DCFCE7", text: "#166534" },
									Rejected: { bg: "#FEE2E2", text: "#991B1B" },
								},
							},
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
							type: "link",
							linkConfig: {
								urlTemplate: "#/space/{{value}}",
								target: "_self",
							},
						},
					],
				},
				{
					id: "ca-header-attributes",
					layout: "horizontal",
					fields: [
						{
							id: "applicability",
							label: "Applicability",
							attribute: "applicability",
							type: "boolean",
						},
						{
							id: "dependency",
							label: "Dependency",
							attribute: "dependency",
							type: "boolean",
						},
						{
							id: "attachments",
							label: "Attachments",
							attribute: "hasAttachments",
							type: "boolean",
						},
					],
				},
				{
					id: "ca-header-org",
					layout: "horizontal",
					fields: [
						{
							id: "organization",
							label: "Organization",
							attribute: "organization",
							type: "link",
							linkConfig: {
								urlTemplate: "#/org/{{value}}",
								target: "_self",
							},
						},
						{
							id: "flowdown",
							label: "Flowdown",
							attribute: "flowdown",
							type: "number",
						},
						{
							id: "isGoverned",
							label: "Is Governed",
							attribute: "isGoverned",
							type: "boolean",
						},
					],
				},
			],
		},

		"ca-detail-form": {
			id: "ca-detail-form",
			type: "detail",
			title: "Change Action Details",
			dataSource: {
				id: "ds-ca-detail",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dsca/dsca:ChangeAction/{{objectId}}",
				method: "GET",
				transform: "$.data[0]",
			},
			toolbar: {
				actions: [
					{ id: "edit", label: "Edit", icon: "✏️" },
					{ id: "history", label: "History", icon: "📋" },
					{ id: "properties", label: "Properties", icon: "⚙️" },
				],
			},
			sections: [
				{
					id: "ca-detail-identity",
					label: "Identity",
					layout: "vertical",
					collapsible: true,
					fields: [
						{
							id: "type",
							label: "Type",
							attribute: "type",
							type: "text",
						},
						{
							id: "title",
							label: "Title",
							attribute: "title",
							type: "text",
						},
						{
							id: "name",
							label: "Name",
							attribute: "name",
							type: "text",
						},
						{
							id: "description",
							label: "Description",
							attribute: "description",
							type: "text",
						},
					],
				},
				{
					id: "ca-detail-attributes",
					label: "Attributes",
					layout: "vertical",
					collapsible: true,
					fields: [
						{
							id: "severity",
							label: "Severity",
							attribute: "severity",
							type: "text",
						},
						{
							id: "plannedStartDate",
							label: "Planned Start Date",
							attribute: "plannedStartDate",
							type: "date",
						},
						{
							id: "plannedCompletionDate",
							label: "Planned Completion Date",
							attribute: "plannedCompletionDate",
							type: "date",
						},
						{
							id: "dueCompletionDate",
							label: "Due Completion Date",
							attribute: "dueCompletionDate",
							type: "date",
						},
						{
							id: "actualCompletionDate",
							label: "Actual Completion Date",
							attribute: "actualCompletionDate",
							type: "date",
						},
						{
							id: "actualStartDate",
							label: "Actual Start Date",
							attribute: "actualStartDate",
							type: "date",
						},
						{
							id: "reasonForCancel",
							label: "Reason For Cancel",
							attribute: "reasonForCancel",
							type: "text",
						},
					],
				},
				{
					id: "ca-detail-state",
					label: "State",
					layout: "vertical",
					collapsible: true,
					fields: [
						{
							id: "maturityState",
							label: "Maturity State",
							attribute: "current",
							type: "badge",
							badgeConfig: {
								colorMap: {
									Draft: { bg: "#DBEAFE", text: "#1E40AF" },
									"In Work": {
										bg: "#E0F2FE",
										text: "#0369A1",
									},
									"In Approval": {
										bg: "#FEF3C7",
										text: "#92400E",
									},
									Complete: {
										bg: "#DCFCE7",
										text: "#166534",
									},
									Rejected: {
										bg: "#FEE2E2",
										text: "#991B1B",
									},
								},
							},
						},
						{
							id: "detailOwner",
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
			],
		},
	},

	// ── Tabs ─────────────────────────────────────────────────────────────────────
	tabs: {
		"ca-main-tabs": [
			{
				id: "members",
				label: "Members",
				icon: "👥",
				content: {
					type: "table",
					tableId: "ca-members-table",
				},
			},
			{
				id: "proposed-changes",
				label: "Proposed Changes",
				icon: "📝",
				badge: "3",
				content: {
					type: "table",
					tableId: "ca-proposed-changes-table",
				},
			},
			{
				id: "realized-changes",
				label: "Realized Changes",
				icon: "✅",
				content: {
					type: "table",
					tableId: "ca-realized-changes-table",
				},
			},
			{
				id: "approvals",
				label: "Approvals",
				icon: "✓",
				content: {
					type: "table",
					tableId: "ca-approvals-table",
				},
			},
		],
	},

	// ── Tables (data-grid configs would be referenced here) ──────────────────────
	tables: {
		"ca-proposed-changes-table": {
			columns: [
				{ id: "title", header: "Title", accessorKey: "title" },
				{ id: "name", header: "Name", accessorKey: "name" },
				{ id: "revision", header: "Revision", accessorKey: "revision" },
				{
					id: "maturityState",
					header: "Maturity State",
					accessorKey: "current",
				},
				{
					id: "reasonForChange",
					header: "Reason for change",
					accessorKey: "reasonForChange",
				},
				{ id: "change", header: "Change", accessorKey: "change" },
				{
					id: "changeDetails",
					header: "Change Details",
					accessorKey: "changeDetails",
				},
				{
					id: "proposalStatus",
					header: "Proposal Status",
					accessorKey: "proposalStatus",
				},
				{
					id: "resolvedBy",
					header: "Resolved By",
					accessorKey: "resolvedBy",
				},
			],
			dataSource: {
				id: "ds-proposed-changes",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dsca/dsca:ChangeAction/{{objectId}}/dsca:ProposedChanges",
				method: "GET",
				transform: "$.data",
			},
		},
		"ca-members-table": {
			columns: [
				{ id: "name", header: "Name", accessorKey: "name" },
				{ id: "role", header: "Role", accessorKey: "role" },
				{ id: "email", header: "Email", accessorKey: "email" },
			],
			dataSource: {
				id: "ds-members",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dsca/dsca:ChangeAction/{{objectId}}/members",
				method: "GET",
				transform: "$.data",
			},
		},
		"ca-realized-changes-table": {
			columns: [
				{ id: "title", header: "Title", accessorKey: "title" },
				{ id: "name", header: "Name", accessorKey: "name" },
				{ id: "revision", header: "Revision", accessorKey: "revision" },
				{
					id: "maturityState",
					header: "Maturity State",
					accessorKey: "current",
				},
			],
			dataSource: {
				id: "ds-realized-changes",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dsca/dsca:ChangeAction/{{objectId}}/dsca:RealizedChanges",
				method: "GET",
				transform: "$.data",
			},
		},
		"ca-approvals-table": {
			columns: [
				{ id: "approver", header: "Approver", accessorKey: "approver" },
				{ id: "status", header: "Status", accessorKey: "status" },
				{
					id: "approvalDate",
					header: "Approval Date",
					accessorKey: "approvalDate",
				},
				{ id: "comments", header: "Comments", accessorKey: "comments" },
			],
			dataSource: {
				id: "ds-approvals",
				service: "3DSpace",
				endpoint:
					"/resources/v1/modeler/dsca/dsca:ChangeAction/{{objectId}}/approvals",
				method: "GET",
				transform: "$.data",
			},
		},
	},

	// ── Nested Layouts ───────────────────────────────────────────────────────────
	layouts: {
		"ca-main-stack": {
			id: "ca-main-stack",
			type: "stack",
			children: [
				{
					type: "header-form",
					configId: "ca-header-form",
				},
				{
					type: "tabs",
					configId: "ca-main-tabs",
				},
			],
		},
	},
};
