import { Separator } from "@/components/ui/separator";
import type { PanelSection } from "@/types/config";

type AttributeListProps = {
	sections: PanelSection[];
	data: Record<string, unknown>;
};

export function AttributeList({ sections, data }: AttributeListProps) {
	return (
		<div className="space-y-4">
			{sections.map((section, idx) => (
				<div key={section.label}>
					{idx > 0 && <Separator className="mb-4" />}
					<h4 className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
						{section.label}
					</h4>
					<dl className="space-y-2">
						{section.fields.map((field) => {
							const value = data[field];
							return (
								<div
									key={field}
									className="flex items-start justify-between gap-4"
								>
									<dt className="text-xs text-muted-foreground shrink-0">
										{field}
									</dt>
									<dd className="text-xs font-medium text-right truncate max-w-[200px]">
										{value != null ? String(value) : "—"}
									</dd>
								</div>
							);
						})}
					</dl>
				</div>
			))}
		</div>
	);
}
