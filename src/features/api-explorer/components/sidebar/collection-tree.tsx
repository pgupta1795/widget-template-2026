import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {ChevronDown,ChevronRight,Layers} from 'lucide-react';
import {useState} from 'react';
import {useApiExplorer} from '../../context/api-explorer-context';
import type {ParsedCollection,ParsedEndpoint,ParsedTag} from '../../openapi/types';
import {MethodBadge} from '../request/method-badge';

function EndpointItem({
  ep,
  collection,
  isActive,
  onSelect,
}: {
  ep: ParsedEndpoint;
  collection: ParsedCollection;
  isActive: boolean;
  onSelect: (col: ParsedCollection,ep: ParsedEndpoint) => void;
}) {
  // Show last 2 meaningful path segments for readability
  const segments=ep.path.split('/').filter(Boolean);
  const displayPath=segments.length>3
    ? '…/'+segments.slice(-2).join('/')
    :ep.path;

  return (
    <TooltipProvider delay={400}>
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              onClick={() => onSelect(collection,ep)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors group cursor-pointer ${isActive
                ? 'bg-primary/10 border border-primary/20'
                :'hover:bg-sidebar-accent border border-transparent'
                }`}
            />
          }
        >
          <MethodBadge method={ep.method} size="sm" className="shrink-0" />
          <div className="flex-1 min-w-0 text-left">
            <p className={`font-mono text-[11px] truncate leading-tight ${isActive? 'text-primary font-medium':'text-sidebar-foreground/80'
              }`}>
              {displayPath}
            </p>
            {ep.summary&&(
              <p className="text-[10px] text-muted-foreground/60 truncate leading-tight mt-0.5">
                {ep.summary}
              </p>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-64 text-left">
          <p className="font-mono text-[11px] font-semibold break-all">{ep.path}</p>
          {ep.description&&(
            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">{ep.description}</p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function TagGroup({
  tag,
  collection,
  onSelect,
  activeEndpointId,
}: {
  tag: ParsedTag;
  collection: ParsedCollection;
  onSelect: (col: ParsedCollection,ep: ParsedEndpoint) => void;
  activeEndpointId?: string;
}) {
  const [open,setOpen]=useState(true);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/40 rounded transition-colors cursor-pointer"
      >
        {open? <ChevronDown size={10} />:<ChevronRight size={10} />}
        <span className="truncate font-semibold uppercase tracking-wider text-[10px]">{tag.name}</span>
        <span className="ml-auto text-[9px] text-muted-foreground/50 bg-muted/50 px-1 rounded shrink-0">{tag.endpoints.length}</span>
      </button>
      {open&&(
        <div className="ml-2 border-l border-sidebar-border/30 pl-1 space-y-0.5 mt-0.5">
          {tag.endpoints.map(ep => (
            <EndpointItem
              key={ep.operationId}
              ep={ep}
              collection={collection}
              isActive={activeEndpointId===ep.operationId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectionTree() {
  const {activeCollections,loadEndpoint,activeEndpoint}=useApiExplorer();
  const [expandedCollections,setExpandedCollections]=useState<Set<string>>(new Set());

  const toggleCollection=(id: string) => {
    setExpandedCollections(prev => {
      const next=new Set(prev);
      next.has(id)? next.delete(id):next.add(id);
      return next;
    });
  };

  if (activeCollections.length===0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <Layers size={18} className="text-muted-foreground/50" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">No active APIs</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">Switch to Browse tab to enable APIs</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 px-1 pb-2">
      {activeCollections.map(col => (
        <div key={col.id} className="rounded-lg border border-border/50 overflow-hidden">
          <button
            onClick={() => toggleCollection(col.id)}
            className="w-full flex items-start gap-2 px-3 py-2 bg-card hover:bg-accent/30 transition-colors text-sm group cursor-pointer"
          >
            {expandedCollections.has(col.id)? <ChevronDown size={13} className="mt-0.5 shrink-0" />:<ChevronRight size={13} className="mt-0.5 shrink-0" />}
            <span className="flex-1 text-left wrap-break-word whitespace-normal text-sidebar-foreground font-semibold text-xs leading-snug">
              {col.name}
            </span>
            <span className="text-[9px] text-muted-foreground/60 bg-muted/60 px-1.5 py-0.5 rounded shrink-0 font-medium mt-px">
              {col.serviceType}
            </span>
            <span className="text-[9px] text-muted-foreground/40 tabular-nums">{col.endpointCount}</span>
          </button>
          {expandedCollections.has(col.id)&&(
            <div className="px-1 py-1 space-y-0.5 bg-sidebar/50">
              {col.tags.map(tag => (
                <TagGroup
                  key={tag.name}
                  tag={tag}
                  collection={col}
                  onSelect={loadEndpoint}
                  activeEndpointId={activeEndpoint?.operationId}
                />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
