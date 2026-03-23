// src/components/data-grid/toolbar/icon-resolver.ts
import * as LucideIcons from "lucide-react";
import type { ComponentType } from "react";

export type IconComponent = ComponentType<{ className?: string }>;

/**
 * Resolves a lucide-react icon name string to its React component.
 * Falls back to AlertCircle for unknown names.
 * Used when icon field on ToolbarCommand is a string (e.g. from DAG config).
 */
export function resolveLucideIcon(name: string): IconComponent {
	const fallback = LucideIcons.AlertCircle as IconComponent;
	if (!name) return fallback;
	const icon = (LucideIcons as Record<string, unknown>)[name];
	if (typeof icon === "function" || (typeof icon === "object" && icon !== null))
		return icon as IconComponent;
	return fallback;
}
