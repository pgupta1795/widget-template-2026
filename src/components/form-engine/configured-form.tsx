// src/components/form-engine/configured-form.tsx
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import { useDAGForm } from "./hooks/use-dag-form";
import { HeaderFormRenderer } from "./components/header-form-renderer";
import { DetailPanelRenderer } from "./components/detail-panel-renderer";
import type { DAGFormConfig } from "./types/form.types";

export interface ConfiguredFormProps {
	config: DAGFormConfig;
	/** Injected by Layout Engine or feature route — the dropped/selected object context */
	params?: Record<string, JsonPrimitive>;
	/** Called when the ℹ icon is clicked — Layout Engine handles actual panel toggle */
	onToggleDetail?: () => void;
	/** Show only the DetailPanel (when ConfiguredForm is embedded in a sidebar panel) */
	panelOnly?: boolean;
}

export function ConfiguredForm({
	config,
	params = {},
	onToggleDetail,
	panelOnly = false,
}: ConfiguredFormProps) {
	const headerNode = config.dag.nodes.find((n) => n.type === "headerForm");
	const {
		headerData,
		sections,
		detailConfig,
		isLoading,
		error,
		isEditing,
		isSaving,
		setFieldValue,
		save,
		toggleEditMode,
		isCollapsed,
		toggleCollapsed,
	} = useDAGForm(config, params);

	const skeletonRows = detailConfig?.config.skeletonRows ?? 6;
	const showInfoIcon = headerNode
		? (headerNode.config as import("./types/form.types").HeaderFormNodeConfig)
				.infoIconTogglesDetailPanel
		: false;

	return (
		<div className="flex h-full flex-col">
			{!panelOnly && headerNode && (
				<HeaderFormRenderer
					data={headerData}
					isLoading={isLoading}
					isCollapsed={isCollapsed}
					onToggleCollapsed={toggleCollapsed}
					onToggleDetail={showInfoIcon ? onToggleDetail : undefined}
					showInfoIcon={Boolean(showInfoIcon)}
				/>
			)}
			<div className="flex-1 overflow-hidden">
				<DetailPanelRenderer
					sections={sections}
					detailConfig={detailConfig}
					isLoading={isLoading}
					isEditing={isEditing}
					isSaving={isSaving}
					skeletonRows={skeletonRows}
					onChange={setFieldValue}
					onToggleEdit={toggleEditMode}
					onSave={save}
					onClose={onToggleDetail}
				/>
			</div>
		</div>
	);
}
