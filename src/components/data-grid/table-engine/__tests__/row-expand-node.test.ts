// src/components/data-grid/table-engine/__tests__/row-expand-node.test.ts
import { describe, expect, it, vi } from "vitest";
import { AuthAdapterRegistry } from "../core/auth-registry";
import { DAGExecutionError } from "../core/dag-validator";
import { NodeContext } from "../core/node-context";
import { NodeRegistry } from "../core/node-registry";
import { ApiNodeExecutor } from "../nodes/api-node";
import { RowExpandNodeExecutor } from "../nodes/row-expand-node";
import type { DAGNode } from "../types/dag.types";
import type { GridRow, RowExpandNodeConfig } from "../types/table.types";

const childRows: GridRow[] = [{ id: "c1" }, { id: "c2" }];

function makeSetup() {
	const auth = new AuthAdapterRegistry();
	auth.register("test", {
		name: "test",
		request: vi.fn().mockResolvedValue({
			data: childRows,
			status: 200,
			statusText: "OK",
			headers: {},
			time: 0,
			size: 0,
		}),
	});
	const nodeReg = new NodeRegistry();
	nodeReg.register("api", new ApiNodeExecutor(auth));
	return { nodeReg };
}

const lazyNode: DAGNode = {
	id: "child-api",
	type: "api",
	config: { url: "/children", method: "GET", authAdapterId: "test" },
};

const lazyNodeWithParam: DAGNode = {
	id: "child-api",
	type: "api",
	config: {
		url: "/children",
		method: "GET",
		authAdapterId: "test",
		queryParams: { parentId: "$:$params.parentId" },
	},
};

const config: RowExpandNodeConfig = {
	triggerOnExpand: true,
	childApiNodeId: "child-api",
	childKeyExpr: "$:$row.id",
	childQueryParam: "parentId",
};

describe("RowExpandNodeExecutor", () => {
	it("returns an object with an expandHandler function", async () => {
		const { nodeReg } = makeSetup();
		const executor = new RowExpandNodeExecutor(nodeReg);
		const result = await executor.execute(config, new NodeContext(), [
			lazyNode,
		]);
		expect(typeof result.expandHandler).toBe("function");
	});

	it("expandHandler calls the child ApiNode and returns its rows", async () => {
		const { nodeReg } = makeSetup();
		const executor = new RowExpandNodeExecutor(nodeReg);
		const result = await executor.execute(config, new NodeContext(), [
			lazyNode,
		]);
		const rows = await result.expandHandler({ id: "parent1" });
		expect(rows).toEqual(childRows);
	});

	it("expandHandler injects childKeyExpr value as childQueryParam into context", async () => {
		const auth = new AuthAdapterRegistry();
		const mockRequest = vi.fn().mockResolvedValue({
			data: [],
			status: 200,
			statusText: "OK",
			headers: {},
			time: 0,
			size: 0,
		});
		auth.register("test", { name: "test", request: mockRequest });
		const nodeReg = new NodeRegistry();
		nodeReg.register("api", new ApiNodeExecutor(auth));

		const executor = new RowExpandNodeExecutor(nodeReg);
		const result = await executor.execute(config, new NodeContext(), [
			lazyNodeWithParam,
		]);
		await result.expandHandler({ id: "PARENT_ID_XYZ" });

		// The queryParam 'parentId' should equal the row's id
		expect(mockRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				queryParams: expect.objectContaining({ parentId: "PARENT_ID_XYZ" }),
			}),
		);
	});

	it("expandHandler throws DAGExecutionError when childApiNodeId not in allNodes", async () => {
		const { nodeReg } = makeSetup();
		const executor = new RowExpandNodeExecutor(nodeReg);
		const result = await executor.execute(config, new NodeContext(), []); // empty allNodes
		await expect(result.expandHandler({ id: "p1" })).rejects.toThrow(
			DAGExecutionError,
		);
	});
});
