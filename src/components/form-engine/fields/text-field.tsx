// src/components/form-engine/fields/text-field.tsx
import { Input } from "@/components/ui/input";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function TextFieldRead({ value }: FieldReadProps) {
	return (
		<span className="text-sm text-foreground">{String(value ?? "—")}</span>
	);
}

export function TextFieldEdit({ value, onChange, disabled }: FieldEditProps) {
	return (
		<Input
			value={String(value ?? "")}
			onChange={(e) => onChange(e.target.value)}
			disabled={disabled}
			className="h-7 text-sm"
		/>
	);
}
