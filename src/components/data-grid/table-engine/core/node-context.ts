// src/components/data-grid/table-engine/core/node-context.ts
import type {
	JsonPrimitive,
	NodeOutputMap,
	NodeType,
} from "../types/dag.types";
import type { GridRow } from "../types/table.types";
import { DAGExecutionError } from "./dag-validator";

interface StoredEntry {
	type: NodeType;
	output: NodeOutputMap[NodeType];
}

export class NodeContext {
	private readonly store: Map<string, StoredEntry>;
	private readonly row: GridRow | undefined;
	private readonly params: Record<string, JsonPrimitive>;
	private readonly nodeId: string;

	constructor(
		store: Map<string, StoredEntry> = new Map(),
		row?: GridRow,
		params: Record<string, JsonPrimitive> = {},
		nodeId = "",
	) {
		this.store = store;
		this.row = row;
		this.params = params;
		this.nodeId = nodeId;
	}

	get<T extends NodeType>(nodeId: string, _type: T): NodeOutputMap[T] {
		const entry = this.store.get(nodeId);
		if (!entry) {
			throw new DAGExecutionError(
				`NodeContext: node "${nodeId}" has no stored output. ` +
					`Check execution order or call has() before get() for lazy nodes.`,
				nodeId,
				new Error("Missing node output"),
			);
		}
		return entry.output as NodeOutputMap[T];
	}

	set<T extends NodeType>(
		nodeId: string,
		type: T,
		output: NodeOutputMap[T],
	): void {
		this.store.set(nodeId, { type, output });
	}

	has(nodeId: string): boolean {
		return this.store.has(nodeId);
	}

	getAll(): ReadonlyMap<string, StoredEntry> {
		return this.store;
	}

	withRow(row: GridRow): NodeContext {
		return new NodeContext(
			new Map(this.store),
			row,
			{ ...this.params },
			this.nodeId,
		);
	}

	withParams(params: Record<string, JsonPrimitive>): NodeContext {
		return new NodeContext(
			new Map(this.store),
			this.row,
			{
				...this.params,
				...params,
			},
			this.nodeId,
		);
	}

	getRow(): GridRow | undefined {
		return this.row;
	}

	getParams(): Record<string, JsonPrimitive> {
		return this.params;
	}

	getNodeId(): string {
		return this.nodeId;
	}

	forNode(nodeId: string): NodeContext {
		return new NodeContext(this.store, this.row, this.params, nodeId);
	}
}
