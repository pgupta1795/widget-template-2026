import { MODULE_REGISTRY, CORE_MODULES, type ModuleKey } from "@/config/modules"
import { registerModule } from "./registry"
import { logger } from "@/lib/logger"

export function loadModules(additionalModules: ModuleKey[] = []): Promise<void> {
  const moduleKeys = [...new Set([...CORE_MODULES, ...additionalModules])]
  const requirePaths = moduleKeys.map((key) => MODULE_REGISTRY[key])

  return new Promise((resolve, reject) => {
    window.requirejs(
      requirePaths,
      (...modules: unknown[]) => {
        moduleKeys.forEach((key, index) => {
          registerModule(key, modules[index])
          logger.debug(`Module loaded: ${key}`)
        })
        logger.info(`Loaded ${moduleKeys.length} modules: ${moduleKeys.join(", ")}`)
        resolve()
      },
      (err: Error) => {
        logger.error("Failed to load modules", err)
        reject(err)
      },
    )
  })
}
