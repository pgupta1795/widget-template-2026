// src/components/form-engine/fields/field-props.ts
import type React from "react";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

export interface FieldReadProps {
	value: JsonPrimitive;
	label: string;
	/** For badge: color token e.g. "blue", "yellow", "green" */
	badgeColorMap?: Record<string, string>;
	/** For link: resolved URL string */
	linkUrl?: string;
}

export interface FieldEditProps extends FieldReadProps {
	onChange: (value: JsonPrimitive) => void;
	options?: Array<{ label: string; value: JsonPrimitive }>;
	disabled?: boolean;
}

export interface FieldTypeDefinition {
	type: string;
	ReadComponent: React.ComponentType<FieldReadProps>;
	EditComponent: React.ComponentType<FieldEditProps>;
}
