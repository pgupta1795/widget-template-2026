// src/components/form-engine/fields/number-field.tsx
import { Input } from "@/components/ui/input";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function NumberFieldRead({ value }: FieldReadProps) {
	return (
		<span className="text-sm text-foreground tabular-nums">
			{value !== null && value !== undefined ? String(value) : "—"}
		</span>
	);
}

export function NumberFieldEdit({ value, onChange, disabled }: FieldEditProps) {
	return (
		<Input
			type="number"
			value={value !== null && value !== undefined ? String(value) : ""}
			onChange={(e) => {
				const n = Number(e.target.value);
				onChange(e.target.value === "" || Number.isNaN(n) ? null : n);
			}}
			disabled={disabled}
			className="h-7 text-sm"
		/>
	);
}
