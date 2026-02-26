import { Pencil } from "lucide-react";
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
					<dl className="space-y-0.5">
						{section.fields.map((field) => {
							const value = data[field];
							return (
								<div
									key={field}
									className="group flex items-start justify-between gap-4 rounded px-1 py-1 hover:bg-muted/50 transition-colors"
								>
									<dt className="text-xs text-muted-foreground shrink-0">
										{field}
									</dt>
									<div className="flex items-center gap-1">
										<dd className="text-xs font-medium text-foreground text-right truncate max-w-[200px]">
											{value != null ? String(value) : "—"}
										</dd>
										<Pencil className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0" />
									</div>
								</div>
							);
						})}
					</dl>
				</div>
			))}
		</div>
	);
}
