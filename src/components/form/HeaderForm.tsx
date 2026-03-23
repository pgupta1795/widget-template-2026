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
			<div className={cn("animate-pulse rounded border border-border bg-card p-4", className)}>
				<div className="h-4 w-48 rounded bg-muted" />
				<div className="mt-2 flex gap-4">
					<div className="h-3 w-24 rounded bg-muted" />
					<div className="h-3 w-32 rounded bg-muted" />
					<div className="h-3 w-20 rounded bg-muted" />
				</div>
			</div>
		);
	}

	const objectIcon = data.icon as string | undefined;
	const objectTitle = (data.title ?? data.name ?? config.title ?? "") as string;

	return (
		<div
			className={cn(
				"flex shrink-0 items-start gap-3 border-b border-border bg-card px-4 py-3",
				className,
			)}
		>
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
					{config.sections.map((section) => (
						<FormSection key={section.id} section={section} data={data} />
					))}
				</div>
			</div>
		</div>
	);
}
