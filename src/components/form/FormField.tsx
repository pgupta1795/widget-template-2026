import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FormFieldConfig } from "@/types";

interface FormFieldProps {
	field: FormFieldConfig;
	value: unknown;
	layout: "horizontal" | "vertical" | "grid";
}

function getNestedValue(obj: unknown, path: string): unknown {
	if (!obj || typeof obj !== "object") return undefined;
	return path.split(".").reduce<unknown>((acc, key) => {
		if (acc && typeof acc === "object" && key in (acc as Record<string, unknown>)) {
			return (acc as Record<string, unknown>)[key];
		}
		return undefined;
	}, obj);
}

function BadgeField({
	value,
	config,
}: { value: string; config?: FormFieldConfig["badgeConfig"] }) {
	const colorMap = config?.colorMap ?? {};
	const colors = colorMap[value];
	if (colors) {
		return (
			<span
				className="inline-flex items-center rounded px-2 py-0.5 text-[11px] font-semibold"
				style={{
					backgroundColor: colors.bg,
					color: colors.text,
					border: colors.border ? `1px solid ${colors.border}` : undefined,
				}}
			>
				{value}
			</span>
		);
	}
	return <Badge variant="secondary">{value}</Badge>;
}

function LinkField({
	value,
	config,
}: { value: string; config?: FormFieldConfig["linkConfig"] }) {
	return (
		<a
			href={config?.urlTemplate?.replace("{{value}}", encodeURIComponent(value)) ?? "#"}
			target={config?.target ?? "_self"}
			className="enterprise-link text-xs"
		>
			{value}
		</a>
	);
}

function BooleanField({ value }: { value: unknown }) {
	const boolVal = value === true || value === "Yes" || value === "true";
	return <span className="text-xs text-foreground">{boolVal ? "Yes" : "No"}</span>;
}

function DateField({ value }: { value: unknown }) {
	if (!value) return <span className="text-xs text-muted-foreground">—</span>;
	const str = String(value);
	try {
		const date = new Date(str);
		return (
			<span className="text-xs text-foreground">
				{date.toLocaleDateString("en-US", {
					year: "numeric",
					month: "short",
					day: "numeric",
				})}
			</span>
		);
	} catch {
		return <span className="text-xs text-foreground">{str}</span>;
	}
}

function ImageField({ value }: { value: unknown }) {
	if (!value) return null;
	return (
		<img
			src={String(value)}
			alt=""
			className="h-10 w-10 rounded border border-border object-cover"
		/>
	);
}

export function FormField({ field, value: rawData, layout }: FormFieldProps) {
	const value = getNestedValue(rawData, field.attribute) ?? rawData;
	const displayValue = value == null || value === "" ? undefined : value;

	const isHorizontal = layout === "horizontal";

	const renderValue = () => {
		if (displayValue === undefined) {
			return <span className="text-xs text-muted-foreground">—</span>;
		}

		switch (field.type) {
			case "badge":
			case "state":
				return (
					<BadgeField value={String(displayValue)} config={field.badgeConfig} />
				);
			case "link":
				return (
					<LinkField value={String(displayValue)} config={field.linkConfig} />
				);
			case "boolean":
				return <BooleanField value={displayValue} />;
			case "date":
				return <DateField value={displayValue} />;
			case "image":
				return <ImageField value={displayValue} />;
			case "number":
				return (
					<span className="text-xs tabular-nums text-foreground">
						{String(displayValue)}
					</span>
				);
			case "dropdown":
				return <span className="text-xs text-foreground">{String(displayValue)}</span>;
			case "richtext":
				return (
					<span className="text-xs text-foreground">{String(displayValue)}</span>
				);
			default:
				return <span className="text-xs text-foreground">{String(displayValue)}</span>;
		}
	};

	return (
		<div
			className={cn(
				"flex gap-1",
				isHorizontal ? "flex-row items-center" : "flex-col",
			)}
			style={field.width ? { width: field.width } : undefined}
		>
			<span
				className={cn(
					"shrink-0 text-xs text-muted-foreground",
					isHorizontal && "after:content-[':']",
				)}
			>
				{field.label}
			</span>
			<span className="min-w-0">{renderValue()}</span>
		</div>
	);
}
