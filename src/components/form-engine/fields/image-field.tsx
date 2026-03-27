// src/components/form-engine/fields/image-field.tsx
// Image fields are always read-only (thumbnail/avatar).
// EditComponent is a no-op that renders the same read view.
import { ImageIcon } from "lucide-react";
import type { FieldEditProps, FieldReadProps } from "./field-props";

let _warnedReadOnly = false;

export function ImageFieldRead({ value, label }: FieldReadProps) {
	if (!value) {
		return (
			<div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
				<ImageIcon size={16} className="text-muted-foreground" />
			</div>
		);
	}
	return (
		<img
			src={String(value)}
			alt={label || "field image"}
			className="h-10 w-10 rounded-md object-cover"
		/>
	);
}

// Read-only in edit mode — no upload support in Phase 1
export function ImageFieldEdit(props: FieldEditProps) {
	if (process.env.NODE_ENV === "development" && !_warnedReadOnly) {
		_warnedReadOnly = true;
		console.warn(
			"[FormEngine] image field type is read-only; editable:true has no effect.",
		);
	}
	return <ImageFieldRead {...props} />;
}
