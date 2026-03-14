import { describe, expect, it } from "vitest";
import { NodeContext } from "../core/node-context";
import { evaluateDepthRule, evaluateExpr } from "../jsonata-evaluator";

describe("evaluateExpr", () => {
	it("evaluates a simple arithmetic expression against inputDoc", async () => {
		const ctx = new NodeContext();
		const result = await evaluateExpr<number>("value * 2", ctx, { value: 5 });
		expect(result).toBe(10);
	});

	it("binds $params from NodeContext", async () => {
		const ctx = new NodeContext().withParams({ rootId: "X42" });
		const result = await evaluateExpr<string>("$params.rootId", ctx, {});
		expect(result).toBe("X42");
	});

	it("binds $row from NodeContext", async () => {
		const ctx = new NodeContext().withRow({ id: "r1", title: "Part A" });
		const result = await evaluateExpr<string>("$row.title", ctx, {});
		expect(result).toBe("Part A");
	});

	it("returns undefined for empty string expression", async () => {
		const ctx = new NodeContext();
		expect(await evaluateExpr<undefined>("", ctx, {})).toBeUndefined();
	});

	it("returns undefined for whitespace-only expression", async () => {
		const ctx = new NodeContext();
		expect(await evaluateExpr<undefined>("   ", ctx, {})).toBeUndefined();
	});

	it("throws a descriptive error for invalid JSONata syntax", async () => {
		const ctx = new NodeContext();
		await expect(evaluateExpr("!!!", ctx, {})).rejects.toThrow(
			"JSONata expression failed",
		);
	});

	it("evaluates an array transform on inputDoc array", async () => {
		const ctx = new NodeContext();
		const input = [
			{ id: "1", qty: 2, price: 5 },
			{ id: "2", qty: 1, price: 10 },
		];
		const result = await evaluateExpr<{ id: string; total: number }[]>(
			'$.{"id": id, "total": qty * price}',
			ctx,
			input,
		);
		// JSON round-trip strips JSONata JSequence internal properties before comparing
		expect(JSON.parse(JSON.stringify(result))).toEqual([
			{ id: "1", total: 10 },
			{ id: "2", total: 10 },
		]);
	});

	it("builds a dynamic URL string using & operator", async () => {
		const ctx = new NodeContext().withParams({ parentId: "P99" });
		const result = await evaluateExpr<string>(
			'"/resources/v1/item/" & $params.parentId & "/children"',
			ctx,
			{},
		);
		expect(result).toBe("/resources/v1/item/P99/children");
	});
});

describe("evaluateDepthRule", () => {
	it("{ depths: [1,2] } matches depth 1", () => {
		expect(evaluateDepthRule({ depths: [1, 2] }, 1)).toBe(true);
	});

	it("{ depths: [1,2] } does not match depth 3", () => {
		expect(evaluateDepthRule({ depths: [1, 2] }, 3)).toBe(false);
	});

	it("{ minDepth: 2 } matches depth 3", () => {
		expect(evaluateDepthRule({ minDepth: 2 }, 3)).toBe(true);
	});

	it("{ minDepth: 2 } does not match depth 1", () => {
		expect(evaluateDepthRule({ minDepth: 2 }, 1)).toBe(false);
	});

	it("{ maxDepth: 2 } matches depth 2", () => {
		expect(evaluateDepthRule({ maxDepth: 2 }, 2)).toBe(true);
	});

	it("{ maxDepth: 2 } does not match depth 3", () => {
		expect(evaluateDepthRule({ maxDepth: 2 }, 3)).toBe(false);
	});
});
