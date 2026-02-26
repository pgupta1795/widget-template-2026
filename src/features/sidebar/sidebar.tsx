import {
	Box,
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
};

export function Sidebar({
	config,
	activeView,
	onViewChange,
	onAction,
	className,
}: SidebarProps) {
	return (
		<aside
			className={cn(
				"flex h-full flex-col border-r border-border bg-card",
				className,
			)}
			style={{ width: config.defaultWidth ?? 220 }}
		>
			<div className="px-4 pt-4 pb-2">
				<h2 className="text-sm font-semibold text-foreground">
					{config.title}
				</h2>
				{config.description && (
					<p className="mt-0.5 text-[0.6875rem] leading-snug text-muted-foreground">
						{config.description}
					</p>
				)}
			</div>

			<nav className="flex-1 overflow-y-auto px-2 pb-4">
				{config.sections.map((section, idx) => (
					<SidebarSectionGroup
						key={section.id}
						section={section}
						activeView={activeView}
						onViewChange={onViewChange}
						onAction={onAction}
						showDivider={idx > 0}
					/>
				))}
			</nav>
		</aside>
	);
}

function SidebarSectionGroup({
	section,
	activeView,
	onViewChange,
	onAction,
	showDivider,
}: {
	section: SidebarSection;
	activeView: string;
	onViewChange: (view: string) => void;
	onAction?: (action: string) => void;
	showDivider: boolean;
}) {
	return (
		<div>
			{showDivider && <div className="mx-2 my-2 border-t border-border" />}
			<h3 className="px-2 pb-1 pt-3 text-[0.6875rem] font-semibold text-foreground">
				{section.title}
			</h3>
			{section.description && (
				<p className="px-2 pb-1 text-[0.625rem] text-muted-foreground">
					{section.description}
				</p>
			)}
			<ul className="space-y-0.5">
				{section.items.map((item) => (
					<SidebarNavItem
						key={item.id}
						item={item}
						isActive={item.view === activeView}
						onViewChange={onViewChange}
						onAction={onAction}
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
}: {
	item: SidebarItemType;
	isActive: boolean;
	onViewChange: (view: string) => void;
	onAction?: (action: string) => void;
}) {
	if (item.type === "divider") {
		return <div className="mx-2 my-2 border-t border-border" />;
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
				className={cn(
					"flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors cursor-pointer",
					isActive
						? "border-l-2 border-l-primary bg-sidebar-accent text-primary font-medium"
						: "text-muted-foreground hover:bg-muted hover:text-foreground",
				)}
			>
				{Icon && (
					<Icon
						className={cn(
							"size-4 shrink-0",
							isActive ? "text-primary" : "text-muted-foreground",
						)}
					/>
				)}
				<span>{item.label}</span>
			</button>
		</li>
	);
}
