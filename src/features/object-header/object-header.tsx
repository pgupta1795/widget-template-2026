import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DEFAULT_ICONS } from "@/config/endpoints/zone-query";
import { cn } from "@/lib/utils";
import { createQueryOptions } from "@/services/query-factory";
import type { BadgeVariantMap, ObjectHeaderConfig } from "@/types/config";

type ObjectHeaderProps = {
	config: ObjectHeaderConfig;
	objectId: string;
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
	className,
}: ObjectHeaderProps) {
	const { data, isLoading } = useQuery(
		createQueryOptions(config.endpoint, { objectId }, { single: true }),
	);

	if (isLoading) {
		return (
			<div className={cn("flex gap-4 p-4", className)}>
				<Skeleton className="size-16 rounded-lg" />
				<div className="flex-1 space-y-2">
					<Skeleton className="h-5 w-48" />
					<Skeleton className="h-4 w-32" />
					<div className="flex gap-8 pt-2">
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-4 w-24" />
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
	const subtitle = config.subtitleField
		? (record[config.subtitleField] as string)
		: undefined;
	const state = config.stateField
		? (record[config.stateField] as string)
		: undefined;

	return (
		<div className={cn("flex gap-4 border-b bg-card p-4", className)}>
			{iconUrl && (
				<div className="flex size-16 shrink-0 items-center justify-center rounded-lg border bg-muted/50">
					<img
						src={iconUrl}
						alt={objectType}
						className="size-12 object-contain"
					/>
				</div>
			)}

			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<h1 className="text-base font-semibold truncate">{title}</h1>
					{state && (
						<Badge
							variant={getStateBadgeVariant(state, config.stateBadgeVariants)}
						>
							{state}
						</Badge>
					)}
				</div>
				{subtitle && (
					<p className="text-xs text-muted-foreground truncate">{subtitle}</p>
				)}

				<div className="mt-2 flex flex-wrap gap-x-6 gap-y-1">
					{config.fields.map((field) => {
						const value = record[field.key];
						if (value == null || value === "") return null;

						return (
							<div
								key={field.key}
								className="flex items-center gap-1.5 text-xs"
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
		</div>
	);
}
