import { cn } from "@/lib/utils";
import type { FormSectionConfig } from "@/types";
import { useState } from "react";
import { FormField } from "./FormField";

interface FormSectionProps {
	section: FormSectionConfig;
	data: unknown;
}

export function FormSection({ section, data }: FormSectionProps) {
	const [collapsed, setCollapsed] = useState(false);

	const layoutClass = (() => {
		switch (section.layout) {
			case "horizontal":
				return "flex flex-wrap items-center gap-x-4 gap-y-1";
			case "grid":
				return cn(
					"grid gap-x-4 gap-y-2",
					section.columns
						? `grid-cols-${section.columns}`
						: "grid-cols-2",
				);
			case "vertical":
			default:
				return "flex flex-col gap-2";
		}
	})();

	// Handle dynamic grid columns that Tailwind can't JIT
	const gridStyle: React.CSSProperties =
		section.layout === "grid" && section.columns
			? { gridTemplateColumns: `repeat(${section.columns}, minmax(0, 1fr))` }
			: {};

	return (
		<div className="flex flex-col">
			{section.label && (
				<button
					type="button"
					onClick={() => section.collapsible && setCollapsed(!collapsed)}
					className={cn(
						"mb-1 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground",
						section.collapsible && "cursor-pointer hover:text-foreground",
					)}
				>
					{section.collapsible && (
						<svg
							className={cn(
								"h-3 w-3 transition-transform",
								collapsed && "-rotate-90",
							)}
							viewBox="0 0 12 12"
							fill="currentColor"
						>
							<path d="M3 4.5l3 3 3-3" />
						</svg>
					)}
					{section.label}
				</button>
			)}
			{!collapsed && (
				<div className={layoutClass} style={gridStyle}>
					{section.fields.map((field) => {
						if (typeof field.visible === "boolean" && !field.visible) return null;
						return (
							<FormField
								key={field.id}
								field={field}
								value={data}
								layout={section.layout}
							/>
						);
					})}
				</div>
			)}
		</div>
	);
}
