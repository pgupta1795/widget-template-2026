import { logger } from "@/lib/logger";
import {
	CORE_MODULES,
	MODULE_REGISTRY,
	type ModuleKey,
} from "@/lib/modules/modules";
import { registerModule } from "@/lib/modules/registry";

export function loadModules(
	additionalModules: ModuleKey[] = [],
): Promise<void> {
	const moduleKeys = [...new Set([...CORE_MODULES, ...additionalModules])];
	const requirePaths = moduleKeys.map((key) => MODULE_REGISTRY[key]);

	return new Promise((resolve, reject) => {
		window.requirejs(
			requirePaths,
			(...modules: unknown[]) => {
				moduleKeys.forEach((key, index) => {
					registerModule(key, modules[index]);
					logger.debug(`Module loaded: ${key}`);
				});
				logger.info(
					`Loaded ${moduleKeys.length} modules: ${moduleKeys.join(", ")}`,
				);
				resolve();
			},
			(err: Error) => {
				logger.error("Failed to load modules", err);
				reject(err);
			},
		);
	});
}
