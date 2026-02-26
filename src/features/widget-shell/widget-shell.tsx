import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import {DropZone} from "@/features/drop-zone/drop-zone";
import type {DroppedObject} from "@/features/drop-zone/use-object-drop";
import {ObjectHeader} from "@/features/object-header/object-header";
import {SidePanel} from "@/features/side-panel/side-panel";
import {Sidebar} from "@/features/sidebar/sidebar";
import {TabManager} from "@/features/tab-manager/tab-manager";
import type {
	CommandDefinition,
	PanelConfig,
	WidgetConfig,
} from "@/types/config";
import {useLocation,useNavigate} from "@tanstack/react-router";
import {useCallback,useMemo,useState} from "react";
import {toast} from "sonner";
import {TabContentRenderer} from "./tab-content-renderer";

const VIEW_TO_ROUTE: Record<string, "/recents" | "/bom" | "/changes"> = {
	recents: "/recents",
	open: "/bom",
	"my-products": "/changes",
	bom: "/bom",
	changes: "/changes",
};

const ROUTE_TO_VIEW: Record<string, string> = {
	"/recents": "recents",
	"/bom": "open",
	"/changes": "my-products",
};

const OBJECT_STORAGE_KEY = "engineering-bom:objectId";

type WidgetShellProps = {
	config: WidgetConfig;
};

export function WidgetShell({ config }: WidgetShellProps) {
	const navigate = useNavigate();
	const location = useLocation();
	const [objectId, setObjectId] = useState<string | null>(() =>
		typeof window === "undefined"
			? null
			: window.localStorage.getItem(OBJECT_STORAGE_KEY),
	);
	const [panelConfig, setPanelConfig] = useState<PanelConfig | null>(null);
	const [panelObjectId, setPanelObjectId] = useState<string | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);
	const [panelCollapsed, setPanelCollapsed] = useState(false);

	const activeView = useMemo(
		() => ROUTE_TO_VIEW[location.pathname] ?? "recents",
		[location.pathname],
	);

	const handleDrop = useCallback(
		(objects: DroppedObject[]) => {
			const first = objects[0];
			if (!first) {
				toast.error("Drop payload is empty.");
				return;
			}

			const id = config.dropZone?.idField
				? (first[config.dropZone.idField] as string)
				: first.objectId;

			if (!id) {
				toast.error("Unable to resolve object id from drop payload.");
				return;
			}

			setObjectId(id);
			window.localStorage.setItem(OBJECT_STORAGE_KEY, id);
			toast.success("Object loaded.");
			navigate({ to: "/bom" });
		},
		[config.dropZone?.idField, navigate],
	);

	const handleCommand = useCallback(
		(command: CommandDefinition, row: Record<string, unknown>) => {
			switch (command.type) {
				case "side-panel":
					if (command.panelConfig) {
						setPanelConfig(command.panelConfig);
						setPanelObjectId(
							(row.id as string) ??
								(row.physicalId as string) ??
								objectId ??
								"",
						);
						setPanelOpen(true);
						setPanelCollapsed(false);
					}
					break;
				case "navigate":
					toast.info("Navigation action triggered.");
					break;
				case "expand":
					toast.info("Expand action triggered.");
					break;
				case "dialog":
					toast.info("Dialog action triggered.");
					break;
				case "action":
					toast.info("Action triggered.");
					break;
			}
		},
		[objectId],
	);

	const handleSidebarAction = useCallback((action: string) => {
		toast.success(`${action.replace("-", " ")} started.`);
	}, []);

	const handleViewChange = useCallback(
		(view: string) => {
			navigate({ to: VIEW_TO_ROUTE[view] ?? "/recents" });
		},
		[navigate],
	);

	const params: Record<string, string> = objectId
		? { physicalId: objectId, objectId, expandLevel: "1" }
		: {};

	const showDropView = activeView === "recents";
	const canRenderObjectView = !!objectId;

	return (
		<SidebarProvider defaultOpen>
			<div className="flex h-full overflow-hidden bg-background w-full min-h-svh">
				{config.sidebar && (
					<Sidebar
						config={config.sidebar}
						activeView={activeView}
						onViewChange={handleViewChange}
						onAction={handleSidebarAction}
					/>
				)}
				<SidebarInset className="m-0 rounded-none border-0 shadow-none">
					<div className="flex h-full min-w-0">
						<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
							<div className="flex h-9 items-center border-b border-border px-2">
								<SidebarTrigger />
							</div>
							{showDropView ? (
								<RecentsView config={config} onDrop={handleDrop} />
							) : canRenderObjectView ? (
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
						<SidePanel
							config={panelConfig}
							objectId={panelObjectId}
							open={panelOpen}
							onOpenChange={setPanelOpen}
							collapsed={panelCollapsed}
							onToggleCollapsed={() => setPanelCollapsed((prev) => !prev)}
						/>
					</div>
				</SidebarInset>
			</div>
		</SidebarProvider>
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
			<div className="flex h-full flex-1 items-center justify-center text-sm text-muted-foreground">
				Select an item from the sidebar to begin.
			</div>
		);
	}

	return (
		<div className="flex h-full flex-1 items-center justify-center bg-muted/20 p-6">
			<DropZone
				config={config.dropZone}
				onDrop={onDrop}
				className="h-full max-h-[calc(100%-0.5rem)]"
			/>
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
		<div className="flex h-full flex-1 flex-col overflow-hidden">
			{config.header && (
				<ObjectHeader
					config={config.header}
					objectId={objectId}
					widgetTitle={config.title}
				/>
			)}
			<div className="flex-1 overflow-hidden">
				{config.dropZone?.enabled ? (
					<DropZone
						config={config.dropZone}
						onDrop={onDrop}
						className="h-full overflow-hidden border-transparent hover:border-transparent"
					>
						<TabManager
							tabs={config.tabs}
							defaultTab={config.defaultTab}
							className="h-full"
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
						className="h-full"
						renderTabContent={(tab) => (
							<TabContentRenderer
								tab={tab}
								params={params}
								onCommand={onCommand}
							/>
						)}
					/>
				)}
			</div>
		</div>
	);
}
