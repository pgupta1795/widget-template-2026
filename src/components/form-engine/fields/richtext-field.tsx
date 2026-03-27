// src/components/form-engine/fields/richtext-field.tsx
// Phase 1: richtext renders with Textarea in edit mode.
// The type name is kept as "richtext" to avoid a breaking rename when a
// rich text editor (e.g. tiptap) is added in a future phase.
import { Textarea } from "@/components/ui/textarea";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function RichtextFieldRead({ value }: FieldReadProps) {
	if (!value) return <span className="text-sm text-muted-foreground">—</span>;
	// Render as preformatted text in Phase 1 (no HTML rendering)
	return (
		<p className="whitespace-pre-wrap text-sm text-foreground">
			{String(value)}
		</p>
	);
}

export function RichtextFieldEdit({
	value,
	onChange,
	disabled,
}: FieldEditProps) {
	return (
		<Textarea
			value={String(value ?? "")}
			onChange={(e) => onChange(e.target.value)}
			disabled={disabled}
			rows={4}
			className="text-sm resize-none"
		/>
	);
}
