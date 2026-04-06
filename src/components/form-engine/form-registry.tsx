// src/components/form-engine/form-registry.tsx
//
// Builds the json-render component registry for the form engine.
// Wires up shadcn layout components and the custom FormField renderer
// that delegates to the field registry via FormEngineContext.

import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { resolveField } from "./field-registry";
import { formCatalog } from "./form-catalog";
import { useFormEngineContext } from "./FormEngineProvider";
import type { FormFieldDescriptor } from "./types";

/**
 * Form engine registry — maps catalog component names to React implementations.
 * The FormField component bridges json-render -> field registry -> actual input.
 */
export const { registry: formRegistry } = defineRegistry(formCatalog, {
	components: {
		Card: shadcnComponents.Card,
		Stack: shadcnComponents.Stack,
		Grid: shadcnComponents.Grid,
		Heading: shadcnComponents.Heading,
		Separator: shadcnComponents.Separator,
		Text: shadcnComponents.Text,

		FormField: ({ props }) => {
			const descriptor = props.descriptor as FormFieldDescriptor;
			const { form, fieldRegistry } = useFormEngineContext();
			const renderer =
				fieldRegistry.get(descriptor.type) ?? resolveField(descriptor.type);

			if (!renderer) {
				return (
					<div className="text-xs text-destructive">
						Unknown field type: {descriptor.type}
					</div>
				);
			}

			return renderer({
				descriptor,
				control: form.control,
				isEditing: descriptor.editTrigger === "always" || !descriptor.readOnly,
				onSave: () => {},
				onCancel: () => {},
			});
		},
	},
});
