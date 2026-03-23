import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { FormConfig } from "@/types";
import { FormSection } from "./FormSection";

interface HeaderFormProps {
	config: FormConfig;
	data: Record<string, unknown> | null;
	className?: string;
}

/**
 * HeaderForm renders a compact, read-mostly display at the top of a view.
 * Shows object metadata: icon, title, state badge, owner, key-value pairs.
 * Matches the 3DExperience CHG-01 header layout.
 */
export function HeaderForm({ config, data, className }: HeaderFormProps) {
	if (!data) {
		return (
			<Card size="sm" className={cn("animate-pulse", className)}>
				<CardContent>
					<div className="h-4 w-48 rounded bg-muted" />
					<div className="mt-2 flex gap-4">
						<div className="h-3 w-24 rounded bg-muted" />
						<div className="h-3 w-32 rounded bg-muted" />
						<div className="h-3 w-20 rounded bg-muted" />
					</div>
				</CardContent>
			</Card>
		);
	}

	const objectIcon = data.icon as string | undefined;
	const objectTitle = (data.title ?? data.name ?? config.title ?? "") as string;

	return (
		<Card
			size="sm"
			className={cn("shrink-0 rounded-none border-x-0 border-t-0", className)}
		>
			<CardContent className="flex items-start gap-3">
				{/* Object icon */}
				{objectIcon && (
					<div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-border bg-primary/10 text-lg font-bold text-primary">
						{objectIcon.startsWith("http") ? (
							<img src={objectIcon} alt="" className="h-full w-full rounded object-cover" />
						) : (
							objectIcon
						)}
					</div>
				)}

				{/* Title + sections */}
				<div className="min-w-0 flex-1">
					{objectTitle && (
						<h2 className="mb-1 text-sm font-semibold text-foreground">{objectTitle}</h2>
					)}
					<div className="flex flex-wrap items-start gap-x-6 gap-y-1">
						{config.sections.map((section, index) => (
							<div key={section.id} className="flex items-start gap-x-6">
								{index > 0 && (
									<Separator orientation="vertical" className="mx-0 h-6 self-center" />
								)}
								<FormSection section={section} data={data} />
							</div>
						))}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}
