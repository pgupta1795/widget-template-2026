import { executeRequest } from '@/app/services/apiClient';
import { parseOpenApiSpec } from '@/app/services/openApiParser';
import type { Collection, EnvVariable, HistoryEntry, HttpMethod, ImportedApi, KeyValue, ParsedEndpoint, RequestConfig, ResponseData } from '@/lib/types/api';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const newKv = (): KeyValue => ({ id: crypto.randomUUID(), key: '', value: '', enabled: true });

interface AppContextType {
  method: HttpMethod;
  setMethod: (m: HttpMethod) => void;
  url: string;
  setUrl: (u: string) => void;
  headers: KeyValue[];
  setHeaders: (h: KeyValue[]) => void;
  params: KeyValue[];
  setParams: (p: KeyValue[]) => void;
  body: string;
  setBody: (b: string) => void;
  bodyType: 'json' | 'form-data' | 'raw';
  setBodyType: (t: 'json' | 'form-data' | 'raw') => void;
  response: ResponseData | null;
  loading: boolean;
  sendRequest: () => Promise<void>;
  collections: Collection[];
  saveToCollection: (name: string) => void;
  deleteCollection: (id: string) => void;
  removeFromCollection: (collectionId: string, requestId: string) => void;
  history: HistoryEntry[];
  clearHistory: () => void;
  envVars: EnvVariable[];
  setEnvVars: (v: EnvVariable[]) => void;
  importedApis: ImportedApi[];
  importApiSpec: (content: string, filename: string) => void;
  removeImportedApi: (id: string) => void;
  importFromUrl: (url: string) => Promise<void>;
  loadEndpoint: (api: ImportedApi, endpoint: ParsedEndpoint) => void;
  loadHistoryEntry: (entry: HistoryEntry) => void;
  loadCollectionRequest: (req: RequestConfig) => void;
  requestName: string;
  setRequestName: (n: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

function loadStorage<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<KeyValue[]>([newKv()]);
  const [params, setParams] = useState<KeyValue[]>([newKv()]);
  const [body, setBody] = useState('');
  const [bodyType, setBodyType] = useState<'json' | 'form-data' | 'raw'>('json');
  const [requestName, setRequestName] = useState('');

  const [response, setResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState(false);

  const [collections, setCollections] = useState<Collection[]>(() => loadStorage('rf_collections', []));
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadStorage('rf_history', []));
  const [envVars, setEnvVars] = useState<EnvVariable[]>(() => loadStorage('rf_envVars', []));
  const [importedApis, setImportedApis] = useState<ImportedApi[]>(() => loadStorage('rf_importedApis', []));

  useEffect(() => { localStorage.setItem('rf_collections', JSON.stringify(collections)); }, [collections]);
  useEffect(() => { localStorage.setItem('rf_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('rf_envVars', JSON.stringify(envVars)); }, [envVars]);
  useEffect(() => { localStorage.setItem('rf_importedApis', JSON.stringify(importedApis)); }, [importedApis]);

  const sendRequest = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const result = await executeRequest({ method, url, headers, params, body, bodyType }, envVars);
      setResponse(result);
      setHistory(prev => [{
        id: crypto.randomUUID(), method, url,
        timestamp: Date.now(), status: result.status, time: result.time,
      }, ...prev].slice(0, 100));
    } catch (err: any) {
      setResponse({
        status: 0, statusText: 'Error', headers: {},
        data: { error: err.message }, time: 0, size: 0,
      });
    }
    setLoading(false);
  }, [method, url, headers, params, body, bodyType, envVars]);

  const saveToCollection = useCallback((collectionName: string) => {
    const req: RequestConfig = {
      id: crypto.randomUUID(),
      name: requestName || `${method} ${url}`,
      method, url, headers, params, body, bodyType,
    };
    setCollections(prev => {
      const existing = prev.find(c => c.name === collectionName);
      if (existing) {
        return prev.map(c => c.id === existing.id ? { ...c, requests: [...c.requests, req] } : c);
      }
      return [...prev, { id: crypto.randomUUID(), name: collectionName, requests: [req] }];
    });
  }, [method, url, headers, params, body, bodyType, requestName]);

  const deleteCollection = useCallback((id: string) => {
    setCollections(prev => prev.filter(c => c.id !== id));
  }, []);

  const removeFromCollection = useCallback((collectionId: string, requestId: string) => {
    setCollections(prev => prev.map(c =>
      c.id === collectionId ? { ...c, requests: c.requests.filter(r => r.id !== requestId) } : c
    ));
  }, []);

  const clearHistory = useCallback(() => setHistory([]), []);

  const importApiSpec = useCallback((content: string, filename: string) => {
    const api = parseOpenApiSpec(content, filename);
    setImportedApis(prev => [...prev, api]);
  }, []);

  const importFromUrl = useCallback(async (specUrl: string) => {
    const res = await fetch(specUrl);
    const text = await res.text();
    const filename = specUrl.split('/').pop() || 'spec.json';
    importApiSpec(text, filename);
  }, [importApiSpec]);

  const removeImportedApi = useCallback((id: string) => {
    setImportedApis(prev => prev.filter(a => a.id !== id));
  }, []);

  const loadEndpoint = useCallback((api: ImportedApi, endpoint: ParsedEndpoint) => {
    setMethod(endpoint.method);
    setUrl(`${api.baseUrl}${endpoint.path}`);
    setBody(endpoint.exampleBody || '');
    setBodyType('json');
    setHeaders([newKv()]);
    setParams([newKv()]);
    setRequestName(endpoint.summary || `${endpoint.method} ${endpoint.path}`);
    setResponse(null);
  }, []);

  const loadHistoryEntry = useCallback((entry: HistoryEntry) => {
    setMethod(entry.method);
    setUrl(entry.url);
    setResponse(null);
  }, []);

  const loadCollectionRequest = useCallback((req: RequestConfig) => {
    setMethod(req.method);
    setUrl(req.url);
    setHeaders(req.headers.length > 0 ? req.headers : [newKv()]);
    setParams(req.params.length > 0 ? req.params : [newKv()]);
    setBody(req.body);
    setBodyType(req.bodyType);
    setRequestName(req.name);
    setResponse(null);
  }, []);

  return (
    <AppContext.Provider value={{
      method, setMethod, url, setUrl, headers, setHeaders, params, setParams,
      body, setBody, bodyType, setBodyType, response, loading, sendRequest,
      collections, saveToCollection, deleteCollection, removeFromCollection,
      history, clearHistory, envVars, setEnvVars,
      importedApis, importApiSpec, removeImportedApi, importFromUrl,
      loadEndpoint, loadHistoryEntry, loadCollectionRequest,
      requestName, setRequestName,
    }}>
      {children}
    </AppContext.Provider>
  );
}
