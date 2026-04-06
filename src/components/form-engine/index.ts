// src/components/form-engine/index.ts

export { FormEngine } from "./FormEngine";
export type { FormEngineHandle } from "./FormEngine";
export { FormEngineProvider, useFormEngineContext } from "./FormEngineProvider";
export { InlineEditField } from "./InlineEditField";
export {
	createFieldRegistry,
	getFieldRegistry,
	registerField,
	resolveField,
} from "./field-registry";
export { registerBuiltinFields } from "./fields";
export { formCatalog } from "./form-catalog";
export { formRegistry } from "./form-registry";
export { useFieldMutation } from "./hooks/use-field-mutation";
export { useFormData } from "./hooks/use-form-data";
export { resolveFormSchema } from "./schema-resolver";
export { buildFieldSchema, buildFormSchema } from "./validation-builder";
export type {
	EditTrigger,
	FieldApiBinding,
	FieldRenderer,
	FieldRendererProps,
	FieldType,
	FormApiAdapter,
	FormEngineContextValue,
	FormEngineHooks,
	FormFetchConfig,
	FormFieldDescriptor,
	FormLayout,
	FormSchema,
	SaveStrategy,
	ValidationRule,
} from "./types";
export { wafdataFormAdapter } from "./adapters/wafdata-form-adapter";
