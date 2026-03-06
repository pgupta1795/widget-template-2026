import { useApp } from '@/app/context';
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarHeader
} from '@/components/ui/sidebar';
import { formatDistanceToNow } from 'date-fns';
import { ChevronDown, ChevronRight, Clock, FolderOpen, Globe, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MethodBadge } from './method-badge';

type SidebarTab = 'apis' | 'collections' | 'history';

export function AppSidebar() {
  const {
    importedApis, removeImportedApi, loadEndpoint,
    collections, deleteCollection, loadCollectionRequest, removeFromCollection,
    history, clearHistory, loadHistoryEntry,
  } = useApp();
  const [activeTab, setActiveTab] = useState<SidebarTab>('apis');
  const [expandedApis, setExpandedApis] = useState<Set<string>>(new Set());
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());

  const toggleApi = (id: string) => {
    setExpandedApis(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleCollection = (id: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <Sidebar>
      {/* Header with Tabs */}
      <SidebarHeader className="border-b border-border p-0">
        <div className="flex items-center justify-between px-4 h-12 shrink-0">
          <span className="font-semibold text-sm text-foreground tracking-tight">RestForge</span>
        </div>
        <div className="flex border-t border-border mt-auto">
          {([
            ['apis', Globe, 'APIs'],
            ['collections', FolderOpen, 'Collections'],
            ['history', Clock, 'History'],
          ] as const).map(([tab, Icon, label]) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as SidebarTab)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 ${
                activeTab === tab
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
        {activeTab === 'apis' && (
          <SidebarGroup>
            <SidebarGroupContent>
              {importedApis.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Globe size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Drop an OpenAPI file here or import from URL</p>
                </div>
              ) : (
                <div className="space-y-1 mt-2">
                  {importedApis.map(api => (
                    <div key={api.id} className="mb-1">
                      <button
                        onClick={() => toggleApi(api.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-sm group"
                      >
                        {expandedApis.has(api.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="flex-1 text-left truncate text-sidebar-foreground font-medium">{api.name}</span>
                        <button
                          onClick={e => { e.stopPropagation(); removeImportedApi(api.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
                        >
                          <Trash2 size={12} />
                        </button>
                      </button>
                      {expandedApis.has(api.id) && (
                        <div className="ml-4 space-y-0.5 mt-0.5 border-l border-sidebar-border/50 pl-1">
                          {api.endpoints.map((ep, i) => (
                            <button
                              key={i}
                              onClick={() => loadEndpoint(api, ep)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-xs group transition-colors"
                            >
                              <MethodBadge method={ep.method} className="w-12 text-left text-[10px]" />
                              <span className="flex-1 text-left truncate font-mono text-sidebar-foreground/80">{ep.path}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {activeTab === 'collections' && (
          <SidebarGroup>
            <SidebarGroupContent>
              {collections.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <FolderOpen size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Save requests to organize them into collections</p>
                </div>
              ) : (
                <div className="space-y-1 mt-2">
                  {collections.map(col => (
                    <div key={col.id} className="mb-1">
                      <button
                        onClick={() => toggleCollection(col.id)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-sm group"
                      >
                        {expandedCollections.has(col.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        <span className="flex-1 text-left truncate text-sidebar-foreground font-medium">{col.name}</span>
                        <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded-full">{col.requests.length}</span>
                        <button
                          onClick={e => { e.stopPropagation(); deleteCollection(col.id); }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all ml-1"
                        >
                          <Trash2 size={12} />
                        </button>
                      </button>
                      {expandedCollections.has(col.id) && (
                        <div className="ml-4 space-y-0.5 mt-0.5 border-l border-sidebar-border/50 pl-1">
                          {col.requests.map(req => (
                            <button
                              key={req.id}
                              onClick={() => loadCollectionRequest(req)}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-xs group transition-colors"
                            >
                              <MethodBadge method={req.method} className="text-[10px]" />
                              <span className="flex-1 text-left truncate text-sidebar-foreground/80">{req.name}</span>
                              <button
                                onClick={e => { e.stopPropagation(); removeFromCollection(col.id, req.id); }}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-destructive transition-all"
                              >
                                <Trash2 size={12} />
                              </button>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {activeTab === 'history' && (
          <SidebarGroup>
            <SidebarGroupContent>
              {history.length > 0 && (
                <div className="flex justify-end mb-2">
                  <button onClick={clearHistory} className="text-[10px] px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors font-medium">
                    Clear all
                  </button>
                </div>
              )}
              {history.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Clock size={32} className="mx-auto mb-3 text-muted-foreground/40" />
                  <p className="text-xs text-muted-foreground">Your request history will appear here</p>
                </div>
              ) : (
                <div className="space-y-1 mt-1">
                  {history.map(entry => (
                    <button
                      key={entry.id}
                      onClick={() => loadHistoryEntry(entry)}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-sidebar-accent text-xs group transition-colors"
                    >
                      <MethodBadge method={entry.method} className="text-[10px] w-10 text-left shrink-0" />
                      <span className="flex-1 text-left truncate font-mono text-sidebar-foreground/80 text-[11px]">
                        {entry.url.replace(/^https?:\/\//, '')}
                      </span>
                      <div className="flex flex-col items-end shrink-0">
                        {entry.status && (
                          <span className={`text-[10px] font-mono leading-none ${entry.status < 300 ? 'text-success' : entry.status < 500 ? 'text-warning' : 'text-destructive'}`}>
                            {entry.status}
                          </span>
                        )}
                        <span className="text-[9px] text-muted-foreground/70 leading-none mt-1">
                          {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
