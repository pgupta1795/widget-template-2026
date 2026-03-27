// src/components/form-engine/components/header-form-renderer.tsx
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getBadgeClasses } from "../fields/badge-colors";
import type { HeaderFormData } from "../types/form.types";

interface HeaderFormRendererProps {
	data: HeaderFormData | null;
	isLoading: boolean;
	isCollapsed: boolean;
	onToggleCollapsed: () => void;
	onToggleDetail?: () => void;
	showInfoIcon?: boolean;
}

export function HeaderFormRenderer({
	data,
	isLoading,
	isCollapsed,
	onToggleCollapsed,
	onToggleDetail,
	showInfoIcon = true,
}: HeaderFormRendererProps) {
	if (isLoading) {
		return (
			<div className="flex items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4 py-2">
				<Skeleton className="h-10 w-10 rounded-md" />
				<div className="flex flex-col gap-1">
					<Skeleton className="h-4 w-32" />
					<Skeleton className="h-3 w-20" />
				</div>
			</div>
		);
	}

	if (!data) return null;

	return (
		<div
			className={cn(
				"border-b bg-background/80 backdrop-blur-md px-4 transition-all duration-200",
				isCollapsed ? "py-2" : "py-3",
			)}
		>
			{/* Always-visible row: icon + title + badge + actions */}
			<div className="flex items-center gap-3">
				{data.image && (
					<img
						src={data.image}
						alt={data.title}
						className="h-10 w-10 rounded-md object-cover shrink-0"
					/>
				)}

				<div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
					<span className="font-semibold text-foreground truncate">
						{data.title}
					</span>
					{data.badge && (
						<span
							className={cn(
								"inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
								getBadgeClasses(
									{ [data.badge]: data.badgeColor ?? "gray" },
									data.badge,
								),
							)}
						>
							{data.badge}
						</span>
					)}
					{!isCollapsed && data.name && (
						<span className="text-sm text-muted-foreground">{data.name}</span>
					)}
				</div>

				<div className="flex items-center gap-1 shrink-0">
					{showInfoIcon && onToggleDetail && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={onToggleDetail}
						>
							<Info size={14} />
						</Button>
					)}
					<Button
						variant="ghost"
						size="icon"
						className="h-7 w-7"
						onClick={onToggleCollapsed}
					>
						{isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
					</Button>
				</div>
			</div>

			{/* Expanded section: owner + key-value pairs */}
			{!isCollapsed &&
				(data.expandedFields.length > 0 || data.keyValueFields.length > 0) && (
					<div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
						{data.expandedFields.map(({ label, value }) => (
							<span key={label} className="text-muted-foreground">
								{label}: <span className="text-primary">{value || "—"}</span>
							</span>
						))}
						{data.keyValueFields.map(({ label, value }) => (
							<span key={label} className="text-muted-foreground">
								{label}: <span className="text-foreground">{value || "—"}</span>
							</span>
						))}
					</div>
				)}
		</div>
	);
}
