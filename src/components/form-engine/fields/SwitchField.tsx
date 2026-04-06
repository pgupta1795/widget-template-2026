import { Switch } from "@/components/ui/switch";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function SwitchField({
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
		<Switch
			checked={!!field.value}
			onCheckedChange={field.onChange}
			disabled={descriptor.readOnly}
		/>
	);
}
