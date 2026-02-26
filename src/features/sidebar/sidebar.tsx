import {
	Box,
	Clock,
	FolderOpen,
	type LucideIcon,
	PlusSquare,
} from "lucide-react";
import {
	SidebarContent,
	SidebarGroup,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarRail,
	Sidebar as SidebarShell,
} from "@/components/ui/sidebar";
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
};

export function Sidebar({
	config,
	activeView,
	onViewChange,
	onAction,
}: SidebarProps) {
	return (
		<SidebarShell collapsible="icon" variant="sidebar" className="border-r">
			<SidebarContent>
				{config.sections.map((section) => (
					<SidebarSectionGroup
						key={section.id}
						section={section}
						activeView={activeView}
						onViewChange={onViewChange}
						onAction={onAction}
					/>
				))}
			</SidebarContent>
			<SidebarRail />
		</SidebarShell>
	);
}

function SidebarSectionGroup({
	section,
	activeView,
	onViewChange,
	onAction,
}: {
	section: SidebarSection;
	activeView: string;
	onViewChange: (view: string) => void;
	onAction?: (action: string) => void;
}) {
	return (
		<SidebarGroup>
			<SidebarGroupLabel>{section.title}</SidebarGroupLabel>
			<SidebarMenu>
				{section.items.map((item) => (
					<SidebarNavItem
						key={item.id}
						item={item}
						isActive={item.view === activeView}
						onViewChange={onViewChange}
						onAction={onAction}
					/>
				))}
			</SidebarMenu>
		</SidebarGroup>
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
		return <li className="my-1 border-t border-sidebar-border" />;
	}

	const Icon = item.icon ? ICON_MAP[item.icon] : null;

	return (
		<SidebarMenuItem>
			<SidebarMenuButton
				isActive={isActive}
				tooltip={item.label}
				onClick={() => {
					if (item.type === "link" && item.view) {
						onViewChange(item.view);
					}
					if (item.type === "action" && item.action) {
						onAction?.(item.action);
					}
				}}
			>
				{Icon && <Icon />}
				<span>{item.label}</span>
			</SidebarMenuButton>
		</SidebarMenuItem>
	);
}
