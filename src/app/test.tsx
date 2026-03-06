import {AppSidebar} from '@/app/components/app-sidebar';
import {DropZone} from '@/app/components/dropzone';
import {EnvironmentDialog} from '@/app/components/env-dialog';
import {RequestPanel} from '@/app/components/request-panel';
import {ResponsePanel} from '@/app/components/response-panel';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import {SidebarInset,SidebarProvider,SidebarTrigger} from '@/components/ui/sidebar';
import {AppProvider} from './context';

function AppLayout() {
  return (
    <SidebarProvider className="h-screen overflow-hidden bg-background">
      <DropZone />
      <AppSidebar />

      <SidebarInset className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 h-10 border-b border-border shrink-0 bg-card/50">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-2 mr-2" />
            <span className="text-xs text-muted-foreground font-mono hidden md:inline-block">
              ⚡ All requests run locally in your browser
            </span>
          </div>
          <div className="flex items-center gap-2">
            <EnvironmentDialog />
          </div>
        </div>

        {/* Main panels */}
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

const Index = () => {
  return (
    <AppProvider>
      <AppLayout />
    </AppProvider>
  );
};

export default Index;