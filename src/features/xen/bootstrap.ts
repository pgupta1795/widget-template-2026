// src/features/xen/bootstrap.ts
import { registerConfig } from "@/components/tab-engine";
import { engSearchConfig } from "./configs/eng-search.config";
import { engExpandConfig } from "./configs/eng-expand.config";
import { engEnrichedConfig } from "./configs/eng-enriched.config";

let bootstrapped = false;

/**
 * Registers all xen feature configs with the central config registry.
 * Must be called once at application startup before any xen routes render.
 * Note: CA configs are now registered by bootstrapLayoutsFeature().
 */
export function bootstrapXenFeature(): void {
	if (bootstrapped) return;
	bootstrapped = true;
	registerConfig("./eng-search.config.ts", engSearchConfig);
	registerConfig("./eng-expand.config.ts", engExpandConfig);
	registerConfig("./eng-enriched.config.ts", engEnrichedConfig);
}
