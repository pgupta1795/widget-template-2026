// src/components/form-engine/fields/boolean-field.tsx
import { Switch } from "@/components/ui/switch";
import { Check, X } from "lucide-react";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function BooleanFieldRead({ value }: FieldReadProps) {
	return value ? (
		<span className="inline-flex items-center gap-1 text-sm text-green-600">
			<Check size={14} /> Yes
		</span>
	) : (
		<span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
			<X size={14} /> No
		</span>
	);
}

export function BooleanFieldEdit({
	value,
	onChange,
	disabled,
}: FieldEditProps) {
	return (
		<Switch
			checked={Boolean(value)}
			onCheckedChange={onChange}
			disabled={disabled}
		/>
	);
}
