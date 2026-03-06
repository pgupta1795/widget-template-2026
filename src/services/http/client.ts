import { executePipeline } from './request-pipeline';
import type { HttpMethod, RequestOptions, ServiceConfig, ServiceResponse } from '../types';

export interface HttpClient {
  get<T = unknown>(url: string, opts?: RequestOptions): Promise<ServiceResponse<T>>;
  post<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<ServiceResponse<T>>;
  put<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<ServiceResponse<T>>;
  patch<T = unknown>(url: string, body?: unknown, opts?: RequestOptions): Promise<ServiceResponse<T>>;
  delete<T = unknown>(url: string, opts?: RequestOptions): Promise<ServiceResponse<T>>;
  execute<T = unknown>(method: HttpMethod, url: string, opts?: RequestOptions): Promise<ServiceResponse<T>>;
}

function withBody(body: unknown, opts: RequestOptions = {}): RequestOptions {
  if (body === undefined || body === null) return opts;

  const isObject = typeof body === 'object' && !(body instanceof Blob) &&
    !(body instanceof FormData) && !(body instanceof ArrayBuffer);

  if (!isObject) {
    return { ...opts, data: body as RequestOptions['data'] };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers ?? {}) };
  return { ...opts, data: JSON.stringify(body), headers };
}

export function createHttpClient(config: ServiceConfig = {}): HttpClient {
  const cfg: ServiceConfig = {
    defaultTimeout: 25000,
    retry: { maxAttempts: 2 },
    ...config,
  };

  return {
    get<T>(url: string, opts: RequestOptions = {}) {
      return executePipeline<T>('GET', url, opts, cfg);
    },
    post<T>(url: string, body?: unknown, opts: RequestOptions = {}) {
      return executePipeline<T>('POST', url, withBody(body, opts), cfg);
    },
    put<T>(url: string, body?: unknown, opts: RequestOptions = {}) {
      return executePipeline<T>('PUT', url, withBody(body, opts), cfg);
    },
    patch<T>(url: string, body?: unknown, opts: RequestOptions = {}) {
      return executePipeline<T>('PATCH', url, withBody(body, opts), cfg);
    },
    delete<T>(url: string, opts: RequestOptions = {}) {
      return executePipeline<T>('DELETE', url, opts, cfg);
    },
    execute<T>(method: HttpMethod, url: string, opts: RequestOptions = {}) {
      return executePipeline<T>(method, url, opts, cfg);
    },
  };
}

/** Default singleton client — works out of the box with no config */
export const httpClient: HttpClient = createHttpClient();
