// src/components/tab-engine/bootstrap.ts
// Called from src/main.tsx AFTER bootstrapFormEngine().
// Registers built-in tab content types: "table", "form", "tabs".

import { tabContentRegistry } from "./core/tab-content-registry";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import type { DAGTableConfig } from "@/components/data-grid/table-engine";
import { ConfiguredTable } from "@/components/data-grid/table-engine";
import type { DAGFormConfig } from "@/components/form-engine";
import { ConfiguredForm } from "@/components/form-engine";
import { createElement } from "react";

let bootstrapped = false;

export function bootstrapTabEngine(): void {
	if (bootstrapped) return;

	tabContentRegistry
		.register({
			type: "table",
			render: (config: unknown, params: Record<string, JsonPrimitive>) => {
				return createElement(ConfiguredTable, {
					config: config as DAGTableConfig,
					params,
				});
			},
		})
		.register({
			type: "form",
			render: (config: unknown, params: Record<string, JsonPrimitive>) => {
				return createElement(ConfiguredForm, {
					config: config as DAGFormConfig,
					params,
				});
			},
		})
		.register({
			type: "tabs",
			render: (config: unknown, params: Record<string, JsonPrimitive>) => {
				// Resolved lazily to avoid self-reference at module load time
				const { ConfiguredTabs } = require("./configured-tabs");
				return createElement(ConfiguredTabs, { config, params });
			},
		});

	bootstrapped = true;
}
