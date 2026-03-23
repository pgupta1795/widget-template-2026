import { Link, useRouterState } from "@tanstack/react-router";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NAV_ITEMS } from "./nav-items";
import { useSidebarSlot } from "./sidebar-slot-context";

export function AppSidebar() {
	const { location } = useRouterState();
	const { registerSlot } = useSidebarSlot();

	return (
		<Sidebar
			collapsible="icon"
			className="overflow-hidden *:data-[sidebar=sidebar]:flex-row"
		>
			{/* Icon strip — always visible */}
			<Sidebar
				collapsible="none"
				className="w-[calc(var(--sidebar-width-icon)+1px)]! border-r"
			>
				<SidebarContent>
					<SidebarGroup>
						<SidebarGroupContent>
							<SidebarMenu>
								{NAV_ITEMS.map((item) => {
									const isActive =
										item.path === "/"
											? location.pathname === "/"
											: location.pathname.startsWith(item.path);
									return (
										<SidebarMenuItem key={item.path}>
											<SidebarMenuButton
												render={<Link to={item.path} />}
												isActive={isActive}
												tooltip={item.label}
											>
												<item.icon />
												<span>{item.label}</span>
											</SidebarMenuButton>
										</SidebarMenuItem>
									);
								})}
							</SidebarMenu>
						</SidebarGroupContent>
					</SidebarGroup>
				</SidebarContent>
			</Sidebar>

			{/* Collapsible panel — feature content portals in here */}
			<Sidebar collapsible="none" className="hidden flex-1 md:flex">
				<SidebarContent className="flex-1 flex flex-col overflow-hidden min-h-0 p-0">
					<div
						ref={registerSlot}
						className="flex-1 flex flex-col overflow-hidden min-h-0"
					/>
				</SidebarContent>
			</Sidebar>
		</Sidebar>
	);
}
