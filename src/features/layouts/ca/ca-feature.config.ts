import type { FeatureConfig } from "../types";
import { caSearchConfig } from "./ca-search.config";
import { caLayoutConfig } from "./ca-layout.config";

export const caFeatureConfig: FeatureConfig = {
	domain: "ca",
	icon: "LayoutGrid",
	label: "CA View",
	listConfig: caSearchConfig,
	detailConfig: caLayoutConfig,
	enableSearch: true,
	enableDragDrop: true,
};
