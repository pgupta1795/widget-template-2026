// src/components/data-grid/toolbar/merge-toolbar-commands.ts
import type { ToolbarCommand } from "./toolbar.types";

/**
 * Merges override commands into a base command list.
 *
 * Rules:
 * 1. Returns a copy of base in original order.
 * 2. Override with matching id: fully replaces the base entry (no partial merge).
 * 3. Override with new id: appended after all base entries, in override order.
 * 4. undefined or empty overrides: returns base copy unchanged.
 */
export function mergeToolbarCommands(
	base: ToolbarCommand[],
	overrides?: ToolbarCommand[],
): ToolbarCommand[] {
	if (!overrides || overrides.length === 0) return [...base];

	const result = [...base];

	for (const override of overrides) {
		const idx = result.findIndex((c) => c.id === override.id);
		if (idx !== -1) {
			result[idx] = override;
		} else {
			result.push(override);
		}
	}

	return result;
}
