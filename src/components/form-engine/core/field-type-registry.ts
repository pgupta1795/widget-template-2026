// src/components/form-engine/core/field-type-registry.ts
import type { FieldTypeDefinition } from "../fields/field-props";

export class FieldTypeRegistry {
	private readonly map = new Map<string, FieldTypeDefinition>();

	register(definition: FieldTypeDefinition): this {
		this.map.set(definition.type, definition);
		return this;
	}

	resolve(type: string): FieldTypeDefinition {
		const def = this.map.get(type);
		if (!def)
			throw new Error(`No field renderer registered for type: "${type}"`);
		return def;
	}

	has(type: string): boolean {
		return this.map.has(type);
	}
}

// Singleton — shared across the app
export const fieldTypeRegistry = new FieldTypeRegistry();
