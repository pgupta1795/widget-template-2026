import type { WidgetConfig } from "@/types/config"
import { engineeringBomConfig } from "./engineering-bom"

const WIDGET_CONFIGS: Record<string, WidgetConfig> = {
  "engineering-bom": engineeringBomConfig,
}

export function getWidgetConfig(id: string): WidgetConfig {
  const config = WIDGET_CONFIGS[id]
  if (!config) throw new Error(`Widget config "${id}" not found. Available: ${Object.keys(WIDGET_CONFIGS).join(", ")}`)
  return config
}

export function getAvailableWidgets(): { id: string; title: string; description?: string }[] {
  return Object.values(WIDGET_CONFIGS).map(({ id, title, description }) => ({
    id,
    title,
    description,
  }))
}

export function registerWidgetConfig(config: WidgetConfig) {
  WIDGET_CONFIGS[config.id] = config
}
