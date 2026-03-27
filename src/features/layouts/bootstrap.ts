// src/features/layouts/bootstrap.ts
/**
 * Central export point for all layout-driven feature configs.
 * Also registers all configs with the central tab-engine config registry.
 * Must be called once at application startup before any layouts routes render.
 */

import { registerConfig } from "@/components/tab-engine";
import { caSearchConfig } from "./ca/ca-search.config";
import { caLayoutConfig } from "./ca/ca-layout.config";
import { caFormConfig } from "./ca/ca-form.config";
import { caTabsConfig } from "./ca/ca-tabs.config";
import { caMembersConfig } from "./ca/ca-members.config";
import { caProposedConfig } from "./ca/ca-proposed.config";

export { caFeatureConfig } from "./ca/ca-feature.config";

let bootstrapped = false;

export function bootstrapLayoutsFeature(): void {
	if (bootstrapped) return;
	bootstrapped = true;

	// CA Domain Configs
	registerConfig("./ca-search.config.ts", caSearchConfig);
	registerConfig("./ca-layout.config.ts", caLayoutConfig);
	registerConfig("./ca-form.config.ts", caFormConfig);
	registerConfig("./ca-tabs.config.ts", caTabsConfig);
	registerConfig("./ca-members.config.ts", caMembersConfig);
	registerConfig("./ca-proposed.config.ts", caProposedConfig);
}

// Future domains:
// export { drawingFeatureConfig } from './drawing/drawing-feature.config'
// export { reportFeatureConfig } from './report/report-feature.config'
