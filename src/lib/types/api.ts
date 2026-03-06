export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface KeyValue {
  id: string;
  key: string;
  value: string;
  enabled: boolean;
}

export interface RequestConfig {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: KeyValue[];
  params: KeyValue[];
  body: string;
  bodyType: 'json' | 'form-data' | 'raw';
}

export interface ResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
  time: number;
  size: number;
}

export interface Collection {
  id: string;
  name: string;
  requests: RequestConfig[];
}

export interface HistoryEntry {
  id: string;
  method: HttpMethod;
  url: string;
  timestamp: number;
  status?: number;
  time?: number;
}

export interface EnvVariable {
  id: string;
  key: string;
  value: string;
}

export interface ImportedApi {
  id: string;
  name: string;
  baseUrl: string;
  endpoints: ParsedEndpoint[];
}

export interface ParsedEndpoint {
  path: string;
  method: HttpMethod;
  summary: string;
  description: string;
  parameters: any[];
  requestBody: any;
  exampleBody: string;
}
