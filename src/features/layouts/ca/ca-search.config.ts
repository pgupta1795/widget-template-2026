// src/features/xen/configs/ca-search.config.ts
//
// Change Action search table with real API shapes from 3DEXPERIENCE dslc API.
//
// Search response shape:
//   { "changeAction": [{ identifier, relativePath, source, type }] }
//   → only identifier + type in root-api rows; everything else from rowEnrich.
//
// Detail response shape (GET /changeaction/{id}):
//   Flat JSON object — NOT wrapped in { data: [...] }.
//   responseTransform wraps it: [$] → array of one row.
//
// rowEnrich (eager) — ca-detail-api fires for every row immediately after root-api.
//   mergeTransform picks: name, title, state, description, severity, owner,
//   organization, collabSpace, estimatedEndDate, actualEndDate, onHold.
//
// columnHydrate (lazy) — members-api and proposed-api are gated behind
//   "Load Details" toolbar button (ctx.triggerHydrate per column).
//
// DAG edges:
//   root-api → row-enrich → col-hydrate → columns
//
// Lazy nodes (in nodes[], NOT in edges[]):
//   ca-detail-api, members-api, proposed-api

import type { DAGTableConfig } from "@/components/data-grid/table-engine";

/**
 * Dynamic URL: builds /changeaction/{row.identifier} at runtime.
 * $row.identifier is provided by the rowEnrich / columnHydrate machinery.
 */
const CA_DETAIL_URL =
	'$:"/resources/v1/modeler/dslc/changeaction/" & $row.identifier';

export const caSearchConfig: DAGTableConfig = {
	tableId: "ca-search",
	mode: "infinite",
	rowNavigation: {
		to: "/ca/$nodeId",
		paramField: "identifier",
		paramName: "nodeId",
	},

	dag: {
		nodes: [
			// ─── Root API ─────────────────────────────────────────────────────────
			// Search returns { "changeAction": [{ identifier, relativePath, source, type }] }
			// We keep only identifier + type here; all other fields come via rowEnrich.
			{
				id: "root-api",
				type: "api",
				config: {
					url: "/resources/v1/modeler/dslc/changeaction/search",
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: {
						$searchStr: '$:$params.searchStr ?? ""',
						$top: "50",
						$skip: '$:$exists($params.cursor) ? $params.cursor : "0"',
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
					// Map over the changeAction array.
					// Only identifier and type are available from the search index;
					// name/title/state/etc. are fetched by rowEnrich below.
					responseTransform: `
						changeAction.{
							"identifier":   identifier,
							"relativePath": relativePath,
							"type":         type
						}
					`,
				},
			},

			// ─── Lazy API nodes (declared in nodes[], NOT in edges[]) ─────────────

			// Core detail call used by rowEnrich.
			// Response is a single flat CA object → wrap in [] so the executor
			// gets a one-element GridRow array; rowEnrich takes rows[0].
			{
				id: "ca-detail-api",
				type: "api",
				config: {
					url: CA_DETAIL_URL,
					method: "GET",
					authAdapterId: "wafdata",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					// Wrap the flat object in an array then normalise field names.
					// "Estimated Completion Date" and "Actual Completion Date" have spaces
					// so they must be quoted in JSONata.
					responseTransform: `
						[{
							"name":              name,
							"title":             title,
							"state":             state,
							"description":       description,
							"severity":          severity,
							"owner":             owner,
							"organization":      organization,
							"collabSpace":       collabSpace,
							"onHold":            onHold,
							"estimatedStart":    $."Estimated Start Date",
							"estimatedEnd":      $."Estimated Completion Date",
							"actualStart":       $."Actual Start Date",
							"actualEnd":         $."Actual Completion Date"
						}]
					`,
				},
			},

			// Detail call with $fields=members.
			// members object shape: { assignees: [...], reviewers: [...], followers: [...], ... }
			// We roll up each group into a readable summary string.
			{
				id: "members-api",
				type: "api",
				config: {
					url: CA_DETAIL_URL,
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: { $fields: "members" },
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					responseTransform: `
						[{
							"assignees":  $join(members.assignees,      ", "),
							"reviewers":  $join(members.reviewers,      ", "),
							"followers":  $join(members.followers,      ", ")
						}]
					`,
				},
			},

			// Detail call with $fields=proposedChanges.
			// proposedChanges is an array: [{ status, why, where: { type, identifier }, ... }]
			// We summarise as "N change(s): <status list>".
			{
				id: "proposed-api",
				type: "api",
				config: {
					url: CA_DETAIL_URL,
					method: "GET",
					authAdapterId: "wafdata",
					queryParams: { $fields: "proposedChanges" },
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
					responseTransform: `
						[{
							"proposedCount":   $count(proposedChanges),
							"proposedChanges": $join(
								proposedChanges.(status & " → " & where.type),
								" | "
							)
						}]
					`,
				},
			},

			// ─── rowEnrich ────────────────────────────────────────────────────────
			// Eager (lazy defaults to false).
			// Fires ca-detail-api per row and merges the normalised fields.
			// rowKeyField = "identifier" because that's what the search exposes.
			{
				id: "row-enrich",
				type: "rowEnrich",
				config: {
					sourceNodeId: "root-api",
					childApiNodeId: "ca-detail-api",
					rowKeyField: "identifier",
					// Input to mergeTransform: rows[0] of ca-detail-api output
					// (already normalised by responseTransform above).
					mergeTransform: `{
						"name":           name,
						"title":          title,
						"state":          state,
						"description":    description,
						"severity":       severity,
						"owner":          owner,
						"organization":   organization,
						"collabSpace":    collabSpace,
						"onHold":         onHold,
						"estimatedStart": estimatedStart,
						"estimatedEnd":   estimatedEnd,
						"actualStart":    actualStart,
						"actualEnd":      actualEnd
					}`,
				},
			},

			// ─── columnHydrate ────────────────────────────────────────────────────
			{
				id: "col-hydrate",
				type: "columnHydrate",
				config: {
					sourceNodeId: "root-api",
					rowKeyField: "identifier",
					columns: [
						{
							columnId: "assignees",
							childApiNodeId: "members-api",
							mergeTransform: `{ "assignees": assignees }`,
						},
						{
							columnId: "reviewers",
							childApiNodeId: "members-api",
							mergeTransform: `{ "reviewers": reviewers }`,
						},
						{
							columnId: "proposedChanges",
							childApiNodeId: "proposed-api",
							mergeTransform: `{ "proposedChanges": proposedChanges, "proposedCount": proposedCount }`,
						},
					],
				},
			},

			// ─── Columns ──────────────────────────────────────────────────────────
			{
				id: "columns",
				type: "column",
				config: {
					columns: [
						// From root-api (always present)
						{ field: "type", header: "Type", sortable: true },
						{ field: "identifier", header: "ID", hidden: true },

						// From rowEnrich (ca-detail-api) — populated after root load
						{ field: "name", header: "Name", sortable: true, filterable: true },
						{
							field: "title",
							header: "Title",
							sortable: true,
							filterable: true,
						},
						{
							field: "state",
							header: "State",
							renderType: "badge",
						},
						{ field: "severity", header: "Severity" },
						{ field: "owner", header: "Owner" },
						{ field: "organization", header: "Organization" },
						{ field: "collabSpace", header: "Collab Space" },
						{ field: "description", header: "Description" },
						{ field: "estimatedStart", header: "Est. Start", type: "date" },
						{ field: "estimatedEnd", header: "Est. End", type: "date" },
						{
							field: "actualStart",
							header: "Act. Start",
							type: "date",
							hidden: true,
						},
						{
							field: "actualEnd",
							header: "Act. End",
							type: "date",
							hidden: true,
						},
						{ field: "onHold", header: "On Hold", type: "boolean" },

						// From columnHydrate (lazy — populated after "Load Details")
						{ field: "assignees", header: "Assignees", hidden: false },
						{ field: "reviewers", header: "Reviewers", hidden: false },
						{
							field: "proposedChanges",
							header: "Proposed Changes",
							hidden: false,
						},
						{
							field: "proposedCount",
							header: "# Proposed",
							type: "number",
							hidden: true,
						},
					],
				},
			},
		],

		edges: [
			{ from: "root-api", to: "row-enrich" },
			{ from: "row-enrich", to: "col-hydrate" },
			{ from: "col-hydrate", to: "columns" },
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
			id: "search",
			type: "search",
			enabled: true,
			queryParamName: "searchStr",
			placeholder: "Search change actions...",
		},
		{
			id: "spacer",
			type: "spacer",
			enabled: true,
		},
		{
			id: "columnVisibility",
			type: "menu",
			enabled: true,
			label: "Columns",
			icon: "Columns3",
			commands: [],
		},
		{
			id: "density",
			type: "menu",
			enabled: true,
			icon: "AlignJustify",
			commands: [],
		},
		{
			id: "refresh",
			type: "command",
			enabled: true,
			label: "Refresh",
			icon: "RefreshCw",
		},
		{
			id: "export",
			type: "command",
			enabled: true,
			label: "Export",
			icon: "Download",
		},
	],
};
