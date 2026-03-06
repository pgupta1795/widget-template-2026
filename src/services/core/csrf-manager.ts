import { getPlatformUrls } from './platform-resolver';
import { wafAuthenticatedRequest } from './waf-transport';
import type { CsrfToken } from '../types';

const CSRF_PATH = '/resources/v1/application/CSRF';

let cached: CsrfToken | null = null;
let pending: Promise<CsrfToken> | null = null;

export function resetCsrfManager(): void {
  cached = null;
  pending = null;
}

export function invalidate(): void {
  cached = null;
  // Do not clear `pending` — if a fetch is in-flight, let it complete
}

export function getToken(): Promise<CsrfToken> {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;

  pending = (async () => {
    const urls = await getPlatformUrls();
    const spaceUrl = urls['3DSpace'];
    if (!spaceUrl) throw new Error('3DSpace URL not found in platform services');

    const response = await wafAuthenticatedRequest<{ csrf: CsrfToken }>(
      `${spaceUrl}${CSRF_PATH}`,
      { type: 'json' }
    );

    cached = response.data.csrf;
    pending = null;
    return cached;
  })();

  return pending;
}
