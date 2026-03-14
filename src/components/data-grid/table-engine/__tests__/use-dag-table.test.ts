// src/components/data-grid/table-engine/__tests__/use-dag-table.test.ts

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultEngine } from "../bootstrap";
import { useDAGTable } from "../hooks/use-dag-table";
import type { DAGTableConfig } from "../types/table.types";

vi.mock("@/services", () => ({
	httpClient: {
		execute: vi.fn(),
	},
}));

import { httpClient } from "@/services";

const mockExecute = vi.mocked(httpClient.execute);

function makeWrapper() {
	const qc = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return ({ children }: { children: React.ReactNode }) =>
		createElement(QueryClientProvider, { client: qc }, children);
}

const twoRowResponse = {
	data: [
		{ id: "1", name: "Alice" },
		{ id: "2", name: "Bob" },
	],
	status: 200,
	statusText: "OK",
	headers: {},
	time: 0,
	size: 0,
};

const flatConfig: DAGTableConfig = {
	tableId: "test-flat",
	mode: "flat",
	dag: {
		nodes: [
			{
				id: "api1",
				type: "api",
				config: { url: "/items", method: "GET", authAdapterId: "wafdata" },
			},
			{
				id: "cols",
				type: "column",
				config: {
					columns: [{ field: "name", header: "Name" }],
				},
			},
		],
		edges: [{ from: "api1", to: "cols" }],
		rootNodeId: "cols",
	},
};

describe("useDAGTable — flat mode", () => {
	beforeEach(() => {
		mockExecute.mockReset();
		mockExecute.mockResolvedValue(twoRowResponse);
	});

	it("starts in loading state and resolves to data", async () => {
		const engine = createDefaultEngine();
		const { result } = renderHook(() => useDAGTable(flatConfig, engine), {
			wrapper: makeWrapper(),
		});

		expect(result.current.isLoading).toBe(true);
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.data).toHaveLength(2);
	});

	it("error is null on successful fetch", async () => {
		const engine = createDefaultEngine();
		const { result } = renderHook(() => useDAGTable(flatConfig, engine), {
			wrapper: makeWrapper(),
		});
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.error).toBeNull();
	});

	it("columns are returned from ColumnNode output", async () => {
		const engine = createDefaultEngine();
		const { result } = renderHook(() => useDAGTable(flatConfig, engine), {
			wrapper: makeWrapper(),
		});
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.columns).toHaveLength(1);
	});

	it("isFetchingNextPage is false in flat mode", async () => {
		const engine = createDefaultEngine();
		const { result } = renderHook(() => useDAGTable(flatConfig, engine), {
			wrapper: makeWrapper(),
		});
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(result.current.isFetchingNextPage).toBe(false);
	});
});

describe("useDAGTable — tree mode", () => {
	beforeEach(() => {
		mockExecute.mockReset();
		mockExecute.mockResolvedValue(twoRowResponse);
	});

	it("exposes onExpand when a rowExpand node is present", async () => {
		const treeConfig: DAGTableConfig = {
			tableId: "test-tree",
			mode: "tree",
			dag: {
				nodes: [
					{
						id: "root-api",
						type: "api",
						config: { url: "/root", method: "GET", authAdapterId: "wafdata" },
					},
					{
						id: "expand",
						type: "rowExpand",
						config: {
							triggerOnExpand: true,
							childApiNodeId: "child-api",
							childKeyExpr: "$:$row.id",
							childQueryParam: "parentId",
						},
					},
					{
						id: "cols",
						type: "column",
						config: { columns: [{ field: "name", header: "Name" }] },
					},
					// Lazy node — not in edges
					{
						id: "child-api",
						type: "api",
						config: {
							url: "/children",
							method: "GET",
							authAdapterId: "wafdata",
						},
					},
				],
				edges: [
					{ from: "root-api", to: "expand" },
					{ from: "expand", to: "cols" },
				],
				rootNodeId: "cols",
			},
		};

		const engine = createDefaultEngine();
		const { result } = renderHook(() => useDAGTable(treeConfig, engine), {
			wrapper: makeWrapper(),
		});
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(typeof result.current.onExpand).toBe("function");
	});
});

describe("useDAGTable — params injection", () => {
	beforeEach(() => {
		mockExecute.mockReset();
		mockExecute.mockResolvedValue(twoRowResponse);
	});

	it("injects params into NodeContext so $params.* resolves in API URL", async () => {
		const paramConfig: DAGTableConfig = {
			tableId: "test-params",
			mode: "flat",
			dag: {
				nodes: [
					{
						id: "api1",
						type: "api",
						config: {
							url: '$:"/items/" & $params.rootId',
							method: "GET",
							authAdapterId: "wafdata",
						},
					},
					{
						id: "cols",
						type: "column",
						config: { columns: [{ field: "id", header: "ID" }] },
					},
				],
				edges: [{ from: "api1", to: "cols" }],
				rootNodeId: "cols",
			},
		};
		mockExecute.mockResolvedValue(twoRowResponse);
		const engine = createDefaultEngine();
		const { result } = renderHook(
			() => useDAGTable(paramConfig, engine, { rootId: "ABC" }),
			{ wrapper: makeWrapper() },
		);
		await waitFor(() => expect(result.current.isLoading).toBe(false));
		expect(mockExecute).toHaveBeenCalledWith(
			"GET",
			"/items/ABC",
			expect.objectContaining({ responseType: "json" }),
		);
	});
});
