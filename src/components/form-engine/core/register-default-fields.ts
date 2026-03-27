// src/components/form-engine/core/register-default-fields.ts
import { fieldTypeRegistry } from "./field-type-registry";
import { TextFieldRead, TextFieldEdit } from "../fields/text-field";
import { DateFieldRead, DateFieldEdit } from "../fields/date-field";
import { BadgeFieldRead, BadgeFieldEdit } from "../fields/badge-field";
import { LinkFieldRead, LinkFieldEdit } from "../fields/link-field";
import { DropdownFieldRead, DropdownFieldEdit } from "../fields/dropdown-field";
import { NumberFieldRead, NumberFieldEdit } from "../fields/number-field";
import { BooleanFieldRead, BooleanFieldEdit } from "../fields/boolean-field";
import { ImageFieldRead, ImageFieldEdit } from "../fields/image-field";
import { RichtextFieldRead, RichtextFieldEdit } from "../fields/richtext-field";
import { KeyvalueFieldRead, KeyvalueFieldEdit } from "../fields/keyvalue-field";

export function registerDefaultFields(): void {
	fieldTypeRegistry
		.register({
			type: "text",
			ReadComponent: TextFieldRead,
			EditComponent: TextFieldEdit,
		})
		.register({
			type: "date",
			ReadComponent: DateFieldRead,
			EditComponent: DateFieldEdit,
		})
		.register({
			type: "badge",
			ReadComponent: BadgeFieldRead,
			EditComponent: BadgeFieldEdit,
		})
		.register({
			type: "link",
			ReadComponent: LinkFieldRead,
			EditComponent: LinkFieldEdit,
		})
		.register({
			type: "dropdown",
			ReadComponent: DropdownFieldRead,
			EditComponent: DropdownFieldEdit,
		})
		.register({
			type: "number",
			ReadComponent: NumberFieldRead,
			EditComponent: NumberFieldEdit,
		})
		.register({
			type: "boolean",
			ReadComponent: BooleanFieldRead,
			EditComponent: BooleanFieldEdit,
		})
		.register({
			type: "image",
			ReadComponent: ImageFieldRead,
			EditComponent: ImageFieldEdit,
		})
		.register({
			type: "richtext",
			ReadComponent: RichtextFieldRead,
			EditComponent: RichtextFieldEdit,
		})
		.register({
			type: "keyvalue",
			ReadComponent: KeyvalueFieldRead,
			EditComponent: KeyvalueFieldEdit,
		});
}
