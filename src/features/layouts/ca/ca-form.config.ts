// src/features/layouts/ca/ca-form.config.ts
import type { DAGFormConfig } from "@/components/form-engine";

const CA_DETAIL_URL =
	'$:"/resources/v1/modeler/dslc/changeaction/" & $params.nodeId';

export const caFormConfig: DAGFormConfig = {
	formId: "ca-form",
	acceptedTypes: ["ChangeAction"],
	dropParamName: "nodeId",
	dag: {
		nodes: [
			{
				id: "root-api",
				type: "api",
				config: {
					url: CA_DETAIL_URL,
					method: "GET",
					authAdapterId: "wafdata",
					headers: { Accept: "application/json" },
					responseTransform: `[{
            "identifier":    identifier,
            "name":          name,
            "title":         title,
            "state":         state,
            "description":   description,
            "severity":      severity,
            "owner":         owner,
            "organization":  organization,
            "collabSpace":   collabSpace,
            "onHold":        onHold,
            "estimatedEnd":  $."Estimated Completion Date",
            "actualEnd":     $."Actual Completion Date"
          }]`,
				},
			},
			{
				id: "save-api",
				type: "api",
				config: {
					url: CA_DETAIL_URL,
					method: "PATCH",
					authAdapterId: "wafdata",
					headers: {
						"Content-Type": "application/json",
						Accept: "application/json",
					},
				},
			},
			{
				id: "header",
				type: "headerForm",
				config: {
					sourceNodeId: "root-api",
					titleField: "title",
					nameField: "name",
					badgeField: "state",
					badgeColorMap: {
						Draft: "blue",
						"In Work": "yellow",
						Released: "green",
					},
					expandedFields: ["owner", "collabSpace"],
					keyValueFields: ["organization", "severity"],
					infoIconTogglesDetailPanel: true,
				},
			},
			// Detail panel
			{
				id: "detail",
				type: "detailPanel",
				config: {
					sourceNodeId: "root-api",
					saveApiNodeId: "save-api",
					rowKeyField: "identifier",
					sections: ["core-section", "dates-section"],
					toolbar: { showSave: true, showEdit: true, showClose: true },
					skeletonRows: 8,
				},
			},
			// Sections (content nodes — not in edges)
			{
				id: "core-section",
				type: "formSection",
				config: {
					label: "Core Details",
					layout: "vertical",
					collapsible: false,
					defaultCollapsed: false,
					fieldIds: [
						"field-name",
						"field-title",
						"field-state",
						"field-severity",
						"field-description",
					],
				},
			},
			{
				id: "dates-section",
				type: "formSection",
				config: {
					label: "Dates",
					layout: "grid",
					columns: 2,
					collapsible: true,
					defaultCollapsed: false,
					fieldIds: [
						"field-estimated-end",
						"field-actual-end",
						"field-on-hold",
					],
				},
			},
			// Fields (content nodes — not in edges)
			{
				id: "field-name",
				type: "formField",
				config: {
					fieldType: "text",
					label: "Name",
					sourceField: "name",
					editable: false,
				},
			},
			{
				id: "field-title",
				type: "formField",
				config: {
					fieldType: "text",
					label: "Title",
					sourceField: "title",
					editable: true,
				},
			},
			{
				id: "field-state",
				type: "formField",
				config: {
					fieldType: "badge",
					label: "Maturity State",
					sourceField: "state",
					editable: true,
					badgeColorMap: {
						Draft: "blue",
						"In Work": "yellow",
						Released: "green",
					},
				},
			},
			{
				id: "field-severity",
				type: "formField",
				config: {
					fieldType: "text",
					label: "Severity",
					sourceField: "severity",
					editable: true,
				},
			},
			{
				id: "field-description",
				type: "formField",
				config: {
					fieldType: "richtext",
					label: "Description",
					sourceField: "description",
					editable: true,
				},
			},
			{
				id: "field-estimated-end",
				type: "formField",
				config: {
					fieldType: "date",
					label: "Est. Completion",
					sourceField: "estimatedEnd",
					editable: true,
				},
			},
			{
				id: "field-actual-end",
				type: "formField",
				config: {
					fieldType: "date",
					label: "Act. Completion",
					sourceField: "actualEnd",
					editable: false,
				},
			},
			{
				id: "field-on-hold",
				type: "formField",
				config: {
					fieldType: "boolean",
					label: "On Hold",
					sourceField: "onHold",
					editable: true,
				},
			},
		],
		edges: [
			{ from: "root-api", to: "header" },
			{ from: "root-api", to: "detail" },
		],
		rootNodeId: "detail",
	},
};
