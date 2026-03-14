// src/components/data-grid/table-engine/__tests__/merge-node.test.ts
import { describe, expect, it } from "vitest";
import { NodeContext } from "../core/node-context";
import { MergeNodeExecutor } from "../nodes/merge-node";
import type { MergeNodeConfig } from "../types/table.types";

const executor = new MergeNodeExecutor();

describe("MergeNodeExecutor — concat", () => {
	it("concatenates rows from two api sources in declaration order", async () => {
		const ctx = new NodeContext();
		ctx.set("a", "api", { rows: [{ id: "1" }, { id: "2" }] });
		ctx.set("b", "api", { rows: [{ id: "3" }] });
		const config: MergeNodeConfig = {
			sourceNodeIds: ["a", "b"],
			strategy: "concat",
		};
		const result = await executor.execute(config, ctx, []);
		expect(result).toHaveLength(3);
		expect(result.map((r) => r.id)).toEqual(["1", "2", "3"]);
	});

	it("handles one empty source", async () => {
		const ctx = new NodeContext();
		ctx.set("a", "api", { rows: [{ id: "1" }] });
		ctx.set("b", "api", { rows: [] });
		const config: MergeNodeConfig = {
			sourceNodeIds: ["a", "b"],
			strategy: "concat",
		};
		const result = await executor.execute(config, ctx, []);
		expect(result).toHaveLength(1);
	});

	it("can concat from transform-type source", async () => {
		const ctx = new NodeContext();
		ctx.set("t", "transform", [{ id: "x" }]);
		ctx.set("a", "api", { rows: [{ id: "y" }] });
		const config: MergeNodeConfig = {
			sourceNodeIds: ["t", "a"],
			strategy: "concat",
		};
		const result = await executor.execute(config, ctx, []);
		expect(result.map((r) => r.id)).toEqual(["x", "y"]);
	});
});

describe("MergeNodeExecutor — join", () => {
	it("left-joins rows on joinKey, spreading matched fields", async () => {
		const ctx = new NodeContext();
		ctx.set("a", "api", {
			rows: [
				{ id: "1", name: "Alice" },
				{ id: "2", name: "Bob" },
			],
		});
		ctx.set("b", "api", { rows: [{ id: "1", dept: "Eng" }] });
		const config: MergeNodeConfig = {
			sourceNodeIds: ["a", "b"],
			strategy: "join",
			joinKey: "id",
		};
		const result = await executor.execute(config, ctx, []);
		expect(result[0]).toMatchObject({ id: "1", name: "Alice", dept: "Eng" });
		// Unmatched left row included without extra fields
		expect(result[1]).toMatchObject({ id: "2", name: "Bob" });
		expect(result[1].dept).toBeUndefined();
	});

	it("throws when joinKey is missing from config", async () => {
		const ctx = new NodeContext();
		ctx.set("a", "api", { rows: [{ id: "1" }] });
		ctx.set("b", "api", { rows: [{ id: "1" }] });
		const config: MergeNodeConfig = {
			sourceNodeIds: ["a", "b"],
			strategy: "join",
		};
		await expect(executor.execute(config, ctx, [])).rejects.toThrow();
	});
});

describe("MergeNodeExecutor — merge", () => {
	it("merges rows pair-wise by index using Object.assign", async () => {
		const ctx = new NodeContext();
		ctx.set("a", "api", { rows: [{ id: "1", x: 1 }] });
		ctx.set("b", "api", { rows: [{ id: "1", y: 2 }] });
		const config: MergeNodeConfig = {
			sourceNodeIds: ["a", "b"],
			strategy: "merge",
		};
		const result = await executor.execute(config, ctx, []);
		expect(result[0]).toMatchObject({ id: "1", x: 1, y: 2 });
	});
});
