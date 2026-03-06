import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Clock, Globe } from 'lucide-react';
import { useState } from 'react';
import { ApiExplorerProvider } from '../context/api-explorer-context';
import { CollectionTree } from './sidebar/collection-tree';
import { DropZone } from './sidebar/drop-zone';
import { HistoryPanel } from './sidebar/history-panel';
import { SpecBrowser } from './sidebar/spec-browser';
import { RequestPanel } from './request/request-panel';
import { ResponsePanel } from './response/response-panel';
import { Separator } from '@/components/ui/separator';

type SidebarTab = 'apis' | 'history';

function ExplorerSidebar() {
  const [tab, setTab] = useState<SidebarTab>('apis');

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-border p-0">
        <div className="flex items-center px-4 h-12 shrink-0">
          <span className="font-semibold text-sm text-foreground tracking-tight">3DX API Explorer</span>
        </div>
        <div className="flex border-t border-border">
          {([
            ['apis', Globe, 'APIs'],
            ['history', Clock, 'History'],
          ] as const).map(([t, Icon, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30'
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      </SidebarHeader>

      <SidebarContent>
        {tab === 'apis' && (
          <SidebarGroup>
            <SidebarGroupContent className="space-y-3 pt-2">
              {/* Built-in spec browser */}
              <div>
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                  Browse 3DExperience APIs
                </p>
                <SpecBrowser />
              </div>

              <Separator />

              {/* Active collections tree */}
              <div>
                <p className="px-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60 mb-1">
                  Active APIs
                </p>
                <CollectionTree />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {tab === 'history' && (
          <SidebarGroup>
            <SidebarGroupContent>
              <HistoryPanel />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}

function ExplorerLayout() {
  return (
    <SidebarProvider className="h-screen overflow-hidden bg-background">
      <DropZone />
      <ExplorerSidebar />
      <SidebarInset className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
        <div className="flex items-center px-4 h-10 border-b border-border shrink-0 bg-card/50">
          <SidebarTrigger className="-ml-2" />
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
  );
}

export function ApiExplorer() {
  return (
    <ApiExplorerProvider>
      <ExplorerLayout />
    </ApiExplorerProvider>
  );
}
