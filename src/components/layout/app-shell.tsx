import { Outlet } from '@tanstack/react-router';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { AppSidebar } from './app-sidebar';

export function AppShell() {
  return (
    <SidebarProvider className="h-full overflow-hidden bg-background">
      <AppSidebar />
      <SidebarInset className="flex-1 flex flex-col overflow-hidden min-w-0">
        <div className="flex items-center px-3 h-9 border-b border-border shrink-0 bg-card/40">
          <SidebarTrigger className="-ml-1" />
        </div>
        <div className="flex-1 overflow-hidden">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
