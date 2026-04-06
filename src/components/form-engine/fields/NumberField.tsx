import { Input } from "@/components/ui/input";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function NumberField({
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
			<span className="text-sm text-foreground">
				{field.value != null ? String(field.value) : "—"}
			</span>
		);
	}

	return (
		<Input
			{...field}
			type="number"
			value={field.value ?? ""}
			onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
				field.onChange(
					Number.isNaN(e.target.valueAsNumber) ? "" : e.target.valueAsNumber,
				)
			}
			placeholder={descriptor.placeholder}
			readOnly={descriptor.readOnly}
			aria-invalid={!!fieldState.error}
			className="h-7"
		/>
	);
}
