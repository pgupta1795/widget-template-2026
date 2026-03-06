import { getSecurityContext } from '@/services/core/security-context-manager';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import type { ParsedCollection, ParsedEndpoint } from '../openapi/types';
import { useActiveSpecs } from '../hooks/use-active-specs';
import { useBuiltInSpecs } from '../hooks/use-built-in-specs';
import { useExecuteRequest } from '../hooks/use-execute-request';

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
  readOnly?: boolean;
  description?: string;
}

export interface HistoryEntry {
  id: string;
  method: string;
  path: string;
  serviceType: string;
  timestamp: number;
  status?: number;
  time?: number;
}

export interface ResponseState {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  time: number;
  size: number;
}

const newKv = (key = '', value = '', readOnly = false, description = ''): KeyValue => ({
  id: crypto.randomUUID(), key, value, enabled: true, readOnly, description,
});

const HISTORY_KEY = 'ae_history';

function loadHistory(): HistoryEntry[] {
  try {
    const s = localStorage.getItem(HISTORY_KEY);
    return s ? JSON.parse(s) : [];
  } catch { return []; }
}

interface ApiExplorerContextType {
  // Built-in specs
  builtInCollections: ParsedCollection[];
  builtInLoading: boolean;
  // Custom (dropped) collections
  customCollections: ParsedCollection[];
  addCustomCollection: (col: ParsedCollection) => void;
  removeCustomCollection: (id: string) => void;
  // Active spec management
  activeIds: Set<string>;
  toggleActive: (id: string) => void;
  isActive: (id: string) => boolean;
  // Active collections (built-in + custom that are activated)
  activeCollections: ParsedCollection[];
  // Active endpoint
  activeEndpoint: ParsedEndpoint | null;
  activeCollection: ParsedCollection | null;
  loadEndpoint: (collection: ParsedCollection, endpoint: ParsedEndpoint) => void;
  // Request editor state
  pathParams: KeyValue[];
  setPathParams: (v: KeyValue[]) => void;
  queryParams: KeyValue[];
  setQueryParams: (v: KeyValue[]) => void;
  headers: KeyValue[];
  setHeaders: (v: KeyValue[]) => void;
  body: string;
  setBody: (v: string) => void;
  // Execute
  sendRequest: () => void;
  loading: boolean;
  response: ResponseState | null;
  // History
  history: HistoryEntry[];
  clearHistory: () => void;
  loadHistoryEntry: (entry: HistoryEntry) => void;
}

const ApiExplorerContext = createContext<ApiExplorerContextType | null>(null);

export function useApiExplorer() {
  const ctx = useContext(ApiExplorerContext);
  if (!ctx) throw new Error('useApiExplorer must be used within ApiExplorerProvider');
  return ctx;
}

export function ApiExplorerProvider({ children }: { children: ReactNode }) {
  const { data: builtInCollections = [], isLoading: builtInLoading } = useBuiltInSpecs();
  const { activeIds, toggle: toggleActive, isActive } = useActiveSpecs();
  const executeMutation = useExecuteRequest();

  const [customCollections, setCustomCollections] = useState<ParsedCollection[]>([]);
  const [activeEndpoint, setActiveEndpoint] = useState<ParsedEndpoint | null>(null);
  const [activeCollection, setActiveCollection] = useState<ParsedCollection | null>(null);
  const [pathParams, setPathParams] = useState<KeyValue[]>([]);
  const [queryParams, setQueryParams] = useState<KeyValue[]>([newKv()]);
  const [headers, setHeaders] = useState<KeyValue[]>([]);
  const [body, setBody] = useState('');
  const [response, setResponse] = useState<ResponseState | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory());

  useEffect(() => {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }, [history]);

  const allCollections = [...builtInCollections, ...customCollections];
  const activeCollections = allCollections.filter(c => activeIds.has(c.id));

  const addCustomCollection = useCallback((col: ParsedCollection) => {
    setCustomCollections(prev => {
      const filtered = prev.filter(c => c.id !== col.id);
      return [...filtered, col];
    });
    // Auto-activate custom collections
    if (!activeIds.has(col.id)) toggleActive(col.id);
  }, [activeIds, toggleActive]);

  const removeCustomCollection = useCallback((id: string) => {
    setCustomCollections(prev => prev.filter(c => c.id !== id));
  }, []);

  const loadEndpoint = useCallback((collection: ParsedCollection, endpoint: ParsedEndpoint) => {
    setActiveEndpoint(endpoint);
    setActiveCollection(collection);
    setResponse(null);
    setBody(endpoint.exampleBody ?? '');

    // Path params
    setPathParams(
      endpoint.pathParams.map(p => newKv(p.name, '', false, p.description)),
    );

    // Query params: SecurityContext pre-populated from platform, then other params
    const sc = getSecurityContext() ?? '';
    const scParam = endpoint.queryParams.find(p => p.name === 'SecurityContext');
    const otherParams = endpoint.queryParams.filter(p => p.name !== 'SecurityContext');

    const qParams: KeyValue[] = [];
    if (scParam !== undefined) {
      qParams.push(newKv('SecurityContext', sc, false, 'Platform security context (editable)'));
    }
    for (const p of otherParams) {
      qParams.push(newKv(p.name, p.enum?.[0] ?? '', false, p.description));
    }
    if (qParams.length === 0) qParams.push(newKv());
    setQueryParams(qParams);

    // Headers: ENO_CSRF_TOKEN is read-only, plus other headers
    const hParams: KeyValue[] = [];
    for (const h of endpoint.headers) {
      if (h.name === 'ENO_CSRF_TOKEN') {
        hParams.push({ ...newKv('ENO_CSRF_TOKEN', '', true, 'Auto-managed by WAF pipeline'), readOnly: true });
      } else {
        hParams.push(newKv(h.name, '', false, h.description));
      }
    }
    // Always show ENO_CSRF_TOKEN even if not in spec
    if (!hParams.some(h => h.key === 'ENO_CSRF_TOKEN')) {
      hParams.unshift({ ...newKv('ENO_CSRF_TOKEN', '', true, 'Auto-managed by WAF pipeline'), readOnly: true });
    }
    setHeaders(hParams);
  }, []);

  const sendRequest = useCallback(() => {
    if (!activeEndpoint || !activeCollection) return;

    const pParams: Record<string, string> = {};
    for (const p of pathParams) {
      if (p.key) pParams[p.key] = p.value;
    }

    const qParams: Record<string, string> = {};
    for (const p of queryParams) {
      if (p.enabled && p.key && p.key !== 'ENO_CSRF_TOKEN') qParams[p.key] = p.value;
    }

    const extraHeaders: Record<string, string> = {};
    for (const h of headers) {
      if (h.enabled && h.key && !h.readOnly) extraHeaders[h.key] = h.value;
    }

    setResponse(null);
    executeMutation.mutate(
      {
        method: activeEndpoint.method,
        path: activeEndpoint.path,
        serviceType: activeCollection.serviceType,
        pathParams: pParams,
        queryParams: qParams,
        extraHeaders,
        body: body.trim() || undefined,
      },
      {
        onSuccess: (res) => {
          setResponse(res);
          setHistory(prev => [{
            id: crypto.randomUUID(),
            method: activeEndpoint.method,
            path: activeEndpoint.path,
            serviceType: activeCollection.serviceType,
            timestamp: Date.now(),
            status: res.status,
            time: res.time,
          }, ...prev].slice(0, 100));
        },
        onError: (err) => {
          setResponse({ status: 0, statusText: 'Error', headers: {}, data: { error: err.message }, time: 0, size: 0 });
        },
      },
    );
  }, [activeEndpoint, activeCollection, pathParams, queryParams, headers, body, executeMutation]);

  const clearHistory = useCallback(() => setHistory([]), []);

  const loadHistoryEntry = useCallback((entry: HistoryEntry) => {
    // Find matching endpoint across all collections and load it
    for (const col of allCollections) {
      for (const tag of col.tags) {
        const ep = tag.endpoints.find(
          e => e.path === entry.path && e.method === entry.method,
        );
        if (ep) { loadEndpoint(col, ep); return; }
      }
    }
  }, [allCollections, loadEndpoint]);

  return (
    <ApiExplorerContext.Provider value={{
      builtInCollections, builtInLoading,
      customCollections, addCustomCollection, removeCustomCollection,
      activeIds, toggleActive, isActive,
      activeCollections,
      activeEndpoint, activeCollection, loadEndpoint,
      pathParams, setPathParams,
      queryParams, setQueryParams,
      headers, setHeaders,
      body, setBody,
      sendRequest, loading: executeMutation.isPending, response,
      history, clearHistory, loadHistoryEntry,
    }}>
      {children}
    </ApiExplorerContext.Provider>
  );
}
