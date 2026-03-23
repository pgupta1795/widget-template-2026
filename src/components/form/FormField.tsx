import { Badge } from "@/components/ui/badge";
import { Field, FieldContent, FieldLabel } from "@/components/ui/field";
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

/**
 * Maps badge color configs to shadcn Badge variants based on color semantics.
 */
function getBadgeVariant(
	colors?: { bg: string; text: string; border?: string },
): "info" | "success" | "warning" | "destructive" | null {
	if (!colors) return null;
	const bg = colors.bg.toLowerCase();
	// Blues → info
	if (bg.includes("#dbeafe") || bg.includes("#eff6ff") || bg.includes("#bfdbfe") || bg.includes("blue")) return "info";
	// Greens → success
	if (bg.includes("#dcfce7") || bg.includes("#d1fae5") || bg.includes("#bbf7d0") || bg.includes("green")) return "success";
	// Yellows/Ambers → warning
	if (bg.includes("#fef3c7") || bg.includes("#fef9c3") || bg.includes("#fde68a") || bg.includes("yellow") || bg.includes("amber")) return "warning";
	// Reds → destructive
	if (bg.includes("#fee2e2") || bg.includes("#fecaca") || bg.includes("#fca5a5") || bg.includes("red")) return "destructive";
	return null;
}

function BadgeField({
	value,
	config,
}: { value: string; config?: FormFieldConfig["badgeConfig"] }) {
	const colorMap = config?.colorMap ?? {};
	const colors = colorMap[value];
	const variant = getBadgeVariant(colors);

	if (variant) {
		return <Badge variant={variant}>{value}</Badge>;
	}

	if (colors) {
		// Fallback for custom colors not matching a known variant
		return (
			<Badge
				variant="secondary"
				style={{
					backgroundColor: colors.bg,
					color: colors.text,
					borderColor: colors.border,
				}}
			>
				{value}
			</Badge>
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

	if (!isHorizontal) {
		return (
			<Field
				orientation="vertical"
				style={field.width ? { width: field.width } : undefined}
			>
				<FieldLabel className="text-xs text-muted-foreground">
					{field.label}
				</FieldLabel>
				<FieldContent>{renderValue()}</FieldContent>
			</Field>
		);
	}

	return (
		<div
			className="flex flex-row items-center gap-1"
			style={field.width ? { width: field.width } : undefined}
		>
			<span className="shrink-0 text-xs text-muted-foreground after:content-[':']">
				{field.label}
			</span>
			<span className="min-w-0">{renderValue()}</span>
		</div>
	);
}
