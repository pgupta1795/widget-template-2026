// src/components/form-engine/form-catalog.ts
//
// Defines the json-render catalog for the form engine.
// Uses the react schema + shadcn component definitions as a base,
// then adds the custom FormField component that the field registry handles.

import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod";

export const formCatalog = defineCatalog(schema, {
	components: {
		Card: shadcnComponentDefinitions.Card,
		Stack: shadcnComponentDefinitions.Stack,
		Grid: shadcnComponentDefinitions.Grid,
		Heading: shadcnComponentDefinitions.Heading,
		Separator: shadcnComponentDefinitions.Separator,
		Text: shadcnComponentDefinitions.Text,
		FormField: {
			props: z.object({
				descriptor: z.any(),
			}),
			description:
				"A form field rendered by the field registry based on its descriptor.type",
		},
	},
	actions: {},
});
