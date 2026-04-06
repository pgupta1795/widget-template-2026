// src/components/object-detail/types.ts

import type { DAGTableConfig } from "@/components/data-grid/table-engine";
import type { FormSchema } from "@/components/form-engine";

export interface HeaderField {
	field: string;
	label: string;
	type?: "text" | "badge" | "link";
	linkPrefix?: string;
}

export interface TabConfig {
	id: string;
	label: string;
	icon: string; // lucide icon name
	type: "table";
	tableConfig: DAGTableConfig;
}

export interface ObjectDetailConfig {
	id: string;
	title: string;
	icon?: string; // lucide icon name
	header: {
		titleField: string;
		subtitleFields?: HeaderField[];
		badgeField?: string;
	};
	propertiesPanel: {
		form: FormSchema;
		defaultOpen?: boolean;
		defaultSize?: number; // % width, default 25
		minSize?: number; // % width, default 15
		editable?: boolean;
	};
	tabs: TabConfig[];
}
