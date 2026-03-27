import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import type { NavItem } from "#/components/layout/nav-items";

/**
 * Configuration for a feature domain (e.g., 'ca', 'drawing')
 * Defines metadata, UI properties, and data grid/form configurations
 */
export interface FeatureConfig {
	/** Domain identifier (e.g., 'ca', 'drawing') */
	domain: string;

	/** Lucide icon name (e.g., 'LayoutGrid', 'FileText') */
	icon: string;

	/** Display label for UI (e.g., 'CA View', 'Drawing') */
	label: string;

	/** Configuration for the list/table view - can contain JsonPrimitive values and nested structures */
	listConfig: unknown;

	/** Configuration for the detail/form view - can contain JsonPrimitive values and nested structures */
	detailConfig: unknown;

	/** Enable full-text search in the list view (optional, defaults to false) */
	enableSearch?: boolean;

	/** Enable drag-and-drop operations (optional, defaults to false) */
	enableDragDrop?: boolean;
}

// JsonPrimitive is imported to ensure alignment with DAG-based configuration system
// which uses JsonPrimitive for parameter passing and runtime value resolution
export type { JsonPrimitive };

// NavItem is imported from nav-items.ts (single source of truth)
export type { NavItem };
