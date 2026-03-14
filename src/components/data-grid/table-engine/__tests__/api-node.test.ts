// src/components/data-grid/table-engine/__tests__/api-node.test.ts
import { describe, expect, it, vi } from "vitest";
import { AuthAdapterRegistry } from "../core/auth-registry";
import { NodeContext } from "../core/node-context";
import { ApiNodeExecutor } from "../nodes/api-node";

function makeAuth(responseData: unknown = [{ id: "1" }]) {
	const registry = new AuthAdapterRegistry();
	const mockRequest = vi.fn().mockResolvedValue({
		data: responseData,
		status: 200,
		statusText: "OK",
		headers: {},
		time: 0,
		size: 0,
	});
	registry.register("test", { name: "test", request: mockRequest });
	return { registry, mockRequest };
}

describe("ApiNodeExecutor", () => {
	it("calls auth adapter and returns rows from array response", async () => {
		const { registry } = makeAuth([{ id: "1", name: "Alice" }]);
		const result = await new ApiNodeExecutor(registry).execute(
			{ url: "/items", method: "GET", authAdapterId: "test" },
			new NodeContext(),
			[],
		);
		expect(result.rows).toEqual([{ id: "1", name: "Alice" }]);
	});

	it("applies responseTransform JSONata on raw response", async () => {
		const { registry } = makeAuth({ items: [{ id: "2", val: "x" }] });
		const result = await new ApiNodeExecutor(registry).execute(
			{
				url: "/api",
				method: "GET",
				authAdapterId: "test",
				responseTransform: 'items.{"id": id, "value": val}',
			},
			new NodeContext(),
			[],
		);
		expect(result.rows).toEqual([{ id: "2", value: "x" }]);
	});

	it("evaluates JsonataExpr in url using $params from context", async () => {
		const { registry, mockRequest } = makeAuth([]);
		const ctx = new NodeContext().withParams({ rootId: "ABC" });
		await new ApiNodeExecutor(registry).execute(
			{
				url: '$:"/items/" & $params.rootId',
				method: "GET",
				authAdapterId: "test",
			},
			ctx,
			[],
		);
		expect(mockRequest).toHaveBeenCalledWith(
			expect.objectContaining({ url: "/items/ABC" }),
		);
	});

	it("evaluates JsonataExpr in queryParams", async () => {
		const { registry, mockRequest } = makeAuth([]);
		const ctx = new NodeContext().withParams({ pid: "P1" });
		await new ApiNodeExecutor(registry).execute(
			{
				url: "/api",
				method: "GET",
				authAdapterId: "test",
				queryParams: { parentId: "$:$params.pid" },
			},
			ctx,
			[],
		);
		expect(mockRequest).toHaveBeenCalledWith(
			expect.objectContaining({ queryParams: { parentId: "P1" } }),
		);
	});

	it("passes static body to auth adapter", async () => {
		const { registry, mockRequest } = makeAuth({});
		await new ApiNodeExecutor(registry).execute(
			{
				url: "/api",
				method: "POST",
				authAdapterId: "test",
				body: { comment: "test comment" },
			},
			new NodeContext(),
			[],
		);
		expect(mockRequest).toHaveBeenCalledWith(
			expect.objectContaining({ body: { comment: "test comment" } }),
		);
	});

	it("returns empty rows array when response is not an array and no transform", async () => {
		const { registry } = makeAuth({ notAnArray: true });
		const result = await new ApiNodeExecutor(registry).execute(
			{ url: "/api", method: "GET", authAdapterId: "test" },
			new NodeContext(),
			[],
		);
		expect(result.rows).toEqual([]);
	});

	it("computes nextPage when paginationConfig is offset and rows fills the page", async () => {
		const rows = Array.from({ length: 50 }, (_, i) => ({ id: String(i) }));
		const { registry } = makeAuth(rows);
		const ctx = new NodeContext().withParams({ cursor: "50" });
		const result = await new ApiNodeExecutor(registry).execute(
			{
				url: "/items",
				method: "GET",
				authAdapterId: "test",
				queryParams: { $top: "50", $skip: "$:$params.cursor" },
				paginationConfig: {
					type: "offset",
					pageParam: "$skip",
					pageSizeParam: "$top",
				},
			},
			ctx,
			[],
		);
		expect(result.nextPage).toBe("100");
	});

	it("returns nextPage null when rows count is less than page size", async () => {
		const rows = Array.from({ length: 30 }, (_, i) => ({ id: String(i) }));
		const { registry } = makeAuth(rows);
		const result = await new ApiNodeExecutor(registry).execute(
			{
				url: "/items",
				method: "GET",
				authAdapterId: "test",
				queryParams: { $top: "50", $skip: "0" },
				paginationConfig: {
					type: "offset",
					pageParam: "$skip",
					pageSizeParam: "$top",
				},
			},
			new NodeContext(),
			[],
		);
		expect(result.nextPage).toBeNull();
	});
});
