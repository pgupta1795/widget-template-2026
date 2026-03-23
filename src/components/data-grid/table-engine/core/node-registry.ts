import type {
	DAGNode,
	NodeConfigMap,
	NodeOutputMap,
	NodeType,
} from "../types/dag.types";

import { DAGValidationError } from "./dag-validator";
import type { NodeContext } from "./node-context";

export interface INodeExecutor<T extends NodeType> {
	execute(
		config: NodeConfigMap[T],
		context: NodeContext,
		allNodes: DAGNode[],
	): Promise<NodeOutputMap[T]>;
}

export class NodeRegistry {
	private readonly map = new Map<NodeType, INodeExecutor<NodeType>>();

	register<T extends NodeType>(type: T, executor: INodeExecutor<T>): this {
		this.map.set(type, executor as INodeExecutor<NodeType>);
		return this;
	}

	resolve<T extends NodeType>(type: T): INodeExecutor<T> {
		const executor = this.map.get(type);
		if (!executor) {
			throw new DAGValidationError(
				`No executor registered for node type: "${type}"`,
			);
		}
		return executor as INodeExecutor<T>;
	}
}
