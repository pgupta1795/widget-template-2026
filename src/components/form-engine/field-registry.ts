import type { FieldRenderer, FieldType } from "./types";

const fieldRegistry = new Map<FieldType, FieldRenderer>();

export function registerField(type: FieldType, renderer: FieldRenderer): void {
	fieldRegistry.set(type, renderer);
}

export function resolveField(type: FieldType): FieldRenderer | undefined {
	return fieldRegistry.get(type);
}

export function getFieldRegistry(): Map<FieldType, FieldRenderer> {
	return fieldRegistry;
}

export function createFieldRegistry(): Map<FieldType, FieldRenderer> {
	return new Map(fieldRegistry);
}
