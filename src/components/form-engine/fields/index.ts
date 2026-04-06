import { registerField } from "../field-registry";
import type { FieldRenderer, FieldType } from "../types";
import { CheckboxField } from "./CheckboxField";
import { ComboboxField } from "./ComboboxField";
import { DateField } from "./DateField";
import { NumberField } from "./NumberField";
import { SelectField } from "./SelectField";
import { SwitchField } from "./SwitchField";
import { TextField } from "./TextField";
import { TextareaField } from "./TextareaField";

/**
 * Register all built-in field renderers.
 * Call once at app init or when creating a FormEngine.
 */
export function registerBuiltinFields(): void {
	const builtins: [FieldType, FieldRenderer][] = [
		["text", TextField],
		["number", NumberField],
		["select", SelectField],
		["multiselect", SelectField], // reuse select for now
		["date", DateField],
		["checkbox", CheckboxField],
		["switch", SwitchField],
		["textarea", TextareaField],
		["combobox", ComboboxField],
		["richtext", TextareaField], // fallback to textarea
		["file", TextField], // fallback to text input type=file
	];

	for (const [type, renderer] of builtins) {
		registerField(type, renderer);
	}
}

export {
	CheckboxField,
	ComboboxField,
	DateField,
	NumberField,
	SelectField,
	SwitchField,
	TextField,
	TextareaField,
};
