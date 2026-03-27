// src/components/layout-engine/layout-engine.tsx
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import { LayoutContextProvider } from "./core/layout-context";
import { SplitLayout } from "./layouts/split-layout";
import { StackLayout } from "./layouts/stack-layout";
import { SidebarLayout } from "./layouts/sidebar-layout";
import type { DAGLayoutConfig } from "./types/layout.types";

export interface LayoutEngineProps {
	config: DAGLayoutConfig;
	/** Initial params (e.g. from TanStack Router route params or dropped object) */
	params?: Record<string, JsonPrimitive>;
}

export function LayoutEngine({ config, params = {} }: LayoutEngineProps) {
	return (
		<LayoutContextProvider config={config} initialParams={params}>
			<LayoutEngineInner config={config} />
		</LayoutContextProvider>
	);
}

function LayoutEngineInner({ config }: { config: DAGLayoutConfig }) {
	switch (config.type) {
		case "split":
			return <SplitLayout config={config} />;
		case "stack":
			return <StackLayout config={config} />;
		case "sidebar":
			return <SidebarLayout config={config} />;
		default: {
			const _exhaustive: never = config;
			return null;
		}
	}
}
