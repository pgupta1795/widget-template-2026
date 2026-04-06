import { Input } from "@/components/ui/input";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function TextField({
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
			<span className="text-sm text-foreground">{field.value ?? "—"}</span>
		);
	}

	return (
		<Input
			{...field}
			value={field.value ?? ""}
			placeholder={descriptor.placeholder}
			readOnly={descriptor.readOnly}
			aria-invalid={!!fieldState.error}
			className="h-7"
		/>
	);
}
