// src/components/tab-engine/index.ts
export type {
	DAGTabConfig,
	TabItemConfig,
	TabContentConfig,
	TabContentDefinition,
	TabIndicatorStyle,
} from "./types/tab.types";
export { tabContentRegistry } from "./core/tab-content-registry";
export {
	registerConfig,
	getConfig,
	hasConfig,
} from "./core/tab-config-registry";
export { bootstrapTabEngine } from "./bootstrap";
export { ConfiguredTabs } from "./configured-tabs";
export type { ConfiguredTabsProps } from "./configured-tabs";
