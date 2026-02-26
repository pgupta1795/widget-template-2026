import { useCallback, useState } from "react";
import { DropZone } from "@/features/drop-zone/drop-zone";
import type { DroppedObject } from "@/features/drop-zone/use-object-drop";
import { ObjectHeader } from "@/features/object-header/object-header";
import { SidePanel } from "@/features/side-panel/side-panel";
import { Sidebar } from "@/features/sidebar/sidebar";
import { TabManager } from "@/features/tab-manager/tab-manager";
import type {
	CommandDefinition,
	PanelConfig,
	WidgetConfig,
} from "@/types/config";
import { TabContentRenderer } from "./tab-content-renderer";

type WidgetShellProps = {
	config: WidgetConfig;
};

export function WidgetShell({ config }: WidgetShellProps) {
	const [objectId, setObjectId] = useState<string | null>(null);
	const [activeView, setActiveView] = useState<string>(
		config.sidebar?.sections[0]?.items[0]?.view ?? "recents",
	);
	const [panelConfig, setPanelConfig] = useState<PanelConfig | null>(null);
	const [panelObjectId, setPanelObjectId] = useState<string | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);

	const handleDrop = useCallback(
		(objects: DroppedObject[]) => {
			const first = objects[0];
			if (first) {
				const id = config.dropZone?.idField
					? (first[config.dropZone.idField] as string)
					: first.objectId;
				setObjectId(id);
			}
		},
		[config.dropZone?.idField],
	);

	const handleCommand = useCallback(
		(command: CommandDefinition, row: Record<string, unknown>) => {
			switch (command.type) {
				case "side-panel":
					if (command.panelConfig) {
						setPanelConfig(command.panelConfig);
						setPanelObjectId(
							(row.id as string) ?? (row.physicalId as string) ?? "",
						);
						setPanelOpen(true);
					}
					break;
				case "navigate":
					break;
				case "expand":
					break;
				case "dialog":
					break;
				case "action":
					break;
			}
		},
		[],
	);

	const handleSidebarAction = useCallback((_action: string) => {
		// Placeholder for sidebar actions (New Product, New Part)
	}, []);

	const params: Record<string, string> = objectId
		? { physicalId: objectId, objectId, expandLevel: "1" }
		: {};

	return (
		<div className="flex h-full bg-background">
			{config.sidebar && (
				<Sidebar
					config={config.sidebar}
					activeView={activeView}
					onViewChange={setActiveView}
					onAction={handleSidebarAction}
				/>
			)}

			<div className="flex flex-1 flex-col overflow-hidden">
				{objectId ? (
					<ObjectDetailView
						config={config}
						objectId={objectId}
						params={params}
						onDrop={handleDrop}
						onCommand={handleCommand}
					/>
				) : (
					<RecentsView config={config} onDrop={handleDrop} />
				)}
			</div>

			{panelConfig && (
				<SidePanel
					config={panelConfig}
					objectId={panelObjectId}
					open={panelOpen}
					onOpenChange={setPanelOpen}
				/>
			)}
		</div>
	);
}

function RecentsView({
	config,
	onDrop,
}: {
	config: WidgetConfig;
	onDrop: (objects: DroppedObject[]) => void;
}) {
	if (!config.dropZone?.enabled) {
		return (
			<div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
				Select an item from the sidebar to begin.
			</div>
		);
	}

	return (
		<div className="flex flex-1 items-center justify-center p-8">
			<DropZone config={config.dropZone} onDrop={onDrop} />
		</div>
	);
}

function ObjectDetailView({
	config,
	objectId,
	params,
	onDrop,
	onCommand,
}: {
	config: WidgetConfig;
	objectId: string;
	params: Record<string, string>;
	onDrop: (objects: DroppedObject[]) => void;
	onCommand: (command: CommandDefinition, row: Record<string, unknown>) => void;
}) {
	return (
		<>
			{config.header && (
				<ObjectHeader
					config={config.header}
					objectId={objectId}
					widgetTitle={config.title}
				/>
			)}

			{config.dropZone?.enabled ? (
				<DropZone config={config.dropZone} onDrop={onDrop}>
					<TabManager
						tabs={config.tabs}
						defaultTab={config.defaultTab}
						renderTabContent={(tab) => (
							<TabContentRenderer
								tab={tab}
								params={params}
								onCommand={onCommand}
							/>
						)}
					/>
				</DropZone>
			) : (
				<TabManager
					tabs={config.tabs}
					defaultTab={config.defaultTab}
					renderTabContent={(tab) => (
						<TabContentRenderer
							tab={tab}
							params={params}
							onCommand={onCommand}
						/>
					)}
				/>
			)}
		</>
	);
}
