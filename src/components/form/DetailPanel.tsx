import { cn } from "@/lib/utils";
import type { FormConfig } from "@/types";
import { FormSection } from "./FormSection";

interface DetailPanelProps {
	config: FormConfig;
	data: Record<string, unknown> | null;
	isOpen: boolean;
	onClose?: () => void;
	className?: string;
}

/**
 * DetailPanel renders a collapsible right-side panel showing full object details
 * as vertical label-value pairs. Matches the 3DExperience object detail panel.
 */
export function DetailPanel({
	config,
	data,
	isOpen,
	onClose,
	className,
}: DetailPanelProps) {
	if (!isOpen) return null;

	const objectTitle = data
		? ((data.title ?? data.name ?? config.title ?? "") as string)
		: "";
	const objectType = data ? ((data.type ?? "") as string) : "";
	const objectOwner = data ? ((data.owner ?? "") as string) : "";
	const objectDate = data ? ((data.modified ?? data.created ?? "") as string) : "";

	return (
		<div
			className={cn(
				"flex h-full flex-col border-l border-border bg-card",
				className,
			)}
		>
			{/* Panel header */}
			<div className="flex shrink-0 items-start gap-3 border-b border-border p-3">
				{/* Object icon placeholder */}
				<div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-primary/10 text-xl font-bold text-primary">
					{objectType ? objectType.slice(0, 2).toUpperCase() : "OB"}
				</div>

				<div className="min-w-0 flex-1">
					<h3 className="text-sm font-semibold text-foreground">{objectTitle}</h3>
					<p className="text-xs text-muted-foreground">
						{objectOwner}
						{objectDate && (
							<span className="ml-1">{objectDate}</span>
						)}
					</p>
				</div>

				{/* Close button */}
				<button
					type="button"
					onClick={onClose}
					className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
					aria-label="Close panel"
				>
					<svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
						<path d="M4 4l8 8M12 4l-8 8" />
					</svg>
				</button>
			</div>

			{/* Panel toolbar */}
			{config.toolbar && (
				<div className="flex shrink-0 items-center gap-1 border-b border-border px-3 py-1.5">
					{config.toolbar.actions.map((action) => (
						<button
							key={action.id}
							type="button"
							className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							title={action.label}
						>
							<span className="text-xs">{action.icon ?? action.label.charAt(0)}</span>
						</button>
					))}
				</div>
			)}

			{/* Panel content - scrollable */}
			<div className="min-h-0 flex-1 overflow-y-auto p-3">
				{!data ? (
					<div className="space-y-3">
						{Array.from({ length: 8 }).map((_, i) => (
							<div key={`skeleton-${i}`} className="animate-pulse">
								<div className="mb-1 h-3 w-20 rounded bg-muted" />
								<div className="h-3 w-32 rounded bg-muted" />
							</div>
						))}
					</div>
				) : (
					<div className="flex flex-col gap-3">
						{config.sections.map((section) => (
							<FormSection key={section.id} section={section} data={data} />
						))}
					</div>
				)}
			</div>
		</div>
	);
}
