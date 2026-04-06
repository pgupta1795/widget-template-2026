// src/components/form-engine/validation-builder.ts

import { z, type ZodType } from "zod";
import type { FormFieldDescriptor, ValidationRule } from "./types";

/**
 * Build a Zod schema for a single field based on its validation rules.
 */
export function buildFieldSchema(descriptor: FormFieldDescriptor): ZodType {
	let schema: ZodType = z.any();

	const { type, validations = [], required } = descriptor;

	// Start with base type
	switch (type) {
		case "number":
			schema = z.coerce.number();
			break;
		case "checkbox":
		case "switch":
			schema = z.boolean();
			break;
		case "date":
			schema = z.coerce.date();
			break;
		case "multiselect":
			schema = z.array(z.string());
			break;
		default:
			schema = z.string();
			break;
	}

	// Apply validation rules
	for (const rule of validations) {
		schema = applyRule(schema, rule, type);
	}

	// Apply required — if not required, make optional + nullable
	if (required) {
		if (schema instanceof z.ZodString) {
			schema = (schema as z.ZodString).min(1, "This field is required");
		}
	} else {
		schema = schema.optional().nullable();
	}

	return schema;
}

function applyRule(
	schema: ZodType,
	rule: ValidationRule,
	_fieldType: string,
): ZodType {
	switch (rule.type) {
		case "required":
			if (schema instanceof z.ZodString) {
				return (schema as z.ZodString).min(1, rule.message);
			}
			return schema;

		case "minLength":
			if (schema instanceof z.ZodString) {
				return (schema as z.ZodString).min(rule.value as number, rule.message);
			}
			return schema;

		case "maxLength":
			if (schema instanceof z.ZodString) {
				return (schema as z.ZodString).max(rule.value as number, rule.message);
			}
			return schema;

		case "min":
			if (schema instanceof z.ZodNumber) {
				return (schema as z.ZodNumber).min(rule.value as number, rule.message);
			}
			return schema;

		case "max":
			if (schema instanceof z.ZodNumber) {
				return (schema as z.ZodNumber).max(rule.value as number, rule.message);
			}
			return schema;

		case "pattern":
			if (schema instanceof z.ZodString) {
				return (schema as z.ZodString).regex(
					new RegExp(rule.value as string),
					rule.message,
				);
			}
			return schema;

		case "email":
			if (schema instanceof z.ZodString) {
				return (schema as z.ZodString).email(rule.message);
			}
			return schema;

		case "url":
			if (schema instanceof z.ZodString) {
				return (schema as z.ZodString).url(rule.message);
			}
			return schema;

		default:
			return schema;
	}
}

/**
 * Build a Zod object schema from all field descriptors.
 * Used as the resolver for react-hook-form.
 */
export function buildFormSchema(
	fields: FormFieldDescriptor[],
): z.ZodObject<Record<string, ZodType>> {
	const shape: Record<string, ZodType> = {};
	for (const field of fields) {
		shape[field.name] = buildFieldSchema(field);
	}
	return z.object(shape);
}
