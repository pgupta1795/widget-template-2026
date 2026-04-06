import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

function normalizeOptions(
	options?: string[] | { label: string; value: string }[],
): { label: string; value: string }[] {
	if (!options) return [];
	return options.map((o) =>
		typeof o === "string" ? { label: o, value: o } : o,
	);
}

export function SelectField({
	descriptor,
	control,
	isEditing,
}: FieldRendererProps) {
	const { field } = useController({
		name: descriptor.name,
		control,
	});

	const opts = normalizeOptions(descriptor.options);

	if (!isEditing) {
		const selected = opts.find((o) => o.value === field.value);
		return (
			<span className="text-sm text-foreground">
				{selected?.label ?? field.value ?? "—"}
			</span>
		);
	}

	return (
		<Select
			value={field.value ?? ""}
			onValueChange={field.onChange}
			disabled={descriptor.readOnly}
		>
			<SelectTrigger className="w-full">
				<SelectValue placeholder={descriptor.placeholder ?? "Select..."} />
			</SelectTrigger>
			<SelectContent>
				{opts.map((opt) => (
					<SelectItem key={opt.value} value={opt.value}>
						{opt.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
