import { invalidate as invalidateCsrf, getToken } from '../core/csrf-manager';
import { is3DXUrl } from '../core/platform-resolver';
import { withRetry } from '../core/retry';
import { wafAuthenticatedRequest, wafProxifiedRequest } from '../core/waf-transport';
import {
  ServiceError,
  type HttpMethod,
  type RequestOptions,
  type ServiceConfig,
  type ServiceResponse,
} from '../types';

// is3DXUrl is imported as a utility for callers — transport choice is explicit via useProxy
export { is3DXUrl };

const CSRF_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH', 'DELETE'];

function buildUrl(url: string, params?: Record<string, string>): string {
  if (!params || Object.keys(params).length === 0) return url;
  try {
    const u = new URL(url);
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v);
    }
    return u.toString();
  } catch {
    // Relative URL — append manually
    const qs = new URLSearchParams(params).toString();
    return `${url}${url.includes('?') ? '&' : '?'}${qs}`;
  }
}

async function buildHeaders(
  method: HttpMethod,
  opts: RequestOptions,
  config: ServiceConfig,
): Promise<Record<string, string>> {
  const merged: Record<string, string> = {
    ...(config.defaultHeaders ?? {}),
    ...(opts.headers ?? {}),
  };

  if (CSRF_METHODS.includes(method)) {
    const { name, value } = opts.csrfOverride
      ? { name: 'ENO_CSRF_TOKEN', value: opts.csrfOverride }
      : await getToken();
    merged[name] = value;
  }

  return merged;
}

export async function executePipeline<T>(
  method: HttpMethod,
  url: string,
  opts: RequestOptions,
  config: ServiceConfig,
): Promise<ServiceResponse<T>> {
  const retryConfig = opts.retry ?? config.retry ?? { maxAttempts: 1 };

  const execute = async (): Promise<ServiceResponse<T>> => {
    const builtUrl = buildUrl(url, opts.params);
    const headers = await buildHeaders(method, opts, config);

    const { params, csrfOverride, useProxy, proxyType, retry, ...wafOpts } = opts;

    if (useProxy) {
      return wafProxifiedRequest<T>(builtUrl, { ...wafOpts, headers, proxyType });
    }
    return wafAuthenticatedRequest<T>(builtUrl, { ...wafOpts, headers });
  };

  return withRetry(async () => {
    try {
      return await execute();
    } catch (err) {
      if (err instanceof ServiceError && err.isCsrfExpiry) {
        invalidateCsrf();
      }
      throw err;
    }
  }, retryConfig);
}
