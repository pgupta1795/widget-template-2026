import { DropZoneOverlay } from "@/components/dnd/drop-zone-overlay";
import { useSidebarSlot } from "@/components/layout/sidebar-slot-context";
import {
	ResizableHandle,
	ResizablePanel,
	ResizablePanelGroup,
} from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	ApiExplorerProvider,
	useApiExplorer,
} from "@/features/api-explorer/context/api-explorer-context";
import { use3dxDropZone } from "@/hooks/use-3dx-drop-zone";
import { Clock, Globe, Layers } from "lucide-react";
import { createPortal } from "react-dom";
import { RequestPanel } from "./request/request-panel";
import { ResponsePanel } from "./response/response-panel";
import { CollectionTree } from "./sidebar/collection-tree";
import { HistoryPanel } from "./sidebar/history-panel";
import { SpecBrowser } from "./sidebar/spec-browser";

function ExplorerSidebarContent() {
	return (
		<div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden relative w-full h-full max-w-full">
			<SidebarGroup className="flex-1 overflow-hidden p-0 min-h-0 min-w-0 gap-0 w-full max-w-full absolute inset-0">
				<SidebarGroupContent className="flex-1 flex flex-col overflow-hidden min-h-0 min-w-0 w-full max-w-full">
					<Tabs
						defaultValue="active"
						className="flex-1 flex flex-col gap-0 overflow-hidden min-w-0 w-full max-w-full"
					>
						<TabsList
							variant="line"
							className="w-full min-w-0 rounded-none border-b border-border h-9 px-2 justify-start gap-0 shrink-0 flex-nowrap overflow-x-auto overflow-y-hidden"
						>
							<TabsTrigger
								value="active"
								className="gap-1 text-[11px] shrink-0"
							>
								<Layers size={12} /> Active
							</TabsTrigger>
							<TabsTrigger
								value="browse"
								className="gap-1 text-[11px] shrink-0"
							>
								<Globe size={12} /> Browse
							</TabsTrigger>
							<TabsTrigger
								value="history"
								className="gap-1 text-[11px] shrink-0"
							>
								<Clock size={12} /> History
							</TabsTrigger>
						</TabsList>

						<TabsContent
							value="active"
							className="flex-1 overflow-hidden min-w-0 mt-0"
						>
							<ScrollArea className="h-full w-full">
								<div className="pt-2 w-full min-w-0">
									<CollectionTree />
								</div>
							</ScrollArea>
						</TabsContent>

						<TabsContent
							value="browse"
							className="flex-1 overflow-hidden min-w-0 mt-0"
						>
							<ScrollArea className="h-full w-full">
								<div className="pt-2 w-full min-w-0">
									<SpecBrowser />
								</div>
							</ScrollArea>
						</TabsContent>

						<TabsContent
							value="history"
							className="flex-1 overflow-hidden min-w-0 mt-0"
						>
							<ScrollArea className="h-full w-full">
								<div className="pt-2 w-full min-w-0">
									<HistoryPanel />
								</div>
							</ScrollArea>
						</TabsContent>
					</Tabs>
				</SidebarGroupContent>
			</SidebarGroup>
		</div>
	);
}

function ApiExplorerContent() {
	const { slotEl } = useSidebarSlot();
	const { onObjectDrop } = useApiExplorer();
	const { ref, isDragOver } = use3dxDropZone<HTMLDivElement>({
		onDrop: onObjectDrop,
	});

	return (
		<>
			{slotEl && createPortal(<ExplorerSidebarContent />, slotEl)}
			<div ref={ref} className="relative h-full">
				{isDragOver && <DropZoneOverlay />}
				<ResizablePanelGroup orientation="vertical" className="h-full">
					<ResizablePanel defaultSize={55} minSize={25}>
						<RequestPanel />
					</ResizablePanel>
					<ResizableHandle className="bg-border hover:bg-primary/30 transition-colors data-resize-handle-active:bg-primary/50" />
					<ResizablePanel defaultSize={45} minSize={20}>
						<ResponsePanel />
					</ResizablePanel>
				</ResizablePanelGroup>
			</div>
		</>
	);
}

export function ApiExplorer() {
	return (
		<ApiExplorerProvider>
			<ApiExplorerContent />
		</ApiExplorerProvider>
	);
}
