// src/components/data-grid/table-engine/hooks/use-dag-table.ts

import {
	useInfiniteQuery,
	useQueries,
	useQuery,
	useQueryClient,
} from "@tanstack/react-query";
import {useCallback,useEffect,useMemo,useRef,useState} from "react";
import type {DAGEngine} from "../core/dag-engine";
import type {
	DAGExecutionError,
	DAGValidationError,
} from "../core/dag-validator";
import {NodeContext} from "../core/node-context";
import {evaluateExpr} from "../jsonata-evaluator";
import {ApiNodeExecutor} from "../nodes/api-node";
import type {JsonPrimitive} from "../types/dag.types";
import type {
	ApiNodeConfig,
	ColumnHydrateNodeOutput,
	ColumnNodeOutput,
	DAGTableConfig,
	DAGTableResult,
	GridRow,
	RowEnrichNodeOutput,
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

	// ── Static node lookups (derived from config — stable between renders) ───────
	const rowEnrichNode = dag.nodes.find((n) => n.type === "rowEnrich") as
		| {
				id: string;
				type: "rowEnrich";
				config: import("../types/table.types").RowEnrichNodeConfig;
		  }
		| undefined;
	const colHydrateNode = dag.nodes.find((n) => n.type === "columnHydrate") as
		| {
				id: string;
				type: "columnHydrate";
				config: import("../types/table.types").ColumnHydrateNodeConfig;
		  }
		| undefined;

	// Lazy-gate state — initialised from static DAG config, never from async data.
	// rowEnrich: starts enabled unless config.lazy === true.
	const [enrichEnabled, setEnrichEnabled] = useState(
		() => !rowEnrichNode?.config.lazy,
	);
	// columnHydrate: per-column gate; starts enabled unless column.lazy === true.
	const [hydrateEnabledCols, setHydrateEnabledCols] = useState<
		Record<string, boolean>
	>(() =>
		Object.fromEntries(
			(colHydrateNode?.config.columns ?? []).map((col) => [
				col.columnId,
				!col.lazy,
			]),
		),
	);

	// One-shot refs to guard invalidateQueryKeys effects from firing more than once.
	const enrichInvalidatedRef = useRef(false);
	const hydrateInvalidatedRef = useRef<Set<string>>(new Set());

	const [pageIndex, setPageIndex] = useState(0);
	const pageSize = 50;

	// Store the last NodeContext so onAction can access action output and row data
	const ctxRef = useRef<NodeContext | null>(null);

	const queryClient = useQueryClient();

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

			// Extract rowEnrich and columnHydrate outputs if their nodes were executed
			const rowEnrichNodeId = dag.nodes.find((n) => n.type === "rowEnrich")?.id;
			const rowEnrichOutput: RowEnrichNodeOutput | undefined =
				rowEnrichNodeId && ctx.has(rowEnrichNodeId)
					? ctx.get(rowEnrichNodeId, "rowEnrich")
					: undefined;

			const colHydrateNodeId = dag.nodes.find(
				(n) => n.type === "columnHydrate",
			)?.id;
			const colHydrateOutput: ColumnHydrateNodeOutput | undefined =
				colHydrateNodeId && ctx.has(colHydrateNodeId)
					? ctx.get(colHydrateNodeId, "columnHydrate")
					: undefined;

			// Store context for expand handler
			return { rows, colOutput, ctx, rowEnrichOutput, colHydrateOutput };
		},
		enabled: mode === "flat" || mode === "paginated" || mode === "tree",
		staleTime: 0,
	});

	// ── Infinite ─────────────────────────────────────────────────────────────
	const infiniteQuery = useInfiniteQuery({
		queryKey: [tableId, "infinite", JSON.stringify(params)],
		queryFn: async ({ pageParam }: { pageParam: string | null }) => {
			const ctxParams = pageParam
				? { ...params, cursor: pageParam }
				: { ...params };
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

			// Store context so enrichment queryFns can build row-scoped contexts.
			ctxRef.current = ctx;

			// Extract rowEnrich / columnHydrate outputs from this page's DAG execution.
			const rowEnrichNodeIdInf = dag.nodes.find((n) => n.type === 'rowEnrich')?.id;
			const pageRowEnrichOutput: RowEnrichNodeOutput | undefined =
				rowEnrichNodeIdInf && ctx.has(rowEnrichNodeIdInf)
					? ctx.get(rowEnrichNodeIdInf, 'rowEnrich')
					: undefined;

			const colHydrateNodeIdInf = dag.nodes.find(
				(n) => n.type === 'columnHydrate',
			)?.id;
			const pageColHydrateOutput: ColumnHydrateNodeOutput | undefined =
				colHydrateNodeIdInf && ctx.has(colHydrateNodeIdInf)
					? ctx.get(colHydrateNodeIdInf, 'columnHydrate')
					: undefined;

			return {
				rows,
				nextPage: apiOutput?.nextPage ?? null,
				colOutput,
				rowEnrichOutput: pageRowEnrichOutput,
				colHydrateOutput: pageColHydrateOutput,
			};
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

	// ── rowEnrich useQueries ─────────────────────────────────────────────────────

	// Aggregate rowEnrich output across pages in infinite mode; use flat otherwise.
	const rowEnrichOutput: RowEnrichNodeOutput | undefined = useMemo(() => {
		if (mode === 'infinite') {
			const pages = infiniteQuery.data?.pages ?? [];
			const allDescriptors = pages.flatMap(
				(p) => p.rowEnrichOutput?.descriptors ?? [],
			);
			if (allDescriptors.length === 0) return undefined;
			const seed = pages.find((p) => p.rowEnrichOutput)?.rowEnrichOutput;
			if (!seed) return undefined;
			return { ...seed, descriptors: allDescriptors };
		}
		return flatQuery.data?.rowEnrichOutput;
	}, [mode, infiniteQuery.data, flatQuery.data]);

	// Has the base fetch completed for the active mode?
	const hasBaseData = mode === 'infinite' ? !!infiniteQuery.data : !!flatQuery.data;

	const enrichDescriptors = rowEnrichOutput?.descriptors ?? [];
	const enrichChildApiNodeId = rowEnrichOutput?.childApiNodeId ?? '';
	const enrichRowKeyField = rowEnrichOutput?.rowKeyField ?? 'id';
	const enrichMergeTransform = rowEnrichOutput?.mergeTransform;
	const enrichInvalidateKeys = rowEnrichOutput?.invalidateQueryKeys;

	const enrichQueries = useQueries({
		queries: enrichDescriptors.map((desc) => ({
			queryKey: [tableId, "rowEnrich", desc.rowKey, enrichChildApiNodeId],
			queryFn: async (): Promise<GridRow> => {
				const childApiNode = dag.nodes.find(
					(n) => n.id === enrichChildApiNodeId && n.type === "api",
				);
				if (!childApiNode || !ctxRef.current) return desc.rowData;

				const rowCtx = ctxRef.current.withRow(desc.rowData);
				const apiExecutor = new ApiNodeExecutor(engine.getAuthRegistry());
				const result = await apiExecutor.execute(
					childApiNode.config as ApiNodeConfig,
					rowCtx,
					dag.nodes,
				);

				const firstRow = result.rows[0] ?? {};
				if (enrichMergeTransform) {
					const merged = await evaluateExpr<GridRow>(
						enrichMergeTransform,
						rowCtx,
						firstRow,
					) as GridRow;
					return merged;
				}
				return firstRow;
			},
			enabled: enrichEnabled && hasBaseData && !!enrichChildApiNodeId,
		})),
	});

	// ── columnHydrate useQueries ─────────────────────────────────────────────────

	// Aggregate colHydrate output across pages in infinite mode; use flat otherwise.
	const colHydrateOutput: ColumnHydrateNodeOutput | undefined = useMemo(() => {
		if (mode === 'infinite') {
			const pages = infiniteQuery.data?.pages ?? [];
			const allDescriptors = pages.flatMap(
				(p) => p.colHydrateOutput?.descriptors ?? [],
			);
			if (allDescriptors.length === 0) return undefined;
			const seed = pages.find((p) => p.colHydrateOutput)?.colHydrateOutput;
			if (!seed) return undefined;
			return { ...seed, descriptors: allDescriptors };
		}
		return flatQuery.data?.colHydrateOutput;
	}, [mode, infiniteQuery.data, flatQuery.data]);
	const hydrateDescriptors = colHydrateOutput?.descriptors ?? [];
	const hydrateColumnEntries = colHydrateOutput?.columnEntries ?? [];
	const hydrateRowKeyField = colHydrateOutput?.rowKeyField ?? 'id';

	const hydrateQueries = useQueries({
		queries: hydrateDescriptors.map((desc) => {
			const entry = hydrateColumnEntries.find(
				(e) => e.columnId === desc.columnId,
			);
			return {
				queryKey: [tableId, "columnHydrate", desc.rowKey, desc.columnId],
				queryFn: async (): Promise<unknown> => {
					if (!entry || !ctxRef.current) return undefined;
					const childApiNode = dag.nodes.find(
						(n) => n.id === entry.childApiNodeId && n.type === "api",
					);
					if (!childApiNode) return undefined;

					const rowCtx = ctxRef.current.withRow(desc.rowData);
					const apiExecutor = new ApiNodeExecutor(engine.getAuthRegistry());
					const result = await apiExecutor.execute(
						childApiNode.config as ApiNodeConfig,
						rowCtx,
						dag.nodes,
					);

					const firstRow = result.rows[0] ?? {};
					if (entry.mergeTransform) {
						return evaluateExpr<unknown>(
							entry.mergeTransform,
							rowCtx,
							firstRow,
						);
					}
					return firstRow;
				},
				enabled: !!(
					hydrateEnabledCols[desc.columnId] &&
					hasBaseData &&
					entry?.childApiNodeId
				),
			};
		}),
	});

	// ── Progressive merge chain ───────────────────────────────────────────────────

	// Fold enrichment results onto the root rows (progressive — updates per query)
	const enrichedRows = useMemo<GridRow[]>(() => {
		if (enrichDescriptors.length === 0) return finalRows;
		return finalRows.map((row) => {
			const rowKey = String(row[enrichRowKeyField] ?? "");
			const idx = enrichDescriptors.findIndex((d) => d.rowKey === rowKey);
			if (idx === -1 || enrichQueries[idx]?.status !== "success") return row;
			const patch = enrichQueries[idx].data;
			return patch ? { ...row, ...patch } : row;
		});
	}, [finalRows, enrichDescriptors, enrichQueries, enrichRowKeyField]);

	// Fold hydration results onto enriched rows — one key per descriptor
	const hydratedRows = useMemo<GridRow[]>(() => {
		if (hydrateDescriptors.length === 0) return enrichedRows;
		return enrichedRows.map((row) => {
			const rowKey = String(row[hydrateRowKeyField] ?? "");
			const matches = hydrateDescriptors
				.map((desc, i) => ({ desc, i }))
				.filter(({ desc }) => desc.rowKey === rowKey);
			if (matches.length === 0) return row;
			let merged: GridRow = { ...row };
			for (const { desc, i } of matches) {
				if (hydrateQueries[i]?.status === 'success') {
					const patch = hydrateQueries[i].data;
					if (patch !== null && patch !== undefined && typeof patch === 'object' && !Array.isArray(patch)) {
						merged = { ...merged, ...(patch as GridRow) };
					} else {
						merged = { ...merged, [desc.columnId]: patch };
					}
				}
			}
			return merged;
		});
	}, [enrichedRows, hydrateDescriptors, hydrateQueries, hydrateRowKeyField]);

	const isEnriching = enrichQueries.some((q) => q.isFetching);
	const isHydrating = hydrateQueries.some((q) => q.isFetching);

	// Reset one-shot invalidation guards whenever flatQuery produces a new batch.
	useEffect(() => {
		enrichInvalidatedRef.current = false;
		hydrateInvalidatedRef.current = new Set();
	}, [flatQuery.data]);

	// ── invalidateQueryKeys effects ──────────────────────────────────────────────

	// rowEnrich: invalidate once when ALL row-enrich queries succeed.
	const allEnrichSuccess =
		enrichQueries.length > 0 && enrichQueries.every((q) => q.isSuccess);
	useEffect(() => {
		if (!allEnrichSuccess || !enrichInvalidateKeys?.length) return;
		if (enrichInvalidatedRef.current) return;
		enrichInvalidatedRef.current = true;
		for (const key of enrichInvalidateKeys) {
			void queryClient.invalidateQueries({ queryKey: [key] });
		}
	}, [allEnrichSuccess, enrichInvalidateKeys, queryClient]);

	// columnHydrate: per-column — invalidate once when ALL queries for that column succeed.
	useEffect(() => {
		for (const entry of hydrateColumnEntries) {
			if (!entry.invalidateQueryKeys?.length) continue;
			if (hydrateInvalidatedRef.current.has(entry.columnId)) continue;
			const colIndices = hydrateDescriptors
				.map((desc, i) => ({ desc, i }))
				.filter(({ desc }) => desc.columnId === entry.columnId);
			const allColSuccess =
				colIndices.length > 0 &&
				colIndices.every(({ i }) => hydrateQueries[i]?.isSuccess);
			if (allColSuccess) {
				hydrateInvalidatedRef.current.add(entry.columnId);
				for (const key of entry.invalidateQueryKeys) {
					void queryClient.invalidateQueries({ queryKey: [key] });
				}
			}
		}
	}, [hydrateColumnEntries, hydrateDescriptors, hydrateQueries, queryClient]);

	// ── Lazy triggers ─────────────────────────────────────────────────────────────

	// Always call — never inside conditions.
	const triggerEnrichFn = useCallback(() => setEnrichEnabled(true), []);
	const triggerHydrateFn = useCallback(
		(columnId: string) =>
			setHydrateEnabledCols((prev) => ({ ...prev, [columnId]: true })),
		[],
	);

	// Only expose when the DAG actually has a lazy node of that type.
	const triggerEnrich = rowEnrichNode?.config.lazy
		? triggerEnrichFn
		: undefined;
	const triggerHydrate = colHydrateNode?.config.columns.some((c) => c.lazy)
		? triggerHydrateFn
		: undefined;

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
	const executeNode = useCallback(
		async (nodeId: string): Promise<GridRow[]> => {
			const ctx = ctxRef.current;
			if (!ctx) return [];

			// Find the lazy ApiNode by nodeId
			const lazyApiNode = config.dag.nodes.find(
				(n) => n.id === nodeId && n.type === "api",
			);
			if (!lazyApiNode) return [];

			// Execute the lazy ApiNode without row context
			const apiExecutor = new ApiNodeExecutor(engine.getAuthRegistry());
			const result = await apiExecutor.execute(
				lazyApiNode.config as import("../types/table.types").ApiNodeConfig,
				ctx,
				config.dag.nodes,
			);

			return result.rows;
		},
		[config, engine],
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
		},
		[config, engine],
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
		data: hydratedRows,
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
		isEnriching,
		isHydrating,
		triggerEnrich,
		triggerHydrate,
	};
}
