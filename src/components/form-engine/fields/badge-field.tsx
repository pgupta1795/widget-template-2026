// src/components/form-engine/fields/badge-field.tsx
import { cn } from "@/lib/utils";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getBadgeClasses } from "./badge-colors";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function BadgeFieldRead({ value, badgeColorMap }: FieldReadProps) {
	if (!value) return <span className="text-sm text-muted-foreground">—</span>;
	return (
		<span
			className={cn(
				"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
				getBadgeClasses(badgeColorMap, String(value)),
			)}
		>
			{String(value)}
		</span>
	);
}

export function BadgeFieldEdit({
	value,
	onChange,
	options,
	badgeColorMap,
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
				{(options ?? []).map((opt) => {
					const cls = cn(
						"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
						getBadgeClasses(badgeColorMap, String(opt.value)),
					);
					return (
						<SelectItem key={String(opt.value)} value={String(opt.value)}>
							<span className={cls}>{opt.label}</span>
						</SelectItem>
					);
				})}
			</SelectContent>
		</Select>
	);
}
