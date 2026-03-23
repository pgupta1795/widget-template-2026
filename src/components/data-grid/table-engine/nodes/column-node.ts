import {
	booleanColumn,
	codeColumn,
	dateColumn,
	multiValueColumn,
	numberColumn,
	selectColumn,
	stringColumn,
} from "@/components/data-grid/columns";
import type {
	GridColumnDef,
	SelectOption,
} from "@/components/data-grid/types/column-types";
import type { NodeContext } from "../core/node-context";
import type { INodeExecutor } from "../core/node-registry";
import { evaluateDepthRule } from "../jsonata-evaluator";
import type { DAGNode } from "../types/dag.types";
import type {
	ColumnNodeConfig,
	ColumnNodeOutput,
	DepthRule,
	GridRow,
} from "../types/table.types";

// ── Factory registry (same types as old column-builder.ts) ────────────────────

type FactoryOpts = {
	accessorKey: string;
	header: string;
	editable?: boolean;
	options?: SelectOption[];
	meta?: Record<string, unknown>;
	[k: string]: unknown;
};

type ColFactory = (opts: FactoryOpts) => GridColumnDef;

const FACTORIES: Record<string, ColFactory> = {
	string: stringColumn as ColFactory,
	number: numberColumn as ColFactory,
	date: dateColumn as ColFactory,
	"multi-value": multiValueColumn as ColFactory,
	select: selectColumn as ColFactory,
	boolean: booleanColumn as ColFactory,
	code: codeColumn as ColFactory,
};

function getFactory(type: string | undefined): ColFactory {
	return FACTORIES[type ?? "string"] ?? FACTORIES["string"];
}

function buildEditableFn(rules: DepthRule[]) {
	return (_row: GridRow, depth: number) =>
		rules.some((rule) => evaluateDepthRule(rule, depth));
}

// ── Executor ──────────────────────────────────────────────────────────────────

export class ColumnNodeExecutor implements INodeExecutor<"column"> {
	async execute(
		config: ColumnNodeConfig,
		_context: NodeContext,
		_allNodes: DAGNode[],
	): Promise<ColumnNodeOutput> {
		const visibility: Record<string, boolean> = {};
		const columns: GridColumnDef<GridRow>[] = [];

		for (const def of config.columns) {
			// Track hidden columns for initial visibility state
			if (def.hidden === true) {
				visibility[def.field] = false;
			}

			// Resolve editability
			const isEditable =
				typeof def.editable === "boolean" ? def.editable : false;
			const editableFnMeta =
				Array.isArray(def.depthRules) && def.depthRules.length > 0
					? { editableFn: buildEditableFn(def.depthRules) }
					: {};

			const meta: Record<string, unknown> = {
				editable: isEditable,
				...editableFnMeta,
				...(def.pinned ? { pinned: def.pinned } : {}),
				...(def.selectOptions ? { options: def.selectOptions } : {}),
				...(def.renderType ? { renderType: def.renderType } : {}),
				...(def.classNameHeader
					? { classNameHeader: def.classNameHeader }
					: {}),
				...(def.classNameCell ? { classNameCell: def.classNameCell } : {}),
			};

			const factory = getFactory(def.type);
			let col = factory({
				accessorKey: def.field,
				header: def.header,
				editable: isEditable,
				meta,
				...(def.width !== undefined ? { width: def.width } : {}),
				...(def.selectOptions ? { options: def.selectOptions } : {}),
			}) as GridColumnDef<GridRow>;

			// Apply per-column feature overrides
			if (def.sortable === false) col = { ...col, enableSorting: false };
			if (def.filterable === false) col = { ...col, enableColumnFilter: false };

			columns.push(col);
		}

		return { columns, visibility };
	}
}
