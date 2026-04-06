// src/components/form-engine/schema-resolver.ts

import type { FormFieldDescriptor, FormLayout, FormSchema } from "./types";

/**
 * A json-render element node.
 */
interface SpecElement {
	type: string;
	props: Record<string, unknown>;
	children?: SpecElement[];
	visible?: unknown;
}

/**
 * The json-render spec root.
 */
export interface FormSpec {
	root: SpecElement;
}

/**
 * Convert a FormSchema into a json-render element tree (spec).
 *
 * Layout modes:
 * - "vertical": Stack of fields
 * - "grid": CSS grid with configurable columns
 * - "sections": grouped by field separator (future; falls back to vertical)
 */
export function resolveFormSchema(schema: FormSchema): FormSpec {
	const fieldElements = schema.fields.map(resolveField);

	const root = wrapInLayout(fieldElements, schema.layout, schema.columns);

	return { root };
}

function resolveField(descriptor: FormFieldDescriptor): SpecElement {
	const element: SpecElement = {
		type: "FormField",
		props: {
			descriptor,
		},
		visible: descriptor.visible,
	};

	return element;
}

function wrapInLayout(
	children: SpecElement[],
	layout: FormLayout,
	columns?: number,
): SpecElement {
	switch (layout) {
		case "grid":
			return {
				type: "Grid",
				props: {
					columns: columns ?? 2,
					gap: 4,
				},
				children,
			};

		case "sections":
			// Future: group fields by section markers
			// Falls through to vertical for now
			return {
				type: "Stack",
				props: {
					direction: "column",
					gap: 3,
				},
				children,
			};

		default:
			return {
				type: "Stack",
				props: {
					direction: "column",
					gap: 3,
				},
				children,
			};
	}
}
