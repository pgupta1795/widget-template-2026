import {
	Box,
	ChevronLeft,
	ChevronRight,
	Clock,
	FolderOpen,
	type LucideIcon,
	PlusSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type {
	SidebarConfig,
	SidebarItem as SidebarItemType,
	SidebarSection,
} from "@/types/config";

const ICON_MAP: Record<string, LucideIcon> = {
	clock: Clock,
	"folder-open": FolderOpen,
	box: Box,
	"plus-square": PlusSquare,
};

type SidebarProps = {
	config: SidebarConfig;
	activeView: string;
	onViewChange: (view: string) => void;
	onAction?: (action: string) => void;
	className?: string;
	isCollapsed?: boolean;
	onToggleCollapse?: () => void;
};

export function Sidebar({
	config,
	activeView,
	onViewChange,
	onAction,
	className,
	isCollapsed = false,
	onToggleCollapse,
}: SidebarProps) {
	const width = isCollapsed ? 52 : (config.defaultWidth ?? 220);

	return (
		<aside
			className={cn(
				"flex h-full flex-col border-r border-border bg-card transition-all duration-200 shrink-0",
				className,
			)}
			style={{ width }}
		>
			{!isCollapsed && (
				<div className="px-4 pt-4 pb-2 shrink-0">
					<h2 className="text-sm font-semibold text-foreground">
						{config.title}
					</h2>
					{config.description && (
						<p className="mt-0.5 text-[0.6875rem] leading-snug text-muted-foreground">
							{config.description}
						</p>
					)}
				</div>
			)}

			<nav
				className={cn(
					"flex-1 overflow-y-auto pb-2",
					isCollapsed ? "px-1.5 pt-3" : "px-2 pt-1",
				)}
			>
				{config.sections.map((section, idx) => (
					<SidebarSectionGroup
						key={section.id}
						section={section}
						activeView={activeView}
						onViewChange={onViewChange}
						onAction={onAction}
						showDivider={idx > 0}
						isCollapsed={isCollapsed}
					/>
				))}
			</nav>

			<div className="shrink-0 border-t border-border p-1.5">
				<button
					type="button"
					onClick={onToggleCollapse}
					aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
					className={cn(
						"flex w-full items-center rounded-md p-1.5 text-muted-foreground transition-colors cursor-pointer hover:bg-muted hover:text-foreground",
						isCollapsed ? "justify-center" : "justify-end gap-1.5 pr-2",
					)}
				>
					{isCollapsed ? (
						<ChevronRight className="size-3.5" />
					) : (
						<>
							<span className="text-[0.625rem]">Collapse</span>
							<ChevronLeft className="size-3.5" />
						</>
					)}
				</button>
			</div>
		</aside>
	);
}

function SidebarSectionGroup({
	section,
	activeView,
	onViewChange,
	onAction,
	showDivider,
	isCollapsed,
}: {
	section: SidebarSection;
	activeView: string;
	onViewChange: (view: string) => void;
	onAction?: (action: string) => void;
	showDivider: boolean;
	isCollapsed: boolean;
}) {
	return (
		<div>
			{showDivider && (
				<div className={cn("my-2 border-t border-border", isCollapsed ? "mx-1" : "mx-2")} />
			)}
			{!isCollapsed && (
				<h3 className="px-2 pb-1 pt-3 text-[0.6875rem] font-semibold text-foreground uppercase tracking-wide">
					{section.title}
				</h3>
			)}
			<ul className="space-y-0.5">
				{section.items.map((item) => (
					<SidebarNavItem
						key={item.id}
						item={item}
						isActive={item.view === activeView}
						onViewChange={onViewChange}
						onAction={onAction}
						isCollapsed={isCollapsed}
					/>
				))}
			</ul>
		</div>
	);
}

function SidebarNavItem({
	item,
	isActive,
	onViewChange,
	onAction,
	isCollapsed,
}: {
	item: SidebarItemType;
	isActive: boolean;
	onViewChange: (view: string) => void;
	onAction?: (action: string) => void;
	isCollapsed: boolean;
}) {
	if (item.type === "divider") {
		return isCollapsed ? null : (
			<div className="mx-2 my-2 border-t border-border" />
		);
	}

	const Icon = item.icon ? ICON_MAP[item.icon] : null;

	const handleClick = () => {
		if (item.type === "link" && item.view) {
			onViewChange(item.view);
		} else if (item.type === "action" && item.action) {
			onAction?.(item.action);
		}
	};

	return (
		<li>
			<button
				type="button"
				onClick={handleClick}
				title={isCollapsed ? item.label : undefined}
				className={cn(
					"flex w-full items-center rounded-md text-xs transition-colors cursor-pointer",
					isCollapsed
						? "justify-center p-2"
						: "gap-2 px-2 py-1.5",
					isActive
						? cn(
								"bg-sidebar-accent text-primary font-medium",
								!isCollapsed && "border-l-2 border-l-primary",
							)
						: "text-muted-foreground hover:bg-muted hover:text-foreground",
				)}
			>
				{Icon && (
					<Icon
						className={cn(
							"shrink-0",
							isCollapsed ? "size-[1.125rem]" : "size-4",
							isActive ? "text-primary" : "text-muted-foreground",
						)}
					/>
				)}
				{!isCollapsed && <span>{item.label}</span>}
			</button>
		</li>
	);
}
