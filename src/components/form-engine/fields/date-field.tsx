// src/components/form-engine/fields/date-field.tsx
import { Input } from "@/components/ui/input";
import { format, parseISO, isValid } from "date-fns";
import type { FieldEditProps, FieldReadProps } from "./field-props";

function formatDate(value: unknown): string {
	if (!value) return "—";
	try {
		const d = parseISO(String(value));
		return isValid(d) ? format(d, "MMM d, yyyy") : String(value);
	} catch {
		return String(value);
	}
}

export function DateFieldRead({ value }: FieldReadProps) {
	return <span className="text-sm text-foreground">{formatDate(value)}</span>;
}

export function DateFieldEdit({ value, onChange, disabled }: FieldEditProps) {
	return (
		<Input
			type="date"
			value={value ? String(value).slice(0, 10) : ""} // value expected in ISO 8601 format
			onChange={(e) => onChange(e.target.value || null)}
			disabled={disabled}
			className="h-7 text-sm"
		/>
	);
}
