// src/components/tab-engine/core/tab-content-registry.ts
import type { TabContentDefinition } from "../types/tab.types";

export class TabContentRegistry {
	private readonly map = new Map<string, TabContentDefinition>();

	register(definition: TabContentDefinition): this {
		this.map.set(definition.type, definition);
		return this;
	}

	resolve(type: string): TabContentDefinition {
		const def = this.map.get(type);
		if (!def)
			throw new Error(
				`[TabEngine] No content renderer registered for type: "${type}"`,
			);
		return def;
	}

	has(type: string): boolean {
		return this.map.has(type);
	}
}

// Singleton — shared across the app
export const tabContentRegistry = new TabContentRegistry();
