import { useApiExplorer } from '../../context/api-explorer-context';
import { MethodBadge } from '../request/method-badge';
import type { ParsedCollection, ParsedEndpoint, ParsedTag } from '../../openapi/types';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';

function TagGroup({
  tag,
  collection,
  onSelect,
  activeEndpointId,
}: {
  tag: ParsedTag;
  collection: ParsedCollection;
  onSelect: (col: ParsedCollection, ep: ParsedEndpoint) => void;
  activeEndpointId?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
        <span className="truncate font-medium">{tag.name}</span>
        <span className="ml-auto text-[10px] text-muted-foreground/50">{tag.endpoints.length}</span>
      </button>
      {open && (
        <div className="ml-3 border-l border-sidebar-border/40 pl-1 space-y-0.5">
          {tag.endpoints.map(ep => (
            <button
              key={ep.operationId}
              onClick={() => onSelect(collection, ep)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors group ${
                activeEndpointId === ep.operationId
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'hover:bg-sidebar-accent'
              }`}
            >
              <MethodBadge method={ep.method} className="w-12 text-[10px] shrink-0" />
              <span className="flex-1 text-left truncate font-mono text-sidebar-foreground/80 text-[11px]">
                {ep.path}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function CollectionTree() {
  const { activeCollections, loadEndpoint, activeEndpoint } = useApiExplorer();
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());

  const toggleCollection = (id: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (activeCollections.length === 0) {
    return (
      <div className="text-center py-6 px-4">
        <p className="text-xs text-muted-foreground">Activate APIs from the browser above to see endpoints</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activeCollections.map(col => (
        <div key={col.id}>
          <button
            onClick={() => toggleCollection(col.id)}
            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent text-sm group"
          >
            {expandedCollections.has(col.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span className="flex-1 text-left truncate text-sidebar-foreground font-medium text-xs">
              {col.name}
            </span>
            <span className="text-[9px] text-muted-foreground/50 bg-muted/40 px-1.5 py-0.5 rounded shrink-0">
              {col.serviceType}
            </span>
            <span className="text-[9px] text-muted-foreground/40 ml-1">{col.endpointCount}</span>
          </button>
          {expandedCollections.has(col.id) && (
            <div className="ml-2 mt-0.5 space-y-0.5">
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
