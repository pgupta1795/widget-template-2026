import { createHttpClient } from '@/services/http/client';
import type { ServiceError } from '@/services/types';
import type { HttpMethod, ServiceType } from '../openapi/types';
import { resolveServiceUrl } from '../platform/url-resolver';

export interface ExecutorRequest {
  method: HttpMethod;
  /** OpenAPI path template e.g. /resources/v1/modeler/documents/{docId} */
  path: string;
  serviceType: ServiceType;
  /** Resolved path params — keys match {template} variables */
  pathParams: Record<string, string>;
  /** Query params (including SecurityContext if provided by user) */
  queryParams: Record<string, string>;
  /** Extra headers (ENO_CSRF_TOKEN managed by pipeline, but others pass through) */
  extraHeaders: Record<string, string>;
  /** Stringified JSON body */
  body?: string;
}

export interface ExecutorResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  time: number;
  size: number;
}

/** Substitutes {pathParam} placeholders in the path template */
function substitutePathParams(path: string, params: Record<string, string>): string {
  return path.replace(/\{([^}]+)\}/g, (_, key) => params[key] ?? `{${key}}`);
}

/**
 * Executes a 3DExperience API request through the WAF service pipeline.
 * CSRF and SecurityContext header injection are handled automatically by the pipeline.
 */
export async function executeWafRequest(req: ExecutorRequest): Promise<ExecutorResponse> {
  const baseUrl = await resolveServiceUrl(req.serviceType);

  // Substitute path params and strip leading slash (pipeline prepends base URL with /)
  const resolvedPath = substitutePathParams(req.path, req.pathParams);
  const relativePath = resolvedPath.replace(/^\//, '');

  // Create a per-request client with the resolved base URL
  const client = createHttpClient({ baseUrl });

  const opts = {
    params: Object.keys(req.queryParams).length > 0 ? req.queryParams : undefined,
    headers: Object.keys(req.extraHeaders).length > 0 ? req.extraHeaders : undefined,
    data: req.body ?? undefined,
    type: 'json' as const,
  };

  const start = performance.now();

  try {
    const result = await client.execute(req.method, relativePath, opts);
    return {
      status: result.status,
      statusText: result.statusText,
      headers: result.headers,
      data: result.data,
      time: result.time,
      size: result.size,
    };
  } catch (err) {
    const time = Math.round(performance.now() - start);
    const se = err as ServiceError;
    if (se?.status) {
      return {
        status: se.status,
        statusText: se.statusText,
        headers: se.headers ?? {},
        data: se.response,
        time,
        size: 0,
      };
    }
    return {
      status: 0,
      statusText: 'Network Error',
      headers: {},
      data: { error: (err as Error).message ?? 'Request failed' },
      time,
      size: 0,
    };
  }
}
