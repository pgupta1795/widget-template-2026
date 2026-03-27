// src/components/tab-engine/core/tab-config-registry.ts
/**
 * Central config registry.
 *
 * Vite does not support fully dynamic import() strings in production builds.
 * Instead, all configs are imported statically at feature bootstrap time and
 * registered here. Tab/layout configs reference them by a stable string key
 * (conventionally the relative path, e.g. "./ca-search.config.ts").
 *
 * Usage:
 *   // In feature bootstrap (e.g. src/features/xen/bootstrap.ts):
 *   registerConfig("./ca-search.config.ts", caSearchConfig);
 *
 *   // In tab config:
 *   content: { type: "table", configPath: "./ca-search.config.ts" }
 */

const registry = new Map<string, unknown>();

export function registerConfig(path: string, config: unknown): void {
	registry.set(path, config);
}

export function getConfig(path: string): unknown {
	return registry.get(path);
}

export function hasConfig(path: string): boolean {
	return registry.has(path);
}
