// src/components/data-grid/table-engine/core/dag-engine.ts
import type { DAGConfig, NodeOutputMap, NodeType } from "../types/dag.types";
import type { AuthAdapterRegistry } from "./auth-registry";
import { validateDAG } from "./dag-validator";
import { buildWaves } from "./dependency-resolver";
import { NodeContext } from "./node-context";
import type { NodeRegistry } from "./node-registry";

export class DAGEngine {
	constructor(
		private readonly nodeRegistry: NodeRegistry,
		private readonly authRegistry: AuthAdapterRegistry,
	) {}

	getAuthRegistry(): AuthAdapterRegistry {
		return this.authRegistry;
	}

	async execute<T extends NodeType>(
		dag: DAGConfig,
		rootType: T,
		context: NodeContext = new NodeContext(),
	): Promise<NodeOutputMap[T]> {
		// 1. Validate graph structure and auth references before any execution
		validateDAG(dag, this.authRegistry.ids());

		// 2. Build execution waves (lazy nodes excluded)
		const waves = buildWaves(dag);

		// 3. Execute wave by wave; within each wave run in parallel
		for (const wave of waves) {
			await Promise.all(
				wave.map(async (node) => {
					const executor = this.nodeRegistry.resolve(node.type);
					const output = await executor.execute(
						node.config as never,
						context,
						dag.nodes, // full nodes[] including lazy ones
					);
					context.set(node.id, node.type, output as never);
				}),
			);
		}

		// 4. Return root node output
		return context.get(dag.rootNodeId, rootType);
	}
}
