import { getAPIs } from '@/lib/widget/api';
import { ServiceError, type RequestOptions, type ServiceResponse } from '../types';

type WAFDataUserOptions = Omit<RequestOptions, 'params' | 'csrfOverride' | 'useProxy' | 'proxyType' | 'retry'>;

function buildSize(data: unknown): number {
  try {
    return new Blob([typeof data === 'string' ? data : JSON.stringify(data)]).size;
  } catch {
    return 0;
  }
}

export function wafAuthenticatedRequest<T = unknown>(
  url: string,
  opts: WAFDataUserOptions,
): Promise<ServiceResponse<T>> {
  const { WAFData } = getAPIs();
  const start = performance.now();

  return new Promise((resolve, reject) => {
    WAFData.authenticatedRequest<T>(url, {
      ...opts,
      onComplete(data, headers) {
        const time = Math.round(performance.now() - start);
        resolve({
          data,
          status: 200,
          statusText: 'OK',
          headers: headers ?? {},
          time,
          size: buildSize(data),
        });
      },
      onFailure(error, response, headers) {
        const status = (error as any)?.status ?? 0;
        reject(new ServiceError(status, error?.message ?? 'Request failed', response, headers ?? {}));
      },
      onPassportError(error) {
        reject(new ServiceError(401, error?.message ?? 'Passport error', null, {}));
      },
      onTimeout() {
        reject(new ServiceError(408, 'Request timed out', null, {}));
      },
    });
  });
}

export function wafProxifiedRequest<T = unknown>(
  url: string,
  opts: WAFDataUserOptions & { proxyType?: RequestOptions['proxyType'] },
): Promise<ServiceResponse<T>> {
  const { WAFData } = getAPIs();
  const start = performance.now();
  const { proxyType, ...rest } = opts;

  return new Promise((resolve, reject) => {
    WAFData.proxifiedRequest<T>(url, {
      ...rest,
      ...(proxyType ? { proxy: proxyType } : {}),
      onComplete(data, headers) {
        const time = Math.round(performance.now() - start);
        resolve({
          data,
          status: 200,
          statusText: 'OK',
          headers: headers ?? {},
          time,
          size: buildSize(data),
        });
      },
      onFailure(error, response, headers) {
        const status = (error as any)?.status ?? 0;
        reject(new ServiceError(status, error?.message ?? 'Request failed', response, headers ?? {}));
      },
      onPassportError(error) {
        reject(new ServiceError(401, error?.message ?? 'Passport error', null, {}));
      },
      onTimeout() {
        reject(new ServiceError(408, 'Request timed out', null, {}));
      },
    });
  });
}
