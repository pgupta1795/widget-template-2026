// Mock data matching 3DExperience screenshots

// ── Change Action (CHG-01) ───────────────────────────────────────────────────

export const changeActionData: Record<string, unknown> = {
	title: "CHG-01",
	name: "CA-9327401-00000001",
	type: "Change Action",
	icon: "CA",
	current: "Draft",
	owner: "User1 User1",
	collabSpace: "Common Space",
	applicability: false,
	dependency: false,
	hasAttachments: false,
	organization: "Company Name",
	flowdown: 0,
	isGoverned: false,
	description: "CHG-01",
	severity: "Medium",
	modified: "Mar 18, 2026, 11:27:52 AM",
	plannedStartDate: null,
	plannedCompletionDate: null,
	dueCompletionDate: null,
	actualCompletionDate: null,
	actualStartDate: null,
	reasonForCancel: null,
};

// ── BOM Explorer ─────────────────────────────────────────────────────────────

export const bomData: Record<string, unknown> = {
	title: "1U - 1.5U Platform - A",
	name: "prd-9327401-00000042",
	type: "Physical Product",
	current: "In Work",
	revision: "A",
	owner: "User1 User1",
	collabSpace: "Common Space",
};

// ── Part Detail ──────────────────────────────────────────────────────────────

export const partData: Record<string, unknown> = {
	title: "Structural Bracket",
	name: "eng-9327401-00000001",
	type: "VPMReference",
	current: "In Work",
	revision: "A",
	owner: "User1 User1",
	collabSpace: "Common Space",
	weight: 2.45,
	material: "Aluminum 6061-T6",
	designation: "STR-BRK-001",
};

// ── Table Row Data ───────────────────────────────────────────────────────────

export const mockTableRows: Record<string, Record<string, unknown>[]> = {
	// Change Action tables
	"ca-proposed-changes-table": [
		{
			title: "Physical Product00006024",
			name: "prd-9327401-00000042",
			revision: "A",
			current: "In Work",
			reasonForChange: "",
			change: "Target State: Release",
			changeDetails: "",
			proposalStatus: "Not Started",
			resolvedBy: "",
		},
		{
			title: "ET Structural Stiffener",
			name: "prd-9327401-00000170",
			revision: "A",
			current: "In Work",
			reasonForChange: "",
			change: "Target State: Release",
			changeDetails: "",
			proposalStatus: "Not Started",
			resolvedBy: "",
		},
		{
			title: "Physical Product00000389",
			name: "prd-9327401-00000389",
			revision: "A",
			current: "In Work",
			reasonForChange: "Physical Product00000389",
			change: "",
			changeDetails: "Physical Product00000389",
			proposalStatus: "Not Started",
			resolvedBy: "",
		},
	],
	"ca-members-table": [
		{
			name: "User1 User1",
			role: "Change Coordinator",
			email: "user1@company.com",
		},
	],
	"ca-realized-changes-table": [],
	"ca-approvals-table": [],

	// BOM Explorer tables
	"bom-tree-table": [
		{
			title: "Chassis Assembly",
			name: "prd-001",
			type: "Assembly",
			revision: "B",
			current: "Released",
			quantity: 1,
			unit: "EA",
			findNumber: "1",
		},
		{
			title: "Power Supply Unit",
			name: "prd-002",
			type: "Component",
			revision: "A",
			current: "In Work",
			quantity: 2,
			unit: "EA",
			findNumber: "2",
		},
		{
			title: "Mounting Bracket",
			name: "prd-003",
			type: "Part",
			revision: "C",
			current: "Released",
			quantity: 4,
			unit: "EA",
			findNumber: "3",
		},
	],
	"where-used-table": [
		{
			parentTitle: "1U - 1.5U Platform",
			parentName: "prd-9327401-00000042",
			parentType: "Physical Product",
			parentRevision: "A",
			parentCurrent: "In Work",
		},
	],
	"alternates-table": [],

	// Part Detail tables
	"part-documents-table": [
		{
			title: "Structural Bracket Drawing",
			name: "doc-001",
			type: "Drawing",
			revision: "A",
			current: "Released",
			modified: "Mar 15, 2026",
		},
		{
			title: "Material Specification",
			name: "doc-002",
			type: "Specification",
			revision: "B",
			current: "In Work",
			modified: "Mar 17, 2026",
		},
	],
};
