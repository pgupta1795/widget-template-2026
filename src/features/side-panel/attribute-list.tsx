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
					<h4 className="mb-2 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
						{section.label}
					</h4>
					<dl className="space-y-0.5">
						{section.fields.map((field) => {
							const value = data[field];
							return (
								<div
									key={field}
									className="group flex items-start justify-between gap-3 rounded-sm px-1 py-1 transition-colors hover:bg-muted/40"
								>
									<dt className="shrink-0 text-[0.6875rem] text-muted-foreground">
										{field}
									</dt>
									<div className="flex items-center gap-1">
										<dd className="max-w-[200px] truncate text-right text-[0.6875rem] font-medium text-foreground">
											{value != null ? String(value) : "-"}
										</dd>
										<Pencil className="size-3 shrink-0 cursor-pointer text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
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
