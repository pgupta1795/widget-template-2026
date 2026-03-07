import { useApiExplorer } from '../../context/api-explorer-context';
import { Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MethodBadge } from '../request/method-badge';
import type { HttpMethod } from '../../openapi/types';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function HistoryPanel() {
  const { history, clearHistory, loadHistoryEntry } = useApiExplorer();

  if (history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
        <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3">
          <Clock size={18} className="text-muted-foreground/40" />
        </div>
        <p className="text-xs font-medium text-muted-foreground">No history yet</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">Sent requests appear here</p>
      </div>
    );
  }

  const displayed = history.slice(0, 10);

  return (
    <div className="px-1 pb-2">
      {/* Header row */}
      <div className="flex items-center justify-between px-2 py-1.5 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50">
          Recent ({displayed.length})
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger
              render={
                <button
                  onClick={clearHistory}
                  className="p-1 rounded hover:bg-destructive/10 text-muted-foreground/50 hover:text-destructive transition-colors cursor-pointer"
                />
              }
            >
              <Trash2 size={13} />
            </TooltipTrigger>
            <TooltipContent side="left">Clear all history</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="space-y-0.5">
        {displayed.map(entry => (
          <button
            key={entry.id}
            onClick={() => loadHistoryEntry(entry)}
            className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-sidebar-accent border border-transparent hover:border-border/30 text-xs transition-all group cursor-pointer"
          >
            <MethodBadge method={entry.method as HttpMethod} size="sm" className="shrink-0" />
            <div className="flex-1 min-w-0 text-left">
              <p className="font-mono text-[11px] text-sidebar-foreground/80 truncate leading-tight">
                {entry.path}
              </p>
              <p className="text-[10px] text-muted-foreground/50 leading-tight mt-0.5">
                {formatDistanceToNow(entry.timestamp, { addSuffix: true })}
              </p>
            </div>
            {entry.status && (
              <span className={`text-[10px] font-mono font-semibold shrink-0 tabular-nums ${
                entry.status < 300 ? 'text-emerald-600 dark:text-emerald-400'
                : entry.status < 500 ? 'text-amber-600 dark:text-amber-400'
                : 'text-red-600 dark:text-red-400'
              }`}>
                {entry.status}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
