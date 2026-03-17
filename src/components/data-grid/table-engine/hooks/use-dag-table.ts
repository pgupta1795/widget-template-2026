// src/components/data-grid/table-engine/hooks/use-dag-table.ts

import {
	useInfiniteQuery,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import { useCallback, useMemo, useRef, useState } from "react";
import type { DAGEngine } from "../core/dag-engine";
import type {
	DAGExecutionError,
	DAGValidationError,
} from "../core/dag-validator";
import { NodeContext } from "../core/node-context";
import { ApiNodeExecutor } from "../nodes/api-node";
import type { JsonPrimitive } from "../types/dag.types";
import type {
	ColumnNodeOutput,
	DAGTableConfig,
	DAGTableResult,
	GridRow,
} from "../types/table.types";

/**
 * Primary React hook for the DAG table engine.
 *
 * Strategy per mode:
 *  flat/tree  — useQuery; single engine.execute(); returns all rows
 *  paginated  — useQuery with pageIndex state; re-executes on page change
 *  infinite   — useInfiniteQuery; paginationConfig.nextPage drives cursor
 */
export function useDAGTable(
	config: DAGTableConfig,
	engine: DAGEngine,
	params: Record<string, JsonPrimitive> = {},
): DAGTableResult {
	const { tableId, mode, dag } = config;
	const [pageIndex, setPageIndex] = useState(0);
	const pageSize = 50;

	// Store the last NodeContext so onAction can access action output and row data
	const ctxRef = useRef<NodeContext | null>(null);

	// ── Flat / Paginated / Tree ──────────────────────────────────────────────
	const flatQuery = useQuery({
		queryKey: [tableId, mode, pageIndex, JSON.stringify(params)],
		queryFn: async () => {
			const initialParams: Record<string, JsonPrimitive> =
				mode === "paginated"
					? {
							...params,
							pageIndex: String(pageIndex),
							pageSize: String(pageSize),
						}
					: { ...params };

			// withParams creates a new NodeContext — use that as the mutable ctx
			const ctx = new NodeContext().withParams(initialParams);

			// Execute engine — mutates ctx in-place via context.set() calls
			await engine.execute(dag, "column", ctx);
			ctxRef.current = ctx;

			// Extract rows from first api-type node that appears in edges
			const edgeNodeIds = new Set(dag.edges.flatMap((e) => [e.from, e.to]));
			const apiNode = dag.nodes.find(
				(n) => n.type === "api" && edgeNodeIds.has(n.id),
			);
			const rows: GridRow[] =
				apiNode && ctx.has(apiNode.id) ? ctx.get(apiNode.id, "api").rows : [];

			const colOutput: ColumnNodeOutput = ctx.has(dag.rootNodeId)
				? ctx.get(dag.rootNodeId, "column")
				: { columns: [], visibility: {} };

			// Store context for expand handler
			return { rows, colOutput, ctx };
		},
		enabled: mode === "flat" || mode === "paginated" || mode === "tree",
		staleTime: 0,
	});

	// ── Infinite ─────────────────────────────────────────────────────────────
	const infiniteQuery = useInfiniteQuery({
		queryKey: [tableId, "infinite", JSON.stringify(params)],
		queryFn: async ({ pageParam }: { pageParam: string | null }) => {
			const ctxParams = pageParam ? { ...params, cursor: pageParam } : { ...params };
			const ctx = new NodeContext().withParams(ctxParams);
			await engine.execute(dag, "column", ctx);

			const edgeNodeIds = new Set(dag.edges.flatMap((e) => [e.from, e.to]));
			const apiNode = dag.nodes.find(
				(n) => n.type === "api" && edgeNodeIds.has(n.id),
			);
			const rows: GridRow[] =
				apiNode && ctx.has(apiNode.id) ? ctx.get(apiNode.id, "api").rows : [];
			const apiOutput =
				apiNode && ctx.has(apiNode.id) ? ctx.get(apiNode.id, "api") : undefined;

			const colOutput: ColumnNodeOutput = ctx.has(dag.rootNodeId)
				? ctx.get(dag.rootNodeId, "column")
				: { columns: [], visibility: {} };

			return { rows, nextPage: apiOutput?.nextPage ?? null, colOutput };
		},
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage: { nextPage: string | null }) =>
			lastPage.nextPage ?? null,
		enabled: mode === "infinite",
	});

	// ── Derive final values ───────────────────────────────────────────────────

	const isLoading =
		mode === "infinite" ? infiniteQuery.isLoading : flatQuery.isLoading;

	const isFetchingNextPage =
		mode === "infinite" ? infiniteQuery.isFetchingNextPage : false;

	const error = (mode === "infinite" ? infiniteQuery.error : flatQuery.error) as
		| DAGExecutionError
		| DAGValidationError
		| null;

	const finalRows: GridRow[] = useMemo(() => {
		if (mode === "infinite") {
			return infiniteQuery.data?.pages.flatMap((p) => p.rows) ?? [];
		}
		return flatQuery.data?.rows ?? [];
	}, [mode, flatQuery.data, infiniteQuery.data]);

	const finalColOutput: ColumnNodeOutput = useMemo(() => {
		if (mode === "infinite") {
			return (
				infiniteQuery.data?.pages[0]?.colOutput ?? {
					columns: [],
					visibility: {},
				}
			);
		}
		return flatQuery.data?.colOutput ?? { columns: [], visibility: {} };
	}, [mode, flatQuery.data, infiniteQuery.data]);

	// ── RowExpand handler ─────────────────────────────────────────────────────

	const onExpand = useMemo<DAGTableResult["onExpand"]>(() => {
		if (mode !== "tree") return undefined;
		// Derive inside memo so dag reference changes recompute correctly
		const rowExpandNodeId = dag.nodes.find((n) => n.type === "rowExpand")?.id;
		if (!rowExpandNodeId) return undefined;
		const storedCtx = flatQuery.data?.ctx;
		if (!storedCtx) return undefined;
		if (!storedCtx.has(rowExpandNodeId)) return undefined;

		const expandOutput = storedCtx.get(rowExpandNodeId, "rowExpand");
		return expandOutput.expandHandler;
	}, [dag.nodes, mode, flatQuery.data]);

	// ── executeNode handler ──────────────────────────────────────────────────
	const queryClient = useQueryClient();

	const executeNode = useCallback(
		async (nodeId: string) => {
			const ctx = ctxRef.current;
			if (!ctx) return;

			// Find the lazy ApiNode by nodeId
			const lazyApiNode = config.dag.nodes.find(
				(n) => n.id === nodeId && n.type === "api",
			);
			if (!lazyApiNode) return;

			// Execute the lazy ApiNode without row context
			const apiExecutor = new ApiNodeExecutor(engine.getAuthRegistry());
			await apiExecutor.execute(
				lazyApiNode.config as import("../types/table.types").ApiNodeConfig,
				ctx,
				config.dag.nodes,
			);

			// Invalidate query cache to trigger re-fetch
			await queryClient.invalidateQueries({ queryKey: [config.tableId] });
		},
		[config, engine, queryClient],
	);

	// ── onAction handler ─────────────────────────────────────────────────────

	const onAction = useCallback(
		async (actionId: string, row?: GridRow) => {
			const ctx = ctxRef.current;
			if (!ctx) return;

			// 1. Find ActionNode in DAG to locate the ActionDef
			const actionNode = config.dag.nodes.find((n) => n.type === "action");
			if (!actionNode || !ctx.has(actionNode.id)) return;

			const actionOutput = ctx.get(actionNode.id, "action");
			const allActions = [
				...actionOutput.rowActions,
				...actionOutput.cellActions,
			];
			const actionDef = allActions.find((a) => a.id === actionId);
			if (!actionDef) return;

			// 2. Look up lazy ApiNode by actionDef.apiNodeId
			const lazyApiNode = config.dag.nodes.find(
				(n) => n.id === actionDef.apiNodeId && n.type === "api",
			);
			if (!lazyApiNode) return;

			// 3. Execute the lazy ApiNode with row context
			const rowCtx = row ? ctx.withRow(row) : ctx;
			const apiExecutor = new ApiNodeExecutor(engine.getAuthRegistry());
			await apiExecutor.execute(
				lazyApiNode.config as import("../types/table.types").ApiNodeConfig,
				rowCtx,
				config.dag.nodes,
			);

			// 4. Invalidate query cache to trigger re-fetch
			await queryClient.invalidateQueries({ queryKey: [config.tableId] });
		},
		[config, engine, queryClient],
	);

	// ── Pagination ────────────────────────────────────────────────────────────

	const pagination =
		mode === "paginated"
			? {
					pageIndex,
					pageCount: Math.max(
						1,
						Math.ceil((finalRows.length || pageSize) / pageSize),
					),
					onPageChange: setPageIndex,
					pageSize,
				}
			: undefined;

	return {
		data: finalRows,
		columns: finalColOutput.columns,
		columnVisibility: finalColOutput.visibility,
		isLoading,
		isFetchingNextPage,
		error,
		pagination,
		hasNextPage: mode === "infinite" ? infiniteQuery.hasNextPage : undefined,
		fetchNextPage:
			mode === "infinite" ? infiniteQuery.fetchNextPage : undefined,
		onExpand,
		onAction,
		executeNode,
	};
}
