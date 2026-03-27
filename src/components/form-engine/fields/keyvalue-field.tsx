// src/components/form-engine/fields/keyvalue-field.tsx
// Keyvalue is always read-only — renders a list of label: value pairs.
// value is expected to be a JSON string of Record<string, string>.
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function KeyvalueFieldRead({ value }: FieldReadProps) {
	let pairs: Array<[string, unknown]> = [];
	try {
		const parsed = typeof value === "string" ? JSON.parse(value) : {};
		if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
			pairs = Object.entries(parsed);
		}
	} catch {
		pairs = [];
	}

	if (pairs.length === 0) {
		return <span className="text-sm text-muted-foreground">—</span>;
	}

	return (
		<dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
			{pairs.map(([label, val]) => (
				<div key={label} className="contents">
					<dt className="text-muted-foreground">{label}</dt>
					<dd className="text-foreground">{String(val ?? "—")}</dd>
				</div>
			))}
		</dl>
	);
}

export function KeyvalueFieldEdit(props: FieldEditProps) {
	return <KeyvalueFieldRead {...props} />;
}
