import { useQuery } from "@tanstack/react-query";
import { HelpCircle, RefreshCw, Search, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_ICONS } from "@/config/endpoints/zone-query";
import { cn } from "@/lib/utils";
import { createQueryOptions } from "@/services/query-factory";
import type { BadgeVariantMap, ObjectHeaderConfig } from "@/types/config";

type ObjectHeaderProps = {
	config: ObjectHeaderConfig;
	objectId: string;
	widgetTitle?: string;
	className?: string;
};

function getStateBadgeVariant(state: string, variants?: BadgeVariantMap) {
	if (variants?.[state]) return variants[state];
	const lower = state.toLowerCase();
	if (lower === "released" || lower === "complete") return "success" as const;
	if (lower === "in work" || lower === "active") return "info" as const;
	if (lower === "obsolete") return "destructive" as const;
	return "secondary" as const;
}

export function ObjectHeader({
	config,
	objectId,
	widgetTitle,
	className,
}: ObjectHeaderProps) {
	const { data, isLoading } = useQuery(
		createQueryOptions(config.endpoint, { objectId }, { single: true }),
	);

	if (isLoading) {
		return (
			<div
				className={cn(
					"border-b border-border bg-card px-4 pt-3 pb-3",
					className,
				)}
			>
				<div className="mb-2 flex gap-1">
					<Skeleton className="h-3 w-8" />
					<Skeleton className="h-3 w-4" />
					<Skeleton className="h-3 w-20" />
					<Skeleton className="h-3 w-4" />
					<Skeleton className="h-3 w-28" />
				</div>
				<div className="flex gap-3">
					<Skeleton className="size-12 rounded-md" />
					<div className="flex-1 space-y-2">
						<Skeleton className="h-4 w-48" />
						<div className="flex gap-4 pt-1">
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-3 w-24" />
							<Skeleton className="h-3 w-24" />
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!data || Array.isArray(data)) return null;

	const record = data as Record<string, unknown>;
	const objectType = record.type as string;
	const iconUrl = config.iconField
		? (record[config.iconField] as string)
		: DEFAULT_ICONS[objectType];
	const title = record[config.titleField] as string;
	const state = config.stateField
		? (record[config.stateField] as string)
		: undefined;

	return (
		<div className={cn("border-b border-border bg-card", className)}>
			{/* Breadcrumbs */}
			<div className="flex items-center gap-1.5 px-4 pt-3 text-xs text-muted-foreground">
				<span className="cursor-pointer hover:text-foreground transition-colors">
					Home
				</span>
				<span>/</span>
				<span className="cursor-pointer hover:text-foreground transition-colors">
					{widgetTitle ?? "Widget"}
				</span>
				<span>/</span>
				<span className="text-foreground">{title}</span>
			</div>

			{/* Title row */}
			<div className="flex items-start gap-3 px-4 pt-2 pb-3">
				{iconUrl && (
					<div className="flex size-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted/50">
						<img
							src={iconUrl}
							alt={objectType}
							className="size-8 object-contain"
						/>
					</div>
				)}

				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<h1 className="text-sm font-semibold text-foreground truncate">
							{title}
						</h1>
						{state && (
							<Badge
								variant={getStateBadgeVariant(state, config.stateBadgeVariants)}
							>
								{state}
							</Badge>
						)}
					</div>

					{/* Metadata row */}
					<div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
						{config.fields.map((field) => {
							const value = record[field.key];
							if (value == null || value === "") return null;

							return (
								<div
									key={field.key}
									className="flex items-center gap-1 text-xs"
								>
									<span className="text-muted-foreground">{field.label}:</span>
									{field.type === "badge" ? (
										<Badge variant="outline" className="text-[0.625rem]">
											{String(value)}
										</Badge>
									) : field.type === "link" ? (
										<span className="text-primary cursor-pointer hover:underline">
											{String(value)}
										</span>
									) : field.type === "boolean" ? (
										<span
											className={
												value === "Yes" || value === true
													? "text-green-600"
													: "text-muted-foreground"
											}
										>
											{String(value)}
										</span>
									) : (
										<span className="font-medium">{String(value)}</span>
									)}
								</div>
							);
						})}
					</div>
				</div>

				{/* Right-side action icons */}
				<div className="flex items-center gap-1 shrink-0">
					<button
						type="button"
						aria-label="Search"
						className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
					>
						<Search className="size-4" />
					</button>
					<button
						type="button"
						aria-label="Refresh"
						className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
					>
						<RefreshCw className="size-4" />
					</button>
					<button
						type="button"
						aria-label="Settings"
						className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
					>
						<Settings className="size-4" />
					</button>
					<button
						type="button"
						aria-label="Help"
						className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
					>
						<HelpCircle className="size-4" />
					</button>
				</div>
			</div>
		</div>
	);
}
