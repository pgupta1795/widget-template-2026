// src/features/change/configs/change-action-detail.config.ts

import type { FormSchema } from "@/components/form-engine";
import type { ObjectDetailConfig } from "@/components/object-detail";
import {
	approvalsTabConfig,
	membersTabConfig,
	proposedChangesTabConfig,
	realizedChangesTabConfig,
} from "./change-action-tabs.config";

const propertiesForm: FormSchema = {
	id: "ca-properties",
	title: "Change Action Properties",
	layout: "vertical",
	fetch: {
		url: "/resources/v1/modeler/dslc/changeaction/:caId",
		queryKey: ["change-action", ":caId"],
	},
	fields: [
		{
			name: "type",
			label: "Type",
			type: "text",
			readOnly: true,
		},
		{
			name: "title",
			label: "Title",
			type: "text",
			required: true,
			editTrigger: "click",
			saveStrategy: "onBlur",
			apiBinding: {
				method: "PATCH",
				url: "/resources/v1/modeler/dslc/changeaction/:caId",
				bodyKey: "title",
				staticBodyFields: ["cestamp"],
			},
		},
		{
			name: "name",
			label: "Name",
			type: "text",
			readOnly: true,
		},
		{
			name: "description",
			label: "Description",
			type: "textarea",
			editTrigger: "click",
			saveStrategy: "onBlur",
			apiBinding: {
				method: "PATCH",
				url: "/resources/v1/modeler/dslc/changeaction/:caId",
				bodyKey: "description",
				staticBodyFields: ["cestamp"],
			},
		},
		{
			name: "severity",
			label: "Severity",
			type: "select",
			options: ["None", "Low", "Medium", "High", "Critical"],
			editTrigger: "icon",
			saveStrategy: "onEnter",
			apiBinding: {
				method: "PATCH",
				url: "/resources/v1/modeler/dslc/changeaction/:caId",
				bodyKey: "severity",
				staticBodyFields: ["cestamp"],
			},
		},
		{
			name: "estimatedStart",
			label: "Planned Start Date",
			type: "date",
			editTrigger: "click",
			saveStrategy: "onBlur",
			apiBinding: {
				method: "PATCH",
				url: "/resources/v1/modeler/dslc/changeaction/:caId",
				bodyKey: "Estimated Start Date",
				staticBodyFields: ["cestamp"],
			},
		},
		{
			name: "estimatedEnd",
			label: "Planned Completion Date",
			type: "date",
			editTrigger: "click",
			saveStrategy: "onBlur",
			apiBinding: {
				method: "PATCH",
				url: "/resources/v1/modeler/dslc/changeaction/:caId",
				bodyKey: "Estimated Completion Date",
				staticBodyFields: ["cestamp"],
			},
		},
		{
			name: "actualEnd",
			label: "Due Completion Date",
			type: "date",
			editTrigger: "click",
			saveStrategy: "onBlur",
			apiBinding: {
				method: "PATCH",
				url: "/resources/v1/modeler/dslc/changeaction/:caId",
				bodyKey: "Actual Completion Date",
				staticBodyFields: ["cestamp"],
			},
		},
		{
			name: "actualStart",
			label: "Actual Start Date",
			type: "date",
			readOnly: true,
		},
		{
			name: "reasonForCancel",
			label: "Reason For Cancel",
			type: "textarea",
			editTrigger: "click",
			saveStrategy: "onBlur",
			apiBinding: {
				method: "PATCH",
				url: "/resources/v1/modeler/dslc/changeaction/:caId",
				bodyKey: "reasonForCancel",
				staticBodyFields: ["cestamp"],
			},
		},
		{
			name: "state",
			label: "Maturity State",
			type: "text",
			readOnly: true,
		},
		{
			name: "owner",
			label: "Owner",
			type: "text",
			readOnly: true,
		},
		{
			name: "organization",
			label: "Organization",
			type: "text",
			readOnly: true,
		},
		{
			name: "collabSpace",
			label: "Collaborative Space",
			type: "text",
			readOnly: true,
		},
	],
};

export const changeActionDetailConfig: ObjectDetailConfig = {
	id: "change-action-detail",
	title: "Change Action",
	icon: "GitPullRequest",
	header: {
		titleField: "title",
		badgeField: "state",
		subtitleFields: [
			{ field: "owner", label: "Owner", type: "link" },
			{ field: "collabSpace", label: "Collaborative Space", type: "link" },
			{ field: "applicability", label: "Applicability" },
			{ field: "dependency", label: "Dependency" },
			{ field: "attachments", label: "Attachments" },
			{ field: "organization", label: "Organization" },
			{ field: "flowdown", label: "Flowdown" },
			{ field: "isGoverned", label: "Is Governed" },
		],
	},
	propertiesPanel: {
		form: propertiesForm,
		defaultOpen: true,
		defaultSize: 25,
		minSize: 15,
		editable: true,
	},
	tabs: [
		{
			id: "members",
			label: "Members",
			icon: "Users",
			type: "table",
			tableConfig: membersTabConfig,
		},
		{
			id: "proposed-changes",
			label: "Proposed Changes",
			icon: "ClipboardList",
			type: "table",
			tableConfig: proposedChangesTabConfig,
		},
		{
			id: "realized-changes",
			label: "Realized Changes",
			icon: "CheckSquare",
			type: "table",
			tableConfig: realizedChangesTabConfig,
		},
		{
			id: "approvals",
			label: "Approvals",
			icon: "ShieldCheck",
			type: "table",
			tableConfig: approvalsTabConfig,
		},
	],
};
