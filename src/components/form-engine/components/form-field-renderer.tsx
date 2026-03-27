// src/components/form-engine/components/form-field-renderer.tsx
import { fieldTypeRegistry } from "../core/field-type-registry";
import type { FormFieldData } from "../types/form.types";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

interface FormFieldRendererProps {
	field: FormFieldData;
	isEditing: boolean;
	onChange: (fieldId: string, value: JsonPrimitive) => void;
}

export function FormFieldRenderer({
	field,
	isEditing,
	onChange,
}: FormFieldRendererProps) {
	const def = fieldTypeRegistry.resolve(field.fieldType);
	const canEdit = isEditing && field.editable;

	const sharedProps = {
		value: field.value,
		label: field.label,
		badgeColorMap: field.badgeColorMap,
		linkUrl: field.linkUrl,
		options: field.options,
	};

	return (
		<div className="flex flex-col gap-0.5">
			<span className="text-xs font-medium text-muted-foreground">
				{field.label}
			</span>
			{canEdit ? (
				<def.EditComponent
					{...sharedProps}
					onChange={(v) => onChange(field.fieldId, v)}
				/>
			) : (
				<def.ReadComponent {...sharedProps} />
			)}
		</div>
	);
}
