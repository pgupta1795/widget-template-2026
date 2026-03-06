import { useApiExplorer } from '../../context/api-explorer-context';
import { Clock, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MethodBadge } from '../request/method-badge';
import type { HttpMethod } from '../../openapi/types';

export function HistoryPanel() {
  const { history, clearHistory, loadHistoryEntry } = useApiExplorer();

  if (history.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <Clock size={32} className="mx-auto mb-3 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">Your request history will appear here</p>
      </div>
    );
  }

  return (
    <div className="space-y-1 mt-1">
      <div className="flex justify-end mb-2 px-2">
        <button
          onClick={clearHistory}
          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded bg-destructive/10 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors"
        >
          <Trash2 size={10} /> Clear all
        </button>
      </div>
      {history.map(entry => (
        <button
          key={entry.id}
          onClick={() => loadHistoryEntry(entry)}
          className="w-full flex items-center gap-2 px-2 py-2 rounded-md hover:bg-sidebar-accent text-xs group transition-colors"
        >
          <MethodBadge method={entry.method as HttpMethod} className="text-[10px] w-10 text-left shrink-0" />
          <span className="flex-1 text-left truncate font-mono text-sidebar-foreground/80 text-[11px]">
            {entry.path}
          </span>
          <div className="flex flex-col items-end shrink-0">
            {entry.status && (
              <span className={`text-[10px] font-mono leading-none ${
                entry.status < 300 ? 'text-green-500' : entry.status < 500 ? 'text-yellow-500' : 'text-destructive'
              }`}>
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
  );
}
