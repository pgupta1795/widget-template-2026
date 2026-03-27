// src/components/form-engine/fields/link-field.tsx
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function LinkFieldRead({ value, linkUrl }: FieldReadProps) {
	if (!value) return <span className="text-sm text-muted-foreground">—</span>;
	const href = linkUrl ?? String(value);
	return (
		<a
			href={href}
			target="_blank"
			rel="noopener noreferrer"
			className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline"
		>
			{String(value)}
			<ExternalLink size={12} />
		</a>
	);
}

export function LinkFieldEdit({ value, onChange, disabled }: FieldEditProps) {
	return (
		<Input
			value={String(value ?? "")}
			onChange={(e) => onChange(e.target.value)}
			disabled={disabled}
			className="h-7 text-sm"
		/>
	);
}
