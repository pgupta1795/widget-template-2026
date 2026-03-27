// src/features/layouts/ca/ca-members.config.ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

const CA_MEMBERS_URL =
	'$:"/resources/v1/modeler/dslc/changeaction/" & $params.nodeId';

export const caMembersConfig: DAGTableConfig = {
	tableId: "ca-members",
	mode: "flat",

	dag: {
		nodes: [
			{
				id: "root-api",
				type: "api",
				config: {
					url: CA_MEMBERS_URL,
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: { $fields: "members" },
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					// Flatten assignees, reviewers, followers into role+name rows.
					// $append treats undefined as empty — safe when a group is absent.
					responseTransform: `
						$append($append(
							members.assignees.{"role": "Assignee", "name": $},
							members.reviewers.{"role": "Reviewer", "name": $}
						), members.followers.{"role": "Follower", "name": $})
					`,
				},
			},
			{
				id: "columns",
				type: "column",
				config: {
					columns: [
						{ field: "role", header: "Role", sortable: true },
						{ field: "name", header: "Name", sortable: true, filterable: true },
					],
				},
			},
		],

		edges: [{ from: "root-api", to: "columns" }],
		rootNodeId: "columns",
	},

	features: {
		sorting: { enabled: true },
		filtering: { enabled: true },
		columnVisibility: { enabled: false },
	},
};
