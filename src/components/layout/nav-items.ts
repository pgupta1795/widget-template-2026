// src/components/layout/nav-items.ts
import { Globe } from "lucide-react";
import {
	type IconComponent,
	resolveLucideIcon,
} from "#/components/data-grid/toolbar/icon-resolver";
import type { FeatureConfig } from "#/features/layouts";
import * as layoutFeatures from "#/features/layouts";

export interface NavItem {
	path: string;
	label: string;
	icon: IconComponent;
}

/**
 * Extract all FeatureConfig objects from layouts bootstrap
 */
function getFeatureConfigs(): FeatureConfig[] {
	return Object.values(layoutFeatures).filter(
		(val): val is FeatureConfig =>
			typeof val === "object" &&
			val !== null &&
			"domain" in val &&
			"icon" in val &&
			"label" in val &&
			"listConfig" in val &&
			"detailConfig" in val,
	);
}

/**
 * Generate nav items from feature configs
 */
function generateNavFromFeatures(): NavItem[] {
	return getFeatureConfigs().map((config) => ({
		path: `/${config.domain}`,
		label: config.label,
		icon: resolveLucideIcon(config.icon),
	}));
}

/**
 * Static + dynamic navigation items
 */
export const NAV_ITEMS: NavItem[] = [
	{ path: "/", label: "3DX API Explorer", icon: Globe as IconComponent },
	...generateNavFromFeatures(),
];
