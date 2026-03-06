import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Send } from 'lucide-react';
import { useState } from 'react';
import { useApiExplorer } from '../../context/api-explorer-context';
import { BodyEditor } from './body-editor';
import { HeadersEditor } from './headers-editor';
import { MethodBadge } from './method-badge';
import { ParamsEditor } from './params-editor';

type RequestTab = 'path' | 'query' | 'headers' | 'body';

export function RequestPanel() {
  const {
    activeEndpoint, activeCollection,
    pathParams, setPathParams,
    queryParams, setQueryParams,
    headers, setHeaders,
    loading, sendRequest,
  } = useApiExplorer();

  const [activeTab, setActiveTab] = useState<RequestTab>('query');

  // Disable send if any required path param is missing
  const missingRequired = pathParams.some(p => {
    const hint = activeEndpoint?.pathParams.find(h => h.name === p.key);
    return hint?.required && !p.value.trim();
  });

  const canSend = !!activeEndpoint && !loading && !missingRequired;

  const tabs = [
    { id: 'path' as const, label: 'Path Params', count: pathParams.filter(p => p.value).length, show: pathParams.length > 0 },
    { id: 'query' as const, label: 'Query Params', count: queryParams.filter(p => p.key && p.enabled).length, show: true },
    { id: 'headers' as const, label: 'Headers', count: headers.filter(p => p.key && p.enabled && !p.readOnly).length, show: true },
    { id: 'body' as const, label: 'Body', count: 0, show: ['POST', 'PUT', 'PATCH'].includes(activeEndpoint?.method ?? '') },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* URL bar */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        {activeEndpoint ? (
          <MethodBadge method={activeEndpoint.method} className="shrink-0" />
        ) : (
          <span className="text-xs font-mono text-muted-foreground px-2 py-1.5 bg-muted/30 rounded-md">GET</span>
        )}

        <div className="flex-1 relative">
          <Input
            readOnly
            value={activeEndpoint
              ? `${activeCollection?.serviceType ?? ''} · ${activeEndpoint.path}`
              : ''}
            placeholder="Select an endpoint from the sidebar"
            className="h-9 font-mono text-xs bg-muted/20 pr-4"
          />
        </div>

        <Button
          onClick={sendRequest}
          disabled={!canSend}
          className="h-9 px-5 gap-2 font-semibold shrink-0"
          title={missingRequired ? 'Fill in required path parameters' : ''}
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={14} />}
          Send
        </Button>
      </div>

      {/* Endpoint description */}
      {activeEndpoint?.description && (
        <div className="px-4 py-2 text-xs text-muted-foreground border-b border-border bg-muted/10 line-clamp-2">
          {activeEndpoint.description}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border shrink-0">
        {tabs.filter(t => t.show).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-medium transition-colors border-b-2 ${
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1.5 bg-primary/20 text-primary px-1.5 py-0.5 rounded-full text-[10px]">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'path' && (
          <ParamsEditor
            items={pathParams}
            onChange={setPathParams}
            paramHints={activeEndpoint?.pathParams}
            label="Path Param"
          />
        )}
        {activeTab === 'query' && (
          <ParamsEditor
            items={queryParams}
            onChange={setQueryParams}
            paramHints={activeEndpoint?.queryParams}
            label="Query Param"
          />
        )}
        {activeTab === 'headers' && (
          <HeadersEditor items={headers} onChange={setHeaders} />
        )}
        {activeTab === 'body' && <BodyEditor />}
      </div>
    </div>
  );
}
