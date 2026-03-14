// src/components/data-grid/table-engine/index.ts
// Public API barrel — import from here, not from internal paths

export { BearerAuthAdapter } from "./adapters/bearer-auth-adapter";
export { NoAuthAdapter } from "./adapters/no-auth-adapter";
// ── Auth adapters (for custom engine setups) ──────────────────────────────────
export { WAFDataAuthAdapter } from "./adapters/wafdata-auth-adapter";
// ── Engine factory ────────────────────────────────────────────────────────────
export { createDefaultEngine } from "./bootstrap";
export type { ConfiguredTableProps } from "./configured-table";
// ── Components ────────────────────────────────────────────────────────────────
export { ConfiguredTable } from "./configured-table";
export { AuthAdapterRegistry } from "./core/auth-registry";
// ── Core classes (for custom engine setups) ───────────────────────────────────
export { DAGEngine } from "./core/dag-engine";
export { DAGExecutionError, DAGValidationError } from "./core/dag-validator";
export { NodeContext } from "./core/node-context";
export type { INodeExecutor } from "./core/node-registry";
export { NodeRegistry } from "./core/node-registry";
// ── Hook ──────────────────────────────────────────────────────────────────────
export { useDAGTable } from "./hooks/use-dag-table";
export type { IAuthAdapter } from "./types/auth.types";
export type {
	DAGConfig,
	DAGEdge,
	DAGNode,
	JsonataExpr,
	JsonPrimitive,
	JsonValue,
	NodeConfigMap,
	NodeOutputMap,
	NodeType,
} from "./types/dag.types";
// ── Types ─────────────────────────────────────────────────────────────────────
export type {
	ActionDef,
	ActionNodeConfig,
	ApiNodeConfig,
	ColumnDef,
	ColumnNodeConfig,
	DAGFeaturesConfig,
	DAGTableConfig,
	DAGTableResult,
	GridColumnDef,
	GridRow,
	MergeNodeConfig,
	RowExpandNodeConfig,
	TransformNodeConfig,
} from "./types/table.types";
