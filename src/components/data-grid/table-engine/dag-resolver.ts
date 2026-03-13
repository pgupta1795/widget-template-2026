import type { DataSourceConfig, SourceMap } from "./types"
import { ConfigError } from "./types"

// ─── Types ────────────────────────────────────────────────────────────────────

/** A wave is a list of source IDs that can all execute in parallel. */
export type Wave = string[]

/**
 * Function that executes a single source given its ID and all prior resolved sources.
 * The DAG executor calls this for every node; the caller provides the actual fetch logic.
 */
export type SourceExecutorFn = (
  sourceId: string,
  resolvedSources: SourceMap,
  signal?: AbortSignal
) => Promise<unknown>

// ─── Graph Building ───────────────────────────────────────────────────────────

/**
 * Validate dependency references and build adjacency structures.
 * Throws ConfigError if any dependsOn references an unknown source id.
 */
function buildGraph(sources: DataSourceConfig[]): {
  inDegree: Map<string, number>
  dependents: Map<string, string[]>
} {
  const ids = new Set(sources.map((s) => s.id))

  // Validate all deps reference known ids and contain no duplicates
  for (const source of sources) {
    const seen = new Set<string>()
    for (const dep of source.dependsOn ?? []) {
      if (!ids.has(dep)) {
        throw new ConfigError(
          `DataSource "${source.id}" depends on unknown source "${dep}". ` +
            `Available ids: ${[...ids].join(", ")}`
        )
      }
      if (dep === source.id) {
        throw new ConfigError(
          `DataSource "${source.id}" has a self-dependency.`
        )
      }
      if (seen.has(dep)) {
        throw new ConfigError(
          `DataSource "${source.id}" has a duplicate dependency on "${dep}".`
        )
      }
      seen.add(dep)
    }
  }

  // Build in-degree map and reverse adjacency (who depends on me?)
  const inDegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()

  for (const source of sources) {
    inDegree.set(source.id, source.dependsOn?.length ?? 0)
    dependents.set(source.id, [])
  }

  for (const source of sources) {
    for (const dep of source.dependsOn ?? []) {
      dependents.get(dep)!.push(source.id)
    }
  }

  return { inDegree, dependents }
}

// ─── Kahn's Algorithm ─────────────────────────────────────────────────────────

/**
 * Topologically sort DataSourceConfig[] into ordered waves using Kahn's algorithm.
 *
 * - Sources with no dependencies go into Wave 0.
 * - When a wave completes, nodes whose in-degree drops to 0 form the next wave.
 * - If nodes remain after the algorithm (cycle detected), throws ConfigError.
 *
 * @throws ConfigError on circular dependencies or unknown dependency ids.
 * @returns Ordered array of waves; each wave is a list of source IDs to run in parallel.
 */
export function buildWaves(sources: DataSourceConfig[]): Wave[] {
  if (sources.length === 0) return []

  const { inDegree, dependents } = buildGraph(sources)
  const waves: Wave[] = []
  const remaining = new Set(inDegree.keys())

  while (remaining.size > 0) {
    // Find all nodes with in-degree 0 (ready to execute)
    const wave: string[] = []
    for (const id of remaining) {
      if (inDegree.get(id) === 0) wave.push(id)
    }

    if (wave.length === 0) {
      // Nodes remain but none have in-degree 0 — circular dependency
      const cycleNodes = [...remaining]
      throw new ConfigError(
        `Circular dependency detected among DataSources: ${cycleNodes.join(", ")}. ` +
          `Check the dependsOn fields for a cycle.`
      )
    }

    waves.push(wave)

    // Remove this wave's nodes and decrement in-degrees of their dependents
    for (const id of wave) {
      remaining.delete(id)
      for (const dependent of dependents.get(id) ?? []) {
        inDegree.set(dependent, (inDegree.get(dependent) ?? 0) - 1)
      }
    }
  }

  return waves
}

// ─── Wave Executor ────────────────────────────────────────────────────────────

/**
 * Execute a list of waves in order. Within each wave, all sources run in parallel
 * via Promise.all. Between waves, execution is sequential (next wave waits for previous).
 *
 * Each call to executeFn receives:
 * - The source ID
 * - All sources resolved so far (accumulated across prior waves)
 * - An optional AbortSignal
 *
 * @returns A SourceMap: { [sourceId]: resolvedData }
 */
export async function executeWaves(
  waves: Wave[],
  executeFn: SourceExecutorFn,
  signal?: AbortSignal
): Promise<SourceMap> {
  const resolved: SourceMap = {}

  for (const wave of waves) {
    // All sources in this wave run in parallel with a snapshot of resolved so far
    const waveResults = await Promise.all(
      wave.map(async (id) => {
        const data = await executeFn(id, { ...resolved }, signal)
        return { id, data }
      })
    )

    // Merge wave results into resolved map for the next wave
    for (const { id, data } of waveResults) {
      resolved[id] = data
    }
  }

  return resolved
}
