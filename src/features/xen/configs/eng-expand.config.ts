// src/features/xen/configs/eng-expand.config.ts
import type { DAGTableConfig } from "@/components/data-grid/table-engine";

/**
 * Engineering Item expand tree config.
 *
 * DAG structure:
 *   Initial-wave: root-api → row-expand → columns
 *   Lazy:         child-expand-api  (triggered by RowExpandNode on row open)
 *
 * Runtime params (injected via ConfiguredTable.params):
 *   nodeId — the engineering item ID whose immediate children to load
 *
 * The RowExpandNodeExecutor re-injects `nodeId` for each expansion,
 * so root-api and child-expand-api share the same URL and responseTransform.
 *
 * responseTransform filters out the expanded node itself (id != $params.nodeId)
 * and keeps only VPMReference items (excludes VPMInstance and Path entries).
 *
 * _hasChildren is set to true for all children. Leaf nodes will show an expand
 * affordance; clicking it fires the API and returns empty rows, collapsing the
 * row. This is a known UX trade-off — the expand API does not expose a child
 * count, so we cannot pre-determine which nodes are leaves.
 */
const EXPAND_URL =
	'$:"/resources/v1/modeler/dseng/dseng:EngItem/" & $params.nodeId & "/expand"';

const EXPAND_RESPONSE_TRANSFORM = `
  member[type = "VPMReference" and id != $params.nodeId].{
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
    "modified":     modified,
    "_hasChildren": true
  }
`;

export const engExpandConfig: DAGTableConfig = {
	tableId: "eng-expand",
	mode: "tree",

	dag: {
		nodes: [
			// ─── Initial-wave nodes ───────────────────────────────────────────────

			{
				id: "root-api",
				type: "api",
				config: {
					url: EXPAND_URL,
					method: "POST",
					authAdapterId: "wafdata",
					body: { expandDepth: 1, withPath: true },
					responseTransform: EXPAND_RESPONSE_TRANSFORM,
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
				},
			},

			{
				id: "row-expand",
				type: "rowExpand",
				config: {
					triggerOnExpand: true,
					// Lazy node — NOT in edges
					childApiNodeId: "child-expand-api",
					// Evaluates $row.id → injected as $params.nodeId in child context
					childKeyExpr: "$:$row.id",
					childQueryParam: "nodeId",
					maxDepth: 10,
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
						},
						{ field: "owner", header: "Owner" },
						{ field: "organization", header: "Organization" },
						{ field: "collabspace", header: "Collab Space" },
						{ field: "created", header: "Created", type: "date" },
						{ field: "modified", header: "Modified", type: "date" },
					],
				},
			},

			// ─── Lazy node ────────────────────────────────────────────────────────

			{
				id: "child-expand-api",
				type: "api",
				config: {
					// $params.nodeId is injected by RowExpandNodeExecutor via childQueryParam
					url: EXPAND_URL,
					method: "POST",
					authAdapterId: "wafdata",
					body: { expandDepth: 1, withPath: true },
					responseTransform: EXPAND_RESPONSE_TRANSFORM,
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
				},
			},

			// ─── Toolbar action nodes ─────────────────────────────────────────────

			{
				id: "expand-all-api",
				type: "api",
				config: {
					// Expand all nodes in the tree recursively
					url: '$:"/resources/v1/modeler/dseng/dseng:EngItem/" & $params.nodeId & "/expand"',
					method: "POST",
					authAdapterId: "wafdata",
					body: { expandDepth: 10, withPath: true },
					responseTransform: EXPAND_RESPONSE_TRANSFORM,
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
				},
			},
		],

		edges: [
			{ from: "root-api", to: "row-expand" },
			{ from: "row-expand", to: "columns" },
		],

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
			id: "expand-all",
			type: "command",
			action: "expand-all-api",
			enabled: true,
			label: "Expand All",
			icon: "ChevronDownSquare",
		},
	],
};
