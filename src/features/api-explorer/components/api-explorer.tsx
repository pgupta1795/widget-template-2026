import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {ScrollArea} from '@/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Clock,Globe,Layers} from 'lucide-react';
import {ApiExplorerProvider} from '../context/api-explorer-context';
import {RequestPanel} from './request/request-panel';
import {ResponsePanel} from './response/response-panel';
import {CollectionTree} from './sidebar/collection-tree';
import {HistoryPanel} from './sidebar/history-panel';
import {SpecBrowser} from './sidebar/spec-browser';

function ExplorerSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-0">
        <div className="flex items-center gap-2 px-4 h-11 shrink-0">
          <div className="w-5 h-5 rounded bg-primary/15 flex items-center justify-center shrink-0">
            <Globe size={11} className="text-primary" />
          </div>
          <span className="font-semibold text-sm text-foreground tracking-tight">3DX API Explorer</span>
        </div>
      </SidebarHeader>

      <SidebarContent className="overflow-hidden">
        <Tabs defaultValue="active" className="h-full flex flex-col gap-0">
          <TabsList
            variant="line"
            className="w-full rounded-none border-b border-border h-9 px-2 justify-start gap-0 shrink-0"
          >
            <TabsTrigger value="active" className="gap-1 text-[11px]">
              <Layers size={12} /> Active
            </TabsTrigger>
            <TabsTrigger value="browse" className="gap-1 text-[11px]">
              <Globe size={12} /> Browse
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 text-[11px]">
              <Clock size={12} /> History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="pt-2">
                <CollectionTree />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="browse" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="pt-2">
                <SpecBrowser />
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
            <ScrollArea className="h-full">
              <div className="pt-2">
                <HistoryPanel />
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SidebarContent>
    </Sidebar>
  );
}

export function ApiExplorer() {
  return (
    <ApiExplorerProvider>
      <SidebarProvider className="h-screen overflow-hidden bg-background">
        <ExplorerSidebar />
        <SidebarInset className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
          <div className="flex items-center px-3 h-9 border-b border-border shrink-0 bg-card/40">
            <SidebarTrigger className="-ml-1" />
          </div>
          <ResizablePanelGroup orientation="vertical" className="flex-1">
            <ResizablePanel defaultSize={55} minSize={25}>
              <RequestPanel />
            </ResizablePanel>
            <ResizableHandle className="bg-border hover:bg-primary/30 transition-colors data-resize-handle-active:bg-primary/50" />
            <ResizablePanel defaultSize={45} minSize={20}>
              <ResponsePanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </SidebarInset>
      </SidebarProvider>
    </ApiExplorerProvider>
  );
}
