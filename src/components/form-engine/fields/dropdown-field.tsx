// src/components/form-engine/fields/dropdown-field.tsx
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function DropdownFieldRead({
	value,
	options,
}: FieldReadProps & Pick<FieldEditProps, "options">) {
	const label =
		options?.find((o) => o.value === value)?.label ?? String(value ?? "—");
	return <span className="text-sm text-foreground">{label}</span>;
}

export function DropdownFieldEdit({
	value,
	onChange,
	options,
	disabled,
}: FieldEditProps) {
	return (
		<Select
			value={String(value ?? "")}
			onValueChange={onChange}
			disabled={disabled}
		>
			<SelectTrigger className="h-7 text-sm">
				<SelectValue placeholder="Select…" />
			</SelectTrigger>
			<SelectContent>
				{(options ?? []).map((opt) => (
					<SelectItem key={String(opt.value)} value={String(opt.value)}>
						{opt.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}
