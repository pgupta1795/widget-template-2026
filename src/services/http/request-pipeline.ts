import logger from '@/lib/logger';
import {getToken,invalidate as invalidateCsrf} from '@/services/core/csrf-manager';
import {getPlatformURL} from '@/services/core/platform-resolver';
import {withRetry} from '@/services/core/retry';
import {getSecurityContext} from '@/services/core/security-context-manager';
import {wafAuthenticatedRequest,wafProxifiedRequest} from '@/services/core/waf-transport';
import {
  ServiceError,
  type HttpMethod,
  type RequestOptions,
  type ServiceConfig,
  type ServiceResponse,
} from '@/services/types';

const CSRF_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH', 'DELETE'];

async function buildUrl(url: string, params?: Record<string, string>): Promise<string> {
  const spaceUrl = await getPlatformURL('3DSpace');
  const finalUrl = `${spaceUrl}/${url}`;
  if (!params || Object.keys(params).length === 0) return finalUrl;
  try {
    const u = new URL(finalUrl);
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v);
    }
    return u.toString();
  } catch {
    // Relative URL — append manually
    const qs = new URLSearchParams(params).toString();
    return `${finalUrl}${finalUrl.includes('?') ? '&' : '?'}${qs}`;
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

  const sc = getSecurityContext();
  if (sc) merged['SecurityContext'] = sc;

  if (CSRF_METHODS.includes(method)) {
    const { name, value } = opts.csrfOverride
      ? { name: 'ENO_CSRF_TOKEN', value: opts.csrfOverride }
      : await getToken();
    merged[name] = value;
  }
  logger.debug('Headers', merged);
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
    const builtUrl = await buildUrl(url, opts.params);
    logger.info('Sending Request to URL: ', builtUrl);
    const headers = await buildHeaders(method, opts, config);
    const { params, csrfOverride, useProxy, proxyType, retry, timeout: _timeout, ...wafOpts } = opts;
    const timeout = opts.timeout ?? config.defaultTimeout;

    if (useProxy) {
      return wafProxifiedRequest<T>(builtUrl, { ...wafOpts, headers, proxyType, timeout });
    }
    return wafAuthenticatedRequest<T>(builtUrl, { ...wafOpts, headers, timeout });
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
