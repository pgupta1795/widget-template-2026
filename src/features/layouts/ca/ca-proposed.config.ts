// src/features/layouts/ca/ca-proposed.config.ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

const CA_PROPOSED_URL =
	'$:"/resources/v1/modeler/dslc/changeaction/" & $params.nodeId';

export const caProposedConfig: DAGTableConfig = {
	tableId: "ca-proposed",
	mode: "flat",

	dag: {
		nodes: [
			{
				id: "root-api",
				type: "api",
				config: {
					url: CA_PROPOSED_URL,
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: { $fields: "proposedChanges" },
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					// Guard against absent proposedChanges — $count returns 0 for undefined/empty.
					responseTransform: `
						$count(proposedChanges) > 0 ? proposedChanges.{
							"status":     status,
							"type":       where.type,
							"identifier": where.identifier,
							"why":        why
						} : []
					`,
				},
			},
			{
				id: "columns",
				type: "column",
				config: {
					columns: [
						{
							field: "status",
							header: "Status",
							renderType: "badge",
							sortable: true,
						},
						{ field: "type", header: "Type", sortable: true },
						{
							field: "identifier",
							header: "Identifier",
							sortable: true,
							filterable: true,
						},
						{ field: "why", header: "Why" },
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
