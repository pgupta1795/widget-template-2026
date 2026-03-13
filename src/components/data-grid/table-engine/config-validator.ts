import { buildWaves } from "./dag-resolver"
import { ConfigError } from "./types"
import type { TableConfig } from "./types"

/**
 * Validates a TableConfig at hook-mount time (before any fetch).
 * Throws ConfigError with a descriptive message on the first problem found.
 * This keeps all validation in one place and makes errors easy to find.
 */
export function validateConfig(config: TableConfig): void {
  if (!config.id?.trim()) {
    throw new ConfigError("TableConfig.id is required and must be a non-empty string.")
  }

  if (!config.dataSources || config.dataSources.length === 0) {
    throw new ConfigError(
      `TableConfig "${config.id}": dataSources must contain at least one entry.`
    )
  }

  if (!config.columns || config.columns.length === 0) {
    throw new ConfigError(
      `TableConfig "${config.id}": columns must contain at least one entry.`
    )
  }

  // Validate rowLevel sources have a cacheKey
  const sourceIds = new Set(config.dataSources.map((s) => s.id))
  for (const source of config.dataSources) {
    if (source.rowLevel && !source.cacheKey) {
      throw new ConfigError(
        `DataSource "${source.id}" has rowLevel:true but no cacheKey. ` +
          `Provide a JSONata cacheKey expression (e.g. "$string(supplierId)") to deduplicate row-level calls.`
      )
    }
  }

  // Validate column dataSource references point to known sources
  for (const col of config.columns) {
    if (col.dataSource && !sourceIds.has(col.dataSource)) {
      throw new ConfigError(
        `Column "${col.field}" references unknown dataSource "${col.dataSource}". ` +
          `Available source ids: ${[...sourceIds].join(", ")}`
      )
    }
  }

  // Validate DAG (circular deps, unknown dep ids) — buildWaves throws ConfigError
  buildWaves(config.dataSources)
}
