import type { ColumnDef } from "@tanstack/react-table";
import type { GridRow } from "./grid-types";
import type { EditorProps } from "./editor-types";

export type ColumnType =
	| "string"
	| "number"
	| "date"
	| "multi-value"
	| "select"
	| "boolean"
	| "code"
	| "custom";

export interface SelectOption {
	label: string;
	value: string;
	color?: string;
}

export interface ColumnMeta {
	type?: ColumnType;
	editable?: boolean;
	copyable?: boolean;
	format?: "currency" | "percent" | "decimal";
	currency?: string;
	locale?: string;
	dateFormat?: string;
	options?: SelectOption[];
	maxVisible?: number;
	trueLabel?: string;
	falseLabel?: string;
	renderAs?: "badge" | "checkbox" | "icon";
	language?: string;
	maxLines?: number;
	saveOnBlur?: boolean;
	renderEditor?: (props: EditorProps) => React.ReactNode;
	renderType?: "badge" | "boolean" | "date" | "code" | "custom";
	classNameHeader?: string;
	classNameCell?: string;
	[key: string]: unknown;
}

export type GridColumnDef<TData = GridRow> = ColumnDef<TData> & {
	meta?: ColumnMeta;
};
