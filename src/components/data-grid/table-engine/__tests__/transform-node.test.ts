import { describe, expect, it } from "vitest";
import { NodeContext } from "../core/node-context";
import { TransformNodeExecutor } from "../nodes/transform-node";
import type { ApiNodeOutput, TransformNodeConfig } from "../types/table.types";

const executor = new TransformNodeExecutor();

describe("TransformNodeExecutor", () => {
	it("transforms api node rows via JSONata expression", async () => {
		const ctx = new NodeContext();
		ctx.set("src", "api", {
			rows: [{ id: "1", price: 10, qty: 3 }],
		} as ApiNodeOutput);

		const config: TransformNodeConfig = {
			sourceNodeId: "src",
			expression: '$.{"id": id, "total": price * qty}',
		};
		const result = await executor.execute(config, ctx, []);
		expect(Array.isArray(result)).toBe(true);
		expect(result).toHaveLength(1);
		expect(result[0]).toMatchObject({ id: "1", total: 30 });
	});

	it("wraps a single-object result in an array", async () => {
		const ctx = new NodeContext();
		ctx.set("src", "api", { rows: [{ id: "1", name: "x" }] });

		const config: TransformNodeConfig = {
			sourceNodeId: "src",
			expression: "$[0]",
		};
		const result = await executor.execute(config, ctx, []);
		expect(Array.isArray(result)).toBe(true);
		expect(result[0]).toMatchObject({ id: "1" });
	});

	it("returns empty array when expression produces undefined", async () => {
		const ctx = new NodeContext();
		ctx.set("src", "api", { rows: [] });

		const config: TransformNodeConfig = {
			sourceNodeId: "src",
			expression: "nonexistentField",
		};
		const result = await executor.execute(config, ctx, []);
		expect(result).toEqual([]);
	});

	it("returns empty array when source node is not in context", async () => {
		const ctx = new NodeContext();
		const config: TransformNodeConfig = {
			sourceNodeId: "missing",
			expression: "$",
		};
		const result = await executor.execute(config, ctx, []);
		expect(result).toEqual([]);
	});

	it("can read from a merge node source", async () => {
		const ctx = new NodeContext();
		ctx.set("merged", "merge", [
			{ id: "1", x: 1 },
			{ id: "2", x: 2 },
		]);

		const config: TransformNodeConfig = {
			sourceNodeId: "merged",
			expression: "$[x > 1]",
		};
		const result = await executor.execute(config, ctx, []);
		expect(result).toEqual([{ id: "2", x: 2 }]);
	});
});
