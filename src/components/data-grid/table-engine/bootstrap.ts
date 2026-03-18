// src/components/data-grid/table-engine/bootstrap.ts

import { BearerAuthAdapter } from "./adapters/bearer-auth-adapter";
import { NoAuthAdapter } from "./adapters/no-auth-adapter";
import { WAFDataAuthAdapter } from "./adapters/wafdata-auth-adapter";
import { AuthAdapterRegistry } from "./core/auth-registry";
import { DAGEngine } from "./core/dag-engine";
import { NodeRegistry } from "./core/node-registry";
import { ActionNodeExecutor } from "./nodes/action-node";
import { ApiNodeExecutor } from "./nodes/api-node";
import { ColumnNodeExecutor } from "./nodes/column-node";
import { MergeNodeExecutor } from "./nodes/merge-node";
import { ColumnHydrateNodeExecutor } from "./nodes/column-hydrate-node";
import { RowEnrichNodeExecutor } from "./nodes/row-enrich-node";
import { RowExpandNodeExecutor } from "./nodes/row-expand-node";
import { TransformNodeExecutor } from "./nodes/transform-node";

export function createDefaultEngine(bearerToken?: string): DAGEngine {
	const auth = new AuthAdapterRegistry()
		.register("wafdata", new WAFDataAuthAdapter())
		.register("bearer", new BearerAuthAdapter(bearerToken ?? ""))
		.register("none", new NoAuthAdapter());

	const nodeReg = new NodeRegistry()
		.register("api", new ApiNodeExecutor(auth))
		.register("transform", new TransformNodeExecutor())
		.register("column", new ColumnNodeExecutor())
		.register("merge", new MergeNodeExecutor())
		.register("action", new ActionNodeExecutor());

	nodeReg.register("rowExpand", new RowExpandNodeExecutor(nodeReg));
	nodeReg.register("rowEnrich", new RowEnrichNodeExecutor());
	nodeReg.register("columnHydrate", new ColumnHydrateNodeExecutor());

	return new DAGEngine(nodeReg, auth);
}
