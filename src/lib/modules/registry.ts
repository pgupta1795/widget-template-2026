const loadedModules = new Map<string, unknown>()

export function registerModule(key: string, module: unknown) {
  loadedModules.set(key, module)
}

export function getModule<T = unknown>(key: string): T {
  const mod = loadedModules.get(key)
  if (!mod) throw new Error(`Module "${key}" not loaded. Check widget config modules array.`)
  return mod as T
}

export function hasModule(key: string): boolean {
  return loadedModules.has(key)
}

export function getLoadedModuleKeys(): string[] {
  return Array.from(loadedModules.keys())
}
