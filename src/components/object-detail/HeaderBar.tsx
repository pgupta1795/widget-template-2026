import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { icons, type LucideIcon } from "lucide-react";
import type { VariantProps } from "class-variance-authority";
import type { badgeVariants } from "@/components/ui/badge";
import type { HeaderField } from "./types";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

interface HeaderBarProps {
	icon?: string;
	title: string;
	badgeValue?: string;
	subtitleFields?: HeaderField[];
	data: Record<string, unknown>;
	className?: string;
}

function getIcon(name?: string): LucideIcon | null {
	if (!name) return null;
	return (icons as Record<string, LucideIcon>)[name] ?? null;
}

function getStateBadgeVariant(state?: string): BadgeVariant {
	if (!state) return "secondary";
	const s = state.toLowerCase();
	if (
		s.includes("prepare") ||
		s.includes("progress") ||
		s.includes("active") ||
		s.includes("open")
	)
		return "info";
	if (
		s.includes("complet") ||
		s.includes("done") ||
		s.includes("closed") ||
		s.includes("approved")
	)
		return "success";
	if (s.includes("cancel") || s.includes("reject") || s.includes("fail"))
		return "destructive";
	if (s.includes("review") || s.includes("pending") || s.includes("wait"))
		return "warning";
	return "secondary";
}

export function HeaderBar({
	icon,
	title,
	badgeValue,
	subtitleFields = [],
	data,
	className,
}: HeaderBarProps) {
	const IconComponent = getIcon(icon);

	return (
		<div className={cn("border-b bg-card shadow-sm", className)}>
			{/* Primary row: icon + title + badge */}
			<div className="flex items-center gap-3 px-4 pt-3 pb-2">
				{IconComponent && (
					<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
						<IconComponent className="size-4.5 text-primary" />
					</div>
				)}
				<div className="flex items-center gap-2.5 min-w-0">
					<h1 className="text-base font-bold leading-tight tracking-tight truncate">
						{title}
					</h1>
					{badgeValue && (
						<Badge
							variant={getStateBadgeVariant(badgeValue)}
							className="shrink-0 text-[0.65rem] font-semibold uppercase tracking-wide"
						>
							{badgeValue}
						</Badge>
					)}
				</div>
			</div>

			{/* Metadata row */}
			{subtitleFields.length > 0 && (
				<div className="flex flex-wrap items-center gap-x-0 gap-y-0 border-t border-border/40 px-4 py-1.5">
					{subtitleFields.map((sf, i) => {
						const value = data[sf.field];
						const displayValue = value != null ? String(value) : "—";

						return (
							<div key={sf.field} className="flex items-center text-xs">
								{i > 0 && (
									<span className="mx-3 text-border/80 select-none">·</span>
								)}
								<span className="text-muted-foreground/70 font-medium">
									{sf.label}:
								</span>
								<span className="ml-1">
									{sf.type === "badge" ? (
										<Badge variant="outline" className="text-[0.6rem] h-4">
											{displayValue}
										</Badge>
									) : sf.type === "link" ? (
										<span className="text-primary cursor-pointer hover:underline font-medium transition-colors">
											{displayValue}
										</span>
									) : (
										<span className="text-foreground/80">{displayValue}</span>
									)}
								</span>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
}
