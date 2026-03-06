import { useApiExplorer } from '../../context/api-explorer-context';
import { formatBytes, highlightJson } from '@/lib/utils';
import { Check, CheckCircle, Clock, Copy, Database, XCircle } from 'lucide-react';
import { useState } from 'react';

type ResponseTab = 'body' | 'headers';

export function ResponsePanel() {
  const { response, loading } = useApiExplorer();
  const [activeTab, setActiveTab] = useState<ResponseTab>('body');
  const [viewMode, setViewMode] = useState<'pretty' | 'raw'>('pretty');
  const [copied, setCopied] = useState(false);

  const copyResponse = () => {
    if (!response) return;
    const text = typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className="flex gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: '0s' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: '0.3s' }} />
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-dot" style={{ animationDelay: '0.6s' }} />
        </div>
        <span className="text-sm text-muted-foreground">Sending request...</span>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground/40">
        <Database size={40} className="mb-3" />
        <p className="text-sm">Response will appear here</p>
        <p className="text-xs mt-1">Send a request to see results</p>
      </div>
    );
  }

  const isSuccess = response.status >= 200 && response.status < 300;
  const isError = response.status >= 400 || response.status === 0;

  const statusColor = response.status === 0
    ? 'text-destructive'
    : response.status < 300
      ? 'text-success'
      : response.status < 400
        ? 'text-method-put'
        : response.status < 500
          ? 'text-warning'
          : 'text-destructive';

  const statusBg = response.status === 0
    ? 'bg-destructive/10'
    : response.status < 300
      ? 'bg-success/10'
      : response.status < 400
        ? 'bg-method-put/10'
        : response.status < 500
          ? 'bg-warning/10'
          : 'bg-destructive/10';

  return (
    <div className="flex flex-col h-full">
      {/* Status bar */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border shrink-0">
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-mono font-bold ${statusColor} ${statusBg}`}>
          {isSuccess ? <CheckCircle size={14} /> : isError ? <XCircle size={14} /> : null}
          {response.status === 0 ? 'Error' : response.status} {response.statusText}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={12} />
          {response.time}ms
        </div>
        <div className="text-xs text-muted-foreground">
          {formatBytes(response.size)}
        </div>
        <div className="ml-auto">
          <button
            onClick={copyResponse}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {copied ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Response tabs */}
      <div className="flex items-center border-b border-border shrink-0">
        <div className="flex">
          {(['body', 'headers'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-xs font-medium capitalize transition-colors border-b-2 ${
                activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab}
              {tab === 'headers' && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  ({Object.keys(response.headers).length})
                </span>
              )}
            </button>
          ))}
        </div>
        {activeTab === 'body' && (
          <div className="ml-auto flex gap-1 pr-3">
            {(['pretty', 'raw'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-2 py-1 rounded text-[10px] font-medium capitalize transition-colors ${
                  viewMode === mode
                    ? 'bg-accent text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {activeTab === 'body' && (
          <div className="p-4">
            {viewMode === 'pretty' && typeof response.data === 'object' ? (
              <pre
                className="text-sm font-mono leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ __html: highlightJson(response.data) }}
              />
            ) : (
              <pre className="text-sm font-mono text-foreground leading-relaxed whitespace-pre-wrap">
                {typeof response.data === 'string'
                  ? response.data
                  : JSON.stringify(response.data, null, 2)}
              </pre>
            )}
          </div>
        )}
        {activeTab === 'headers' && (
          <div className="p-4 space-y-1">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="flex gap-3 py-1.5 text-sm font-mono">
                <span className="text-method-put font-medium shrink-0">{key}</span>
                <span className="text-foreground break-all">{value as string}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
