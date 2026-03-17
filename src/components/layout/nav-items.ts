import type { LucideIcon } from "lucide-react";
import { Globe, Zap } from "lucide-react";

export interface NavItem {
	path: string;
	label: string;
	icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
	{ path: "/", label: "3DX API Explorer", icon: Globe },
	{ path: "/xen", label: "XEN", icon: Zap },
];
