import { Checkbox } from "@/components/ui/checkbox";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function CheckboxField({
	descriptor,
	control,
	isEditing,
}: FieldRendererProps) {
	const { field } = useController({
		name: descriptor.name,
		control,
	});

	if (!isEditing) {
		return (
			<span className="text-sm text-foreground">
				{field.value == null ? "—" : field.value ? "Yes" : "No"}
			</span>
		);
	}

	return (
		<Checkbox
			checked={!!field.value}
			onCheckedChange={field.onChange}
			disabled={descriptor.readOnly}
		/>
	);
}
