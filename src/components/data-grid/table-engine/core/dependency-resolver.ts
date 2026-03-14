import type { DAGConfig, DAGNode } from "../types/dag.types";
import { DAGValidationError } from "./dag-validator";

export type Wave = DAGNode[];

/**
 * Topological sort via Kahn's algorithm.
 * Operates ONLY on nodes reachable via edges — lazy nodes (in nodes[] but not in
 * any edge) are excluded. A root-only DAG (no edges) returns a single wave.
 */
export function buildWaves(dag: DAGConfig): Wave[] {
	const nodeMap = new Map<string, DAGNode>(dag.nodes.map((n) => [n.id, n]));

	// Collect only the node ids that appear in at least one edge
	const edgeNodeIds = new Set<string>();
	for (const edge of dag.edges) {
		edgeNodeIds.add(edge.from);
		edgeNodeIds.add(edge.to);
	}

	// No edges: root-only, single wave
	if (edgeNodeIds.size === 0) {
		const root = nodeMap.get(dag.rootNodeId);
		if (!root) {
			throw new DAGValidationError(
				`rootNodeId "${dag.rootNodeId}" not found in nodes[]`,
				dag.rootNodeId,
			);
		}
		return [[root]];
	}

	// Validate edge references
	for (const id of edgeNodeIds) {
		if (!nodeMap.has(id)) {
			throw new DAGValidationError(
				`Edge references node "${id}" which is not in nodes[]`,
				id,
			);
		}
	}

	// Build in-degree map and dependents adjacency for edge-reachable nodes
	const inDegree = new Map<string, number>();
	const dependents = new Map<string, string[]>();

	for (const id of edgeNodeIds) {
		inDegree.set(id, 0);
		dependents.set(id, []);
	}
	for (const edge of dag.edges) {
		inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
		const deps = dependents.get(edge.from);
		if (deps) {
			deps.push(edge.to);
		}
	}

	const waves: Wave[] = [];
	const remaining = new Set(inDegree.keys());

	while (remaining.size > 0) {
		const ready: string[] = [];
		for (const id of remaining) {
			if ((inDegree.get(id) ?? 0) === 0) ready.push(id);
		}

		if (ready.length === 0) {
			throw new DAGValidationError(
				`Circular dependency detected. Remaining nodes: ${[...remaining].join(", ")}`,
			);
		}

		const readyWave = ready.map((id) => {
			const node = nodeMap.get(id);
			if (!node) {
				throw new DAGValidationError(
					`Internal error: ready node "${id}" not found in nodeMap`,
					id,
				);
			}
			return node;
		});
		waves.push(readyWave);

		for (const id of ready) {
			remaining.delete(id);
			for (const dep of dependents.get(id) ?? []) {
				inDegree.set(dep, (inDegree.get(dep) ?? 0) - 1);
			}
		}
	}

	return waves;
}
