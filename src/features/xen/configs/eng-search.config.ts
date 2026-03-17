// src/features/xen/configs/eng-search.config.ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

/**
 * Engineering Item search table config.
 *
 * DAG structure (all initial-wave):
 *   root-api → columns
 *
 * Runtime params (injected via ConfiguredTable.params):
 *   searchStr — bound to the $searchStr query parameter
 *   cursor    — injected by useDAGTable infinite query for offset pagination
 */
export const engSearchConfig: DAGTableConfig = {
	tableId: "eng-search",
	mode: "infinite",

	dag: {
		nodes: [
			{
				id: "root-api",
				type: "api",
				config: {
					url: "/resources/v1/modeler/dseng/dseng:EngItem/search",
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: {
						$searchStr: '$:$params.searchStr ?? ""',
						$top: "50",
						$skip: '$:$exists($params.cursor) ? $params.cursor : "0"',
						$mask: "dskern:Mask.Default",
					},
					paginationConfig: {
						type: "offset",
						pageParam: "$skip",
						pageSizeParam: "$top",
					},
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					responseTransform: `
            member.{
              "id":           id,
              "name":         name,
              "title":        title,
              "type":         type,
              "revision":     revision,
              "state":        state,
              "owner":        owner,
              "organization": organization,
              "collabspace":  collabspace,
              "created":      created,
              "modified":     modified
            }
          `,
				},
			},

			{
				id: "columns",
				type: "column",
				config: {
					columns: [
						{ field: "name", header: "Name", sortable: true, filterable: true },
						{
							field: "title",
							header: "Title",
							sortable: true,
							filterable: true,
						},
						{ field: "type", header: "Type" },
						{ field: "revision", header: "Rev" },
						{
							field: "state",
							header: "State",
							renderType: "badge",
							classNameCell: "text-sm text-red-600",
							classNameHeader: "font-bold",
						},
						{ field: "owner", header: "Owner" },
						{ field: "organization", header: "Organization" },
						{ field: "collabspace", header: "Collab Space" },
						{ field: "created", header: "Created", type: "date" },
						{ field: "modified", header: "Modified", type: "date" },
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
		columnResizing: { enabled: true },
		columnVisibility: { enabled: true },
		selection: { enabled: true, mode: "multi" },
	},

	toolbarCommands: [
		{
			id: "search",
			type: "search",
			enabled: true,
			queryParamName: "searchStr",
			placeholder: "Search by name, description...",
		},
	],
};
