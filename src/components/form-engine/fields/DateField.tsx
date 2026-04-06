import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function DateField({
	descriptor,
	control,
	isEditing,
}: FieldRendererProps) {
	const { field, fieldState } = useController({
		name: descriptor.name,
		control,
	});

	if (!isEditing) {
		const display = field.value
			? format(new Date(field.value as string), "MMM d, yyyy")
			: "—";
		return <span className="text-sm text-foreground">{display}</span>;
	}

	return (
		<Input
			{...field}
			type="date"
			value={field.value ?? ""}
			placeholder={descriptor.placeholder}
			readOnly={descriptor.readOnly}
			aria-invalid={!!fieldState.error}
			className="h-7"
		/>
	);
}
