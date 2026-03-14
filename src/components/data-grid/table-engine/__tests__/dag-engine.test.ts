// src/components/data-grid/table-engine/__tests__/dag-engine.test.ts
import { describe, expect, it, vi } from "vitest";
import { AuthAdapterRegistry } from "../core/auth-registry";
import { DAGEngine } from "../core/dag-engine";
import { DAGValidationError } from "../core/dag-validator";
import { NodeContext } from "../core/node-context";
import { NodeRegistry } from "../core/node-registry";
import type { DAGConfig } from "../types/dag.types";
import type { ColumnNodeOutput } from "../types/table.types";

function makeSetup() {
	const auth = new AuthAdapterRegistry();
	auth.register("none", { name: "none", request: vi.fn() });
	const nodes = new NodeRegistry();
	const engine = new DAGEngine(nodes, auth);
	return { engine, nodes, auth };
}

const colOutput: ColumnNodeOutput = { columns: [], visibility: {} };

describe("DAGEngine", () => {
	it("executes a single root node and returns its output", async () => {
		const { engine, nodes } = makeSetup();
		nodes.register("column", { execute: vi.fn().mockResolvedValue(colOutput) });
		const dag: DAGConfig = {
			nodes: [{ id: "cols", type: "column", config: { columns: [] } }],
			edges: [],
			rootNodeId: "cols",
		};
		const result = await engine.execute(dag, "column");
		expect(result).toBe(colOutput);
	});

	it("executes linear DAG in topological order", async () => {
		const { engine, nodes } = makeSetup();
		const order: string[] = [];
		nodes.register("api", {
			execute: vi.fn().mockImplementation(async () => {
				order.push("api");
				return { rows: [] };
			}),
		});
		nodes.register("column", {
			execute: vi.fn().mockImplementation(async () => {
				order.push("column");
				return colOutput;
			}),
		});
		const dag: DAGConfig = {
			nodes: [
				{
					id: "api1",
					type: "api",
					config: { url: "/", method: "GET", authAdapterId: "none" },
				},
				{ id: "cols", type: "column", config: { columns: [] } },
			],
			edges: [{ from: "api1", to: "cols" }],
			rootNodeId: "cols",
		};
		await engine.execute(dag, "column");
		expect(order).toEqual(["api", "column"]);
	});

	it("stores each node output in NodeContext so downstream nodes can read it", async () => {
		const { engine, nodes } = makeSetup();
		const apiOutput = { rows: [{ id: "1" }] };
		let capturedCtx: NodeContext | undefined;
		nodes.register("api", { execute: vi.fn().mockResolvedValue(apiOutput) });
		nodes.register("column", {
			execute: vi.fn().mockImplementation(async (_cfg, ctx: NodeContext) => {
				capturedCtx = ctx;
				return colOutput;
			}),
		});
		const dag: DAGConfig = {
			nodes: [
				{
					id: "api1",
					type: "api",
					config: { url: "/", method: "GET", authAdapterId: "none" },
				},
				{ id: "cols", type: "column", config: { columns: [] } },
			],
			edges: [{ from: "api1", to: "cols" }],
			rootNodeId: "cols",
		};
		await engine.execute(dag, "column");
		expect(capturedCtx?.has("api1")).toBe(true);
		expect(capturedCtx?.get("api1", "api")).toBe(apiOutput);
	});

	it("passes allNodes array as third argument to every executor", async () => {
		const { engine, nodes } = makeSetup();
		const executeMock = vi.fn().mockResolvedValue(colOutput);
		nodes.register("column", { execute: executeMock });
		const dag: DAGConfig = {
			nodes: [
				{ id: "cols", type: "column", config: { columns: [] } },
				{
					id: "lazy",
					type: "api",
					config: { url: "/", method: "GET", authAdapterId: "none" },
				},
			],
			edges: [],
			rootNodeId: "cols",
		};
		await engine.execute(dag, "column");
		const [, , allNodes] = executeMock.mock.calls[0];
		expect(allNodes).toHaveLength(2);
		expect(allNodes.map((n: { id: string }) => n.id)).toContain("lazy");
	});

	it("throws DAGValidationError for unknown authAdapterId before executing", async () => {
		const { engine, nodes } = makeSetup();
		nodes.register("api", { execute: vi.fn() });
		const dag: DAGConfig = {
			nodes: [
				{
					id: "a",
					type: "api",
					config: { url: "/", method: "GET", authAdapterId: "bad-id" },
				},
			],
			edges: [],
			rootNodeId: "a",
		};
		await expect(engine.execute(dag, "api")).rejects.toThrow(
			DAGValidationError,
		);
	});

	it("accepts an external NodeContext and populates it", async () => {
		const { engine, nodes } = makeSetup();
		nodes.register("column", { execute: vi.fn().mockResolvedValue(colOutput) });
		const ctx = new NodeContext();
		const dag: DAGConfig = {
			nodes: [{ id: "cols", type: "column", config: { columns: [] } }],
			edges: [],
			rootNodeId: "cols",
		};
		await engine.execute(dag, "column", ctx);
		expect(ctx.has("cols")).toBe(true);
	});
});
