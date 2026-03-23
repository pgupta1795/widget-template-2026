import { parseSpec } from "./parser";
import type { ParsedCollection } from "./types";

// Vite eager glob — all files bundled at build time, zero runtime fetch
const rawModules = import.meta.glob("/openapi/*.json", {
	eager: true,
}) as Record<string, { default: unknown } | unknown>;

let _cache: ParsedCollection[] | null = null;

/**
 * Returns all successfully parsed built-in 3DExperience OpenAPI collections.
 * Bad files are silently filtered out (logged to console).
 * Result is memoized after first call.
 */
export function getBuiltInCollections(): ParsedCollection[] {
	if (_cache) return _cache;

	const results: ParsedCollection[] = [];

	for (const [filePath, module] of Object.entries(rawModules)) {
		const filename = filePath.split("/").pop() ?? filePath;
		// Vite JSON imports: value is { default: {...} } or just the object
		const raw = (module as any)?.default ?? module;

		try {
			const collection = parseSpec(raw, filename);
			results.push(collection);
		} catch (err) {
			console.warn(`[api-explorer] Skipped ${filename}:`, err);
		}
	}

	// Sort alphabetically by name
	results.sort((a, b) => a.name.localeCompare(b.name));
	_cache = results;
	return _cache;
}

/** Clears the memoized cache — for testing only */
export function _resetRegistryCache() {
	_cache = null;
}
