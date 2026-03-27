// src/components/form-engine/index.ts
// Public API — expanded in later phases
export { bootstrapFormEngine } from "./bootstrap";
export { fieldTypeRegistry } from "./core/field-type-registry";
export type {
	DAGFormConfig,
	DetailPanelNodeConfig,
	FormFieldNodeConfig,
	FormFieldType,
	FormSectionNodeConfig,
	HeaderFormNodeConfig,
	FormFieldData,
	FormSectionData,
	HeaderFormData,
} from "./types/form.types";
export { ConfiguredForm } from "./configured-form";
export type { ConfiguredFormProps } from "./configured-form";
