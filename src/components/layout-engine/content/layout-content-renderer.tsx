// src/components/layout-engine/content/layout-content-renderer.tsx
import { Empty, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { getConfig } from "@/components/tab-engine/core/tab-config-registry";
import { ConfiguredTable } from "@/components/data-grid/table-engine";
import { ConfiguredForm } from "@/components/form-engine";
import { ConfiguredTabs } from "@/components/tab-engine";
import type { DAGTableConfig } from "@/components/data-grid/table-engine/types/table.types";
import type { DAGFormConfig } from "@/components/form-engine/types/form.types";
import type { DAGTabConfig } from "@/components/tab-engine/types/tab.types";
import type {
	DAGLayoutConfig,
	LayoutContentConfig,
} from "../types/layout.types";
import { useLayoutContext } from "../core/layout-context";

interface LayoutContentRendererProps {
	content: LayoutContentConfig;
	/** Panel ID — used for toggling the detail panel from ConfiguredForm's ℹ icon */
	panelId?: string;
}

export function LayoutContentRenderer({
	content,
	panelId,
}: LayoutContentRendererProps) {
	const { params, togglePanel } = useLayoutContext();

	const config = getConfig(content.configPath);

	if (!config) {
		return (
			<Empty>
				<EmptyTitle>Content not available</EmptyTitle>
				<EmptyDescription>
					"{content.configPath}" not registered.
				</EmptyDescription>
			</Empty>
		);
	}

	switch (content.type) {
		case "table":
			return (
				<ConfiguredTable
					config={config as DAGTableConfig}
					params={params}
					className="h-full"
				/>
			);

		case "form":
			return (
				<ConfiguredForm
					config={config as DAGFormConfig}
					params={params}
					panelOnly={true}
					onToggleDetail={panelId ? () => togglePanel(panelId) : undefined}
				/>
			);

		case "tabs":
			return (
				<ConfiguredTabs
					config={config as DAGTabConfig}
					params={params}
					className="h-full"
				/>
			);

		case "layout": {
			// Lazy import to avoid circular dependency
			const { LayoutEngine } = require("../layout-engine");
			return (
				<LayoutEngine config={config as DAGLayoutConfig} params={params} />
			);
		}

		default:
			return (
				<Empty>
					<EmptyTitle>Unknown content type</EmptyTitle>
					<EmptyDescription>"{content.type}"</EmptyDescription>
				</Empty>
			);
	}
}
