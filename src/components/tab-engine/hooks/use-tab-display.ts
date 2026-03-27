import { useEffect, useState } from "react";
import { evaluateExpr } from "@/components/data-grid/table-engine/jsonata-evaluator";
import { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import type { TabItemConfig } from "../types/tab.types";

export interface UseTabDisplayResult {
	visibleTabs: TabItemConfig[];
	activeTabId: string;
}

export function useTabDisplay(
	tabs: TabItemConfig[],
	params: Record<string, JsonPrimitive>,
	defaultTabId?: string,
): UseTabDisplayResult {
	const [visibleTabs, setVisibleTabs] = useState<TabItemConfig[]>([]);

	useEffect(() => {
		let cancelled = false;

		async function evaluate() {
			const ctx = new NodeContext(new Map(), undefined, params);
			const results: TabItemConfig[] = [];

			for (const tab of tabs) {
				if (!tab.displayExpression) {
					results.push(tab);
					continue;
				}
				try {
					const visible = await evaluateExpr<boolean>(
						tab.displayExpression,
						ctx,
						{},
						{ tab: { id: tab.id, label: tab.label } },
					);
					if (visible) results.push(tab);
				} catch {
					results.push(tab);
				}
			}

			if (!cancelled) setVisibleTabs(results);
		}

		void evaluate();
		return () => {
			cancelled = true;
		};
	}, [tabs, JSON.stringify(params)]);

	const firstVisible = visibleTabs.find((t) => !t.disabled);
	const requestedTab = defaultTabId
		? visibleTabs.find((t) => t.id === defaultTabId && !t.disabled)
		: undefined;
	const activeTabId = (requestedTab ?? firstVisible)?.id ?? "";

	return { visibleTabs, activeTabId };
}
