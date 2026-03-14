// src/components/data-grid/table-engine/__tests__/node-context.test.ts
import { describe, expect, it } from "vitest";
import { DAGExecutionError } from "../core/dag-validator";
import { NodeContext } from "../core/node-context";
import type { ApiNodeOutput, GridRow } from "../types/table.types";

const fakeApiOutput: ApiNodeOutput = {
	rows: [{ id: "1", name: "Alice" }],
};

describe("NodeContext", () => {
	it("set then get returns the same output", () => {
		const ctx = new NodeContext();
		ctx.set("node1", "api", fakeApiOutput);
		expect(ctx.get("node1", "api")).toBe(fakeApiOutput);
	});

	it("has() returns false for missing node", () => {
		expect(new NodeContext().has("missing")).toBe(false);
	});

	it("has() returns true after set", () => {
		const ctx = new NodeContext();
		ctx.set("n", "api", fakeApiOutput);
		expect(ctx.has("n")).toBe(true);
	});

	it("get() throws DAGExecutionError for missing node", () => {
		const ctx = new NodeContext();
		expect(() => ctx.get("missing", "api")).toThrow(DAGExecutionError);
	});

	it("get() error message includes the missing node id", () => {
		const ctx = new NodeContext();
		try {
			ctx.get("node-xyz", "api");
		} catch (e) {
			expect((e as DAGExecutionError).nodeId).toBe("node-xyz");
		}
	});

	it("withRow() clones context with row binding", () => {
		const ctx = new NodeContext();
		ctx.set("n", "api", fakeApiOutput);
		const row: GridRow = { id: "r1", title: "Part A" };
		const child = ctx.withRow(row);
		expect(child.getRow()).toBe(row);
		// parent unchanged
		expect(ctx.getRow()).toBeUndefined();
		// stored outputs are visible in child
		expect(child.get("n", "api")).toBe(fakeApiOutput);
	});

	it("withParams() clones context with params", () => {
		const ctx = new NodeContext();
		const child = ctx.withParams({ rootId: "ABC" });
		expect(child.getParams()).toEqual({ rootId: "ABC" });
		// parent unchanged
		expect(ctx.getParams()).toEqual({});
	});

	it("withParams() merges with existing params", () => {
		const ctx = new NodeContext().withParams({ a: "1" });
		const child = ctx.withParams({ b: "2" });
		expect(child.getParams()).toEqual({ a: "1", b: "2" });
	});

	it("getAll() returns a read-only map of all stored outputs", () => {
		const ctx = new NodeContext();
		ctx.set("n", "api", fakeApiOutput);
		const all = ctx.getAll();
		expect(all.size).toBe(1);
		expect(all.has("n")).toBe(true);
	});
});
