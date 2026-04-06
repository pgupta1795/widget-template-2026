// src/features/change/configs/change-action-tabs.config.ts

import type { DAGTableConfig } from "@/components/data-grid/table-engine";

/**
 * Dynamic CA detail URL — resolves at runtime using $row or $params.
 */
const CA_BASE_URL =
	'$:"/resources/v1/modeler/dslc/changeaction/" & $params.caId';

// ─── Members Tab ──────────────────────────────────────────────────────────────

export const membersTabConfig: DAGTableConfig = {
	tableId: "ca-members",
	mode: "flat",
	dag: {
		nodes: [
			{
				id: "members-api",
				type: "api",
				config: {
					url: CA_BASE_URL,
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: { $fields: "members" },
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					responseTransform: `
            members.assignees.{
              "name": name,
              "role": "Assignee",
              "email": email
            }
          `,
				},
			},
			{
				id: "columns",
				type: "column",
				config: {
					columns: [
						{ field: "name", header: "Name", sortable: true },
						{ field: "role", header: "Role", sortable: true },
						{ field: "email", header: "Email" },
					],
				},
			},
		],
		edges: [{ from: "members-api", to: "columns" }],
		rootNodeId: "columns",
	},
	features: {
		sorting: { enabled: true },
		selection: { enabled: true, mode: "multi" },
	},
};

// ─── Proposed Changes Tab ─────────────────────────────────────────────────────

export const proposedChangesTabConfig: DAGTableConfig = {
	tableId: "ca-proposed",
	mode: "flat",
	dag: {
		nodes: [
			{
				id: "proposed-api",
				type: "api",
				config: {
					url: CA_BASE_URL,
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: { $fields: "proposedChanges" },
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					responseTransform: `
            proposedChanges.{
              "type": where.type,
              "name": where.identifier,
              "reasonForChange": why,
              "changeDetails": $join(whats.what, ", "),
              "target": target,
              "proposalStatus": status
            }
          `,
				},
			},
			{
				id: "columns",
				type: "column",
				config: {
					columns: [
						{
							field: "type",
							header: "Type",
							sortable: true,
							filterable: true,
						},
						{ field: "name", header: "Identifier", sortable: true },
						{ field: "reasonForChange", header: "Reason for Change" },
						{ field: "changeDetails", header: "Change Details" },
						{ field: "target", header: "Target" },
						{
							field: "proposalStatus",
							header: "Proposal Status",
							renderType: "badge",
						},
					],
				},
			},
		],
		edges: [{ from: "proposed-api", to: "columns" }],
		rootNodeId: "columns",
	},
	features: {
		sorting: { enabled: true },
		filtering: { enabled: true },
		columnResizing: { enabled: true },
		selection: { enabled: true, mode: "multi" },
	},
};

// ─── Realized Changes Tab ─────────────────────────────────────────────────────

export const realizedChangesTabConfig: DAGTableConfig = {
	tableId: "ca-realized",
	mode: "flat",
	dag: {
		nodes: [
			{
				id: "realized-api",
				type: "api",
				config: {
					url: CA_BASE_URL,
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: { $fields: "realizedChanges" },
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					responseTransform: `
            realizedChanges.{
              "title": where.title,
              "name": where.identifier,
              "revision": where.revision,
              "maturityState": where.state,
              "changeDetails": what,
              "status": status
            }
          `,
				},
			},
			{
				id: "columns",
				type: "column",
				config: {
					columns: [
						{ field: "title", header: "Title", sortable: true },
						{ field: "name", header: "Name", sortable: true },
						{ field: "revision", header: "Revision" },
						{
							field: "maturityState",
							header: "Maturity State",
							renderType: "badge",
						},
						{ field: "changeDetails", header: "Change Details" },
						{ field: "status", header: "Status", renderType: "badge" },
					],
				},
			},
		],
		edges: [{ from: "realized-api", to: "columns" }],
		rootNodeId: "columns",
	},
	features: {
		sorting: { enabled: true },
		columnResizing: { enabled: true },
	},
};

// ─── Approvals Tab ────────────────────────────────────────────────────────────

export const approvalsTabConfig: DAGTableConfig = {
	tableId: "ca-approvals",
	mode: "flat",
	dag: {
		nodes: [
			{
				id: "approvals-api",
				type: "api",
				config: {
					url: CA_BASE_URL,
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: { $fields: "approvals" },
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					responseTransform: `
            approvals.{
              "approver": approver,
              "status": status,
              "comment": comment,
              "date": date
            }
          `,
				},
			},
			{
				id: "columns",
				type: "column",
				config: {
					columns: [
						{ field: "approver", header: "Approver", sortable: true },
						{ field: "status", header: "Status", renderType: "badge" },
						{ field: "comment", header: "Comment" },
						{ field: "date", header: "Date", type: "date" },
					],
				},
			},
		],
		edges: [{ from: "approvals-api", to: "columns" }],
		rootNodeId: "columns",
	},
	features: {
		sorting: { enabled: true },
	},
};
