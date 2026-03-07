import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {Input} from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {ScrollArea} from '@/components/ui/scroll-area';
import {Tabs,TabsContent,TabsList,TabsTrigger} from '@/components/ui/tabs';
import {Braces,ChevronDown,ChevronRight,Code,Filter,Info,List,Loader2,Send} from 'lucide-react';
import {Fragment,useState} from 'react';
import {useApiExplorer} from '../../context/api-explorer-context';
import type {HttpMethod,ParsedCollection,ParsedEndpoint} from '../../openapi/types';
import {BodyEditor} from './body-editor';
import {HeadersEditor} from './headers-editor';
import {MethodBadge} from './method-badge';
import {ParamsEditor} from './params-editor';

const ALL_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

// --- Interactive Breadcrumbs ---
function PathBreadcrumbs({ path }: { path: string }) {
  const { activeCollections, loadEndpoint } = useApiExplorer();
  const segments = path.split('/').filter(Boolean);

  const getSiblings = (upToIndex: number): { col: ParsedCollection; ep: ParsedEndpoint }[] => {
    const prefix = '/' + segments.slice(0, upToIndex + 1).join('/');
    const seen = new Set<string>();
    const results: { col: ParsedCollection; ep: ParsedEndpoint }[] = [];
    for (const col of activeCollections) {
      for (const tag of col.tags) {
        for (const ep of tag.endpoints) {
          const key = `${ep.method}:${ep.path}`;
          if (!seen.has(key) && ep.path.startsWith(prefix)) {
            seen.add(key);
            results.push({ col, ep });
          }
        }
      }
    }
    return results.slice(0, 12);
  };

  return (
    <div className="flex items-center gap-0 font-mono text-xs flex-wrap min-w-0">
      {segments.map((seg, i) => {
        const isParam = seg.startsWith('{');
        const isLast = i === segments.length - 1;
        const siblings = getSiblings(i);

        const segEl = (
          <span
            className={
              isParam
                ? 'text-amber-600 dark:text-amber-400'
                : isLast
                ? 'text-foreground font-medium'
                : 'text-muted-foreground'
            }
          >
            {seg}
          </span>
        );

        return (
          <Fragment key={i}>
            {i > 0 && (
              <span className="text-muted-foreground/40 px-px select-none">/</span>
            )}
            {!isParam && siblings.length > 1 ? (
              <Popover>
                <PopoverTrigger
                  render={
                    <button
                      className={`px-0.5 rounded hover:bg-accent hover:text-foreground transition-colors cursor-pointer ${
                        isLast ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}
                    />
                  }
                >
                  {segEl}
                </PopoverTrigger>
                <PopoverContent side="bottom" align="start" className="w-80 p-0 gap-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-2 border-b border-border">
                    Endpoints under /{segments.slice(0, i + 1).join('/')}
                  </p>
                  <ScrollArea className="max-h-52">
                    <div className="p-1 space-y-px">
                      {siblings.map(({ col, ep }) => (
                        <button
                          key={ep.operationId}
                          onClick={() => loadEndpoint(col, ep)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent text-xs transition-colors cursor-pointer text-left"
                        >
                          <MethodBadge method={ep.method} size="sm" />
                          <span className="flex-1 font-mono text-[11px] text-muted-foreground truncate">
                            {ep.path}
                          </span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            ) : (
              <span className="px-0.5">{segEl}</span>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

// --- Method Selector Dropdown ---
function MethodSelector() {
  const { activeEndpoint, overrideMethod, setOverrideMethod } = useApiExplorer();
  const method = (overrideMethod ?? activeEndpoint?.method ?? 'GET') as HttpMethod;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button className="flex items-center gap-1 hover:opacity-80 transition-opacity cursor-pointer shrink-0 outline-none" />}
      >
        <MethodBadge method={method} />
        <ChevronDown size={11} className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="bottom" align="start" className="min-w-28">
        {ALL_METHODS.map(m => (
          <DropdownMenuItem
            key={m}
            onClick={() => setOverrideMethod(m === activeEndpoint?.method ? null : m)}
            className="flex items-center gap-2 cursor-pointer"
          >
            <MethodBadge method={m} size="sm" />
            {m === (overrideMethod ?? activeEndpoint?.method) && (
              <span className="ml-auto text-primary text-[10px]">✓</span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function RequestPanel() {
  const {
    activeEndpoint, activeCollection,
    pathParams, setPathParams,
    queryParams, setQueryParams,
    headers, setHeaders,
    loading, sendRequest,
    overrideMethod,
  } = useApiExplorer();

  const [descOpen, setDescOpen] = useState(false);

  const effectiveMethod = (overrideMethod ?? activeEndpoint?.method ?? 'GET') as HttpMethod;
  const showBody = ['POST', 'PUT', 'PATCH'].includes(effectiveMethod);

  const missingRequired = pathParams.some(p => {
    const hint = activeEndpoint?.pathParams.find(h => h.name === p.key);
    return hint?.required && !p.value.trim();
  });

  const canSend = !!activeEndpoint && !loading && !missingRequired;

  const pathParamCount = pathParams.filter(p => p.value).length;
  const queryParamCount = queryParams.filter(p => p.key && p.enabled).length;
  const headerCount = headers.filter(p => p.key && p.enabled && !p.readOnly).length;

  return (
    <div className="flex flex-col h-full">
      {/* URL bar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border bg-card/30 shrink-0">
        <MethodSelector />

        <div className="flex-1 min-w-0">
          {activeEndpoint ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-muted/20 min-h-9 overflow-x-auto">
              <Badge variant="secondary" className="text-[9px] px-1.5 py-0 shrink-0 font-mono">
                {activeCollection?.serviceType ?? ''}
              </Badge>
              <PathBreadcrumbs path={activeEndpoint.path} />
            </div>
          ) : (
            <Input
              readOnly
              placeholder="Select an endpoint from the sidebar"
              className="h-9 text-xs text-muted-foreground bg-muted/20"
            />
          )}
        </div>

        <Button
          onClick={sendRequest}
          disabled={!canSend}
          size="sm"
          className="h-9 px-4 gap-1.5 font-semibold shrink-0"
          title={missingRequired ? 'Fill in required path parameters' : ''}
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={13} />}
          Send
        </Button>
      </div>

      {/* Description accordion */}
      {activeEndpoint?.description && (
        <div className="border-b border-border shrink-0">
          <button
            onClick={() => setDescOpen(v => !v)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors cursor-pointer"
          >
            <Info size={12} className="shrink-0 text-primary/60" />
            <span className="flex-1 text-left truncate">{activeEndpoint.summary || 'Description'}</span>
            {descOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          </button>
          {descOpen && (
            <div className="px-4 pb-2.5 pt-0.5 text-xs text-muted-foreground leading-relaxed bg-muted/5">
              {activeEndpoint.description}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <Tabs
        defaultValue="query"
        className="flex-1 flex flex-col gap-0 overflow-hidden"
      >
        <TabsList
          variant="line"
          className="w-full rounded-none border-b border-border h-9 px-2 justify-start gap-0 shrink-0"
        >
          {pathParams.length > 0 && (
            <TabsTrigger value="path" className="text-[11px] gap-1.5 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-colors">
              <Code size={12} /> Path Params
              {pathParamCount > 0 && (
                <Badge variant="secondary" className="text-[9px] px-1 h-3.5 min-w-0">{pathParamCount}</Badge>
              )}
            </TabsTrigger>
          )}
          <TabsTrigger value="query" className="text-[11px] gap-1.5 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-colors">
            <Filter size={12} /> Query
            {queryParamCount > 0 && (
              <Badge variant="info" className="text-[9px] px-1 h-3.5 min-w-0">{queryParamCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="headers" className="text-[11px] gap-1.5 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-colors">
            <List size={12} /> Headers
            {headerCount > 0 && (
              <Badge variant="secondary" className="text-[9px] px-1 h-3.5 min-w-0">{headerCount}</Badge>
            )}
          </TabsTrigger>
          {showBody && (
            <TabsTrigger value="body" className="text-[11px] gap-1.5 px-3 data-[state=active]:bg-primary/10 data-[state=active]:text-primary transition-colors">
              <Braces size={12} /> Body
            </TabsTrigger>
          )}
        </TabsList>

        {pathParams.length > 0 && (
          <TabsContent value="path" className="flex-1 overflow-auto mt-0">
            <ParamsEditor
              items={pathParams}
              onChange={setPathParams}
              paramHints={activeEndpoint?.pathParams}
              label="Path Param"
            />
          </TabsContent>
        )}

        <TabsContent value="query" className="flex-1 overflow-auto mt-0">
          <ParamsEditor
            items={queryParams}
            onChange={setQueryParams}
            paramHints={activeEndpoint?.queryParams}
            label="Query Param"
          />
        </TabsContent>

        <TabsContent value="headers" className="flex-1 overflow-auto mt-0">
          <HeadersEditor items={headers} onChange={setHeaders} />
        </TabsContent>

        {showBody && (
          <TabsContent value="body" className="flex-1 overflow-hidden mt-0">
            <BodyEditor />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
