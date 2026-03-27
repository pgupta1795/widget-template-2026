// src/components/form-engine/components/form-section-renderer.tsx
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { FormFieldRenderer } from "./form-field-renderer";
import type { FormSectionData } from "../types/form.types";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

interface FormSectionRendererProps {
	section: FormSectionData;
	isEditing: boolean;
	onChange: (fieldId: string, value: JsonPrimitive) => void;
}

export function FormSectionRenderer({
	section,
	isEditing,
	onChange,
}: FormSectionRendererProps) {
	const [isCollapsed, setIsCollapsed] = useState(section.defaultCollapsed);

	const gridCols =
		section.layout === "grid"
			? `grid-cols-${Math.min(section.columns ?? 2, 4)}`
			: section.layout === "horizontal"
				? "grid-cols-2"
				: "grid-cols-1";

	return (
		<div className="flex flex-col gap-2">
			<div className="flex items-center gap-2">
				{section.collapsible && (
					<button
						type="button"
						onClick={() => setIsCollapsed((p) => !p)}
						className="text-muted-foreground hover:text-foreground transition-colors"
					>
						{isCollapsed ? (
							<ChevronRight size={14} />
						) : (
							<ChevronDown size={14} />
						)}
					</button>
				)}
				<span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
					{section.label}
				</span>
				<Separator className="flex-1" />
			</div>

			{!isCollapsed && (
				<div className={cn("grid gap-3", gridCols)}>
					{section.fields.map((field) => (
						<FormFieldRenderer
							key={field.fieldId}
							field={field}
							isEditing={isEditing}
							onChange={onChange}
						/>
					))}
				</div>
			)}
		</div>
	);
}
