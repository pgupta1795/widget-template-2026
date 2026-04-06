// src/components/form-engine/types.ts

import type { Control, FieldValues, UseFormReturn } from "react-hook-form";

// ─── Field Types ─────────────────────────────────────────────────────────────

export type FieldType =
	| "text"
	| "number"
	| "select"
	| "multiselect"
	| "date"
	| "checkbox"
	| "switch"
	| "textarea"
	| "combobox"
	| "file"
	| "richtext";

export type EditTrigger = "click" | "icon" | "always";
export type SaveStrategy = "onBlur" | "onEnter" | "explicit";
export type FormLayout = "vertical" | "grid" | "sections";

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationRule {
	type:
		| "required"
		| "minLength"
		| "maxLength"
		| "min"
		| "max"
		| "pattern"
		| "email"
		| "url";
	value?: unknown;
	message: string;
}

// ─── API Binding ─────────────────────────────────────────────────────────────

export interface FieldApiBinding {
	method: "PATCH" | "PUT" | "POST";
	url: string;
	bodyKey?: string;
	headers?: Record<string, string>;
	/** Field names from the fetched object data to always merge into the request body (e.g. ["cestamp"]). */
	staticBodyFields?: string[];
}

// ─── Field Descriptor ────────────────────────────────────────────────────────

export interface FormFieldDescriptor {
	name: string;
	label: string;
	type: FieldType;
	defaultValue?: unknown;
	readOnly?: boolean;
	required?: boolean;
	placeholder?: string;
	options?: string[] | { label: string; value: string }[];
	validations?: ValidationRule[];
	editTrigger?: EditTrigger;
	saveStrategy?: SaveStrategy;
	apiBinding?: FieldApiBinding;
	visible?: unknown; // json-render visibility condition
	className?: string;
	colSpan?: number;
}

// ─── Form Schema ─────────────────────────────────────────────────────────────

export interface FormFetchConfig {
	url: string;
	queryKey: string[];
	responseTransform?: string;
}

export interface FormSchema {
	id: string;
	title: string;
	layout: FormLayout;
	columns?: number;
	fetch?: FormFetchConfig;
	fields: FormFieldDescriptor[];
}

// ─── Field Renderer ──────────────────────────────────────────────────────────

export interface FieldRendererProps {
	descriptor: FormFieldDescriptor;
	control: Control<FieldValues>;
	isEditing: boolean;
	onSave: () => void;
	onCancel: () => void;
}

export type FieldRenderer = (props: FieldRendererProps) => React.ReactNode;

// ─── API Adapter ─────────────────────────────────────────────────────────────

export interface FetchConfig {
	url: string;
	params?: Record<string, string>;
	headers?: Record<string, string>;
}

export interface UpdateConfig {
	method: "PATCH" | "PUT" | "POST";
	url: string;
	body: Record<string, unknown>;
	headers?: Record<string, string>;
}

export interface FormApiAdapter {
	fetchData(config: FetchConfig): Promise<Record<string, unknown>>;
	updateField(config: UpdateConfig): Promise<unknown>;
	batchUpdate?(fields: UpdateConfig[]): Promise<void>;
}

// ─── Engine Hooks ────────────────────────────────────────────────────────────

export interface FormEngineHooks {
	beforeFieldUpdate?: (field: string, value: unknown) => unknown;
	afterFieldUpdate?: (field: string, response: unknown) => void;
	onValidationError?: (field: string, errors: unknown) => void;
}

// ─── Provider Context ────────────────────────────────────────────────────────

export interface FormEngineContextValue {
	adapter: FormApiAdapter;
	hooks?: FormEngineHooks;
	fieldRegistry: Map<FieldType, FieldRenderer>;
	schema: FormSchema;
	form: UseFormReturn<FieldValues>;
	params?: Record<string, string>;
	editMode?: boolean;
	/** Raw data returned by the fetch, used to resolve staticBodyFields. */
	rawData?: Record<string, unknown>;
}
