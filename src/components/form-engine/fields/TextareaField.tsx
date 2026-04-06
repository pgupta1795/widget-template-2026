import { Textarea } from "@/components/ui/textarea";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function TextareaField({
	descriptor,
	control,
	isEditing,
}: FieldRendererProps) {
	const { field, fieldState } = useController({
		name: descriptor.name,
		control,
	});

	if (!isEditing) {
		return (
			<span className="text-sm text-foreground whitespace-pre-wrap">
				{field.value ?? "—"}
			</span>
		);
	}

	return (
		<Textarea
			{...field}
			value={field.value ?? ""}
			placeholder={descriptor.placeholder}
			readOnly={descriptor.readOnly}
			aria-invalid={!!fieldState.error}
			rows={3}
		/>
	);
}
