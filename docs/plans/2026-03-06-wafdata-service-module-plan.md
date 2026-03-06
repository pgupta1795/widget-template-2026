# WAFData Service Module Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a composable, middleware-pipeline HTTP service layer in `src/services/` backed by `WAFData.authenticatedRequest`, with automatic CSRF management, configurable retry, platform URL resolution, and TanStack Query hooks.

**Architecture:** A factory function `createHttpClient()` returns a typed `HttpClient` whose methods (`get`, `post`, `put`, `patch`, `delete`, `execute`) all flow through a single `executePipeline()` middleware chain. The chain resolves transport (authenticated vs proxified), builds the URL, injects CSRF for state-changing methods, executes via WAFData, and retries on CSRF expiry. Singletons for CSRF and platform resolution are lazy-initialized on first use.

**Tech Stack:** TypeScript 5, Vitest 3, @testing-library/react 16, @tanstack/react-query 5, WAFData (3DExperience platform API mocked in tests via `vi.mock`)

**Design reference:** `docs/plans/2026-03-06-wafdata-service-module-design.md`

---

## Task 1: Vitest config + `types.ts`

**Files:**
- Modify: `vite.config.ts`
- Create: `src/services/types.ts`
- Create: `src/services/__tests__/types.test.ts`

### Step 1: Add Vitest config to `vite.config.ts`

Add `/// <reference types="vitest" />` at the top and a `test` block inside `defineConfig`. Slot it between `preview` and `build`:

```ts
/// <reference types="vitest" />
// (add at very top of file, line 1)
```

And add inside `defineConfig({...})`:

```ts
test: {
  environment: 'jsdom',
  globals: true,
  setupFiles: [],
  include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
},
```

### Step 2: Write the failing test

```ts
// src/services/__tests__/types.test.ts
import { describe, expect, it } from 'vitest';
import { ServiceError } from '../types';

describe('ServiceError', () => {
  it('constructs with status, statusText, response, headers', () => {
    const err = new ServiceError(403, 'Forbidden', { error: 'csrf' }, { 'x-csrf': 'abc' });
    expect(err.status).toBe(403);
    expect(err.statusText).toBe('Forbidden');
    expect(err.response).toEqual({ error: 'csrf' });
    expect(err.headers).toEqual({ 'x-csrf': 'abc' });
    expect(err.message).toBe('403 Forbidden');
  });

  it('isCsrfExpiry is true for 403', () => {
    const err = new ServiceError(403, 'Forbidden', null, {});
    expect(err.isCsrfExpiry).toBe(true);
    expect(err.isUnauthorized).toBe(false);
    expect(err.isTimeout).toBe(false);
  });

  it('isUnauthorized is true for 401', () => {
    const err = new ServiceError(401, 'Unauthorized', null, {});
    expect(err.isUnauthorized).toBe(true);
    expect(err.isCsrfExpiry).toBe(false);
  });

  it('isTimeout is true for 408', () => {
    const err = new ServiceError(408, 'Timeout', null, {});
    expect(err.isTimeout).toBe(true);
  });

  it('is an instance of Error', () => {
    const err = new ServiceError(500, 'Internal Server Error', null, {});
    expect(err).toBeInstanceOf(Error);
  });
});
```

### Step 3: Run test to verify it fails

```bash
cd "C:\UK VM\Issues\widgets\templates\tanstack-start-widget-template"
npx vitest run src/services/__tests__/types.test.ts
```

Expected: FAIL — `Cannot find module '../types'`

### Step 4: Create `src/services/types.ts`

```ts
import type { WAFDataBaseRequestOptions } from '@/lib/types/WAFData';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

/** WAFData options the pipeline owns — callers must not set these directly */
type ManagedByPipeline =
  | 'onComplete'
  | 'onFailure'
  | 'onPassportError'
  | 'onTimeout'
  | 'method';

/**
 * Per-request options.
 * Extends WAFDataBaseRequestOptions so callers have access to all base WAFData
 * options (async, data, type, responseType, headers, timeout, cache,
 * onProgress, onUploadProgress) plus service-layer additions.
 */
export interface RequestOptions
  extends Omit<WAFDataBaseRequestOptions, ManagedByPipeline> {
  /** URL query parameters — merged into the URL before dispatch */
  params?: Record<string, string>;
  /** Caller-supplied CSRF token — skips auto-inject when provided */
  csrfOverride?: string;
  /** Force proxifiedRequest instead of authenticatedRequest */
  useProxy?: boolean;
  /** Proxy channel when useProxy is true. Maps to WAFData proxy option */
  proxyType?: 'ajax' | 'passport' | 'feed' | 'xml' | 'soap';
  /** Per-request retry override */
  retry?: RetryConfig;
}

/** Global service configuration — set once at createHttpClient() */
export interface ServiceConfig {
  defaultTimeout?: number;
  retry?: RetryConfig;
  defaultHeaders?: Record<string, string>;
}

export interface RetryConfig {
  maxAttempts: number;
  shouldRetry?: (error: ServiceError) => boolean;
  delayMs?: number;
}

export interface ServiceResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  time: number;   // ms
  size: number;   // bytes
}

export interface CsrfToken {
  name: string;
  value: string;
}

export class ServiceError extends Error {
  constructor(
    public readonly status: number,
    public readonly statusText: string,
    public readonly response: unknown,
    public readonly headers: Record<string, string>,
  ) {
    super(`${status} ${statusText}`);
    this.name = 'ServiceError';
    // Restore prototype chain (needed for instanceof checks in transpiled code)
    Object.setPrototypeOf(this, new.target.prototype);
  }

  get isCsrfExpiry(): boolean  { return this.status === 403; }
  get isUnauthorized(): boolean { return this.status === 401; }
  get isTimeout(): boolean      { return this.status === 408; }
}
```

### Step 5: Run test to verify it passes

```bash
npx vitest run src/services/__tests__/types.test.ts
```

Expected: All 5 tests PASS

### Step 6: Commit

```bash
cd "C:\UK VM\Issues\widgets\templates\tanstack-start-widget-template"
git add vite.config.ts src/services/types.ts src/services/__tests__/types.test.ts
git commit -m "feat(services): add types and ServiceError with vitest config"
```

---

## Task 2: `core/waf-transport.ts`

**Files:**
- Create: `src/services/core/waf-transport.ts`
- Create: `src/services/__tests__/waf-transport.test.ts`

WAFData uses callbacks — this module is the only one that touches `WAFData` directly. It wraps both methods into Promises.

### Step 1: Write the failing test

```ts
// src/services/__tests__/waf-transport.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the platform API registry
vi.mock('@/lib/widget/api', () => ({
  getAPIs: vi.fn(),
}));

import { getAPIs } from '@/lib/widget/api';
import { ServiceError } from '../types';
import { wafAuthenticatedRequest, wafProxifiedRequest } from '../core/waf-transport';

const mockWAFData = {
  authenticatedRequest: vi.fn(),
  proxifiedRequest: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getAPIs).mockReturnValue({ WAFData: mockWAFData } as any);
});

describe('wafAuthenticatedRequest', () => {
  it('resolves with ServiceResponse on onComplete', async () => {
    mockWAFData.authenticatedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onComplete('{"ok":true}', { 'content-type': 'application/json' });
      return { cancel: vi.fn(), xhr: {} };
    });

    const result = await wafAuthenticatedRequest('https://3dspace.example.com/api', { type: 'json' });

    expect(result.data).toBe('{"ok":true}');
    expect(result.status).toBe(200);
    expect(result.statusText).toBe('OK');
    expect(result.headers).toEqual({ 'content-type': 'application/json' });
    expect(result.time).toBeGreaterThanOrEqual(0);
    expect(result.size).toBeGreaterThan(0);
  });

  it('rejects with ServiceError on onFailure', async () => {
    mockWAFData.authenticatedRequest.mockImplementation((_url: string, opts: any) => {
      const err = Object.assign(new Error('Forbidden'), { status: 403 });
      opts.onFailure(err, '{"error":"csrf"}', { 'x-error': 'csrf' });
      return { cancel: vi.fn(), xhr: {} };
    });

    await expect(
      wafAuthenticatedRequest('https://3dspace.example.com/api', {})
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('rejects with ServiceError on onTimeout', async () => {
    mockWAFData.authenticatedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onTimeout();
      return { cancel: vi.fn(), xhr: {} };
    });

    const err = await wafAuthenticatedRequest('https://3dspace.example.com/api', {}).catch(e => e);
    expect(err).toBeInstanceOf(ServiceError);
    expect(err.status).toBe(408);
  });

  it('passes onProgress callback to WAFData', async () => {
    const onProgress = vi.fn();
    mockWAFData.authenticatedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onComplete('ok', {});
      return { cancel: vi.fn(), xhr: {} };
    });

    await wafAuthenticatedRequest('https://3dspace.example.com/api', { onProgress });
    expect(mockWAFData.authenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ onProgress })
    );
  });
});

describe('wafProxifiedRequest', () => {
  it('resolves with ServiceResponse on onComplete', async () => {
    mockWAFData.proxifiedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onComplete('hello', {});
      return { cancel: vi.fn(), xhr: {} };
    });

    const result = await wafProxifiedRequest('https://external.example.com/api', { proxyType: 'ajax' });
    expect(result.data).toBe('hello');
    expect(result.status).toBe(200);
  });

  it('passes proxy option to WAFData', async () => {
    mockWAFData.proxifiedRequest.mockImplementation((_url: string, opts: any) => {
      opts.onComplete('', {});
      return { cancel: vi.fn(), xhr: {} };
    });

    await wafProxifiedRequest('https://external.example.com/api', { proxyType: 'feed' });
    expect(mockWAFData.proxifiedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ proxy: 'feed' })
    );
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/services/__tests__/waf-transport.test.ts
```

Expected: FAIL — `Cannot find module '../core/waf-transport'`

### Step 3: Create `src/services/core/waf-transport.ts`

```ts
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
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/services/__tests__/waf-transport.test.ts
```

Expected: All tests PASS

### Step 5: Commit

```bash
git add src/services/core/waf-transport.ts src/services/__tests__/waf-transport.test.ts
git commit -m "feat(services): add waf-transport — WAFData callback to Promise adapter"
```

---

## Task 3: `core/platform-resolver.ts`

**Files:**
- Create: `src/services/core/platform-resolver.ts`
- Create: `src/services/__tests__/platform-resolver.test.ts`

Resolves 3DX platform URLs once, memoizes forever.

### Step 1: Write the failing test

```ts
// src/services/__tests__/platform-resolver.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/widget/api', () => ({
  getAPIs: vi.fn(),
  getWidget: vi.fn(),
}));

import { getAPIs, getWidget } from '@/lib/widget/api';
import { getPlatformUrls, is3DXUrl, resetPlatformResolver } from '../core/platform-resolver';

const mockServices = {
  getPlatformServices: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  resetPlatformResolver(); // clear singleton cache between tests
  vi.mocked(getWidget).mockReturnValue({ getValue: () => 'OnPremise' } as any);
  vi.mocked(getAPIs).mockReturnValue({ i3DXCompassServices: mockServices } as any);
});

describe('getPlatformUrls', () => {
  it('resolves 3DX platform URL map on first call', async () => {
    mockServices.getPlatformServices.mockImplementation(({ onComplete }: any) => {
      onComplete([{ '3DSpace': 'https://3dspace.example.com', '3DCompass': 'https://compass.example.com' }]);
    });

    const urls = await getPlatformUrls();
    expect(urls['3DSpace']).toBe('https://3dspace.example.com');
    expect(urls['3DCompass']).toBe('https://compass.example.com');
  });

  it('returns cached result on second call without re-fetching', async () => {
    mockServices.getPlatformServices.mockImplementation(({ onComplete }: any) => {
      onComplete([{ '3DSpace': 'https://3dspace.example.com' }]);
    });

    await getPlatformUrls();
    await getPlatformUrls();

    expect(mockServices.getPlatformServices).toHaveBeenCalledTimes(1);
  });

  it('rejects when onFailure is called', async () => {
    mockServices.getPlatformServices.mockImplementation(({ onFailure }: any) => {
      onFailure(new Error('network error'));
    });

    await expect(getPlatformUrls()).rejects.toThrow('network error');
  });
});

describe('is3DXUrl', () => {
  it('returns true for URLs starting with a known platform URL', async () => {
    mockServices.getPlatformServices.mockImplementation(({ onComplete }: any) => {
      onComplete([{ '3DSpace': 'https://3dspace.example.com' }]);
    });

    expect(await is3DXUrl('https://3dspace.example.com/resources/v1/application/CSRF')).toBe(true);
  });

  it('returns false for external URLs', async () => {
    mockServices.getPlatformServices.mockImplementation(({ onComplete }: any) => {
      onComplete([{ '3DSpace': 'https://3dspace.example.com' }]);
    });

    expect(await is3DXUrl('https://api.external.com/data')).toBe(false);
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/services/__tests__/platform-resolver.test.ts
```

Expected: FAIL — `Cannot find module '../core/platform-resolver'`

### Step 3: Create `src/services/core/platform-resolver.ts`

```ts
import { getAPIs, getWidget } from '@/lib/widget/api';

let cache: Record<string, string> | null = null;
let pending: Promise<Record<string, string>> | null = null;

export function resetPlatformResolver(): void {
  cache = null;
  pending = null;
}

export function getPlatformUrls(): Promise<Record<string, string>> {
  if (cache) return Promise.resolve(cache);
  if (pending) return pending;

  const { i3DXCompassServices } = getAPIs();
  const widget = getWidget();
  const tenant = widget.getValue('tenant') || 'OnPremise';

  pending = new Promise<Record<string, string>>((resolve, reject) => {
    (i3DXCompassServices as any).getPlatformServices({
      tenant,
      onComplete(data: any) {
        const services: Record<string, string> = Array.isArray(data) ? data[0] : data;
        cache = Object.freeze(services);
        pending = null;
        resolve(cache);
      },
      onFailure(err: Error) {
        pending = null;
        reject(err);
      },
    });
  });

  return pending;
}

export async function is3DXUrl(url: string): Promise<boolean> {
  const urls = await getPlatformUrls();
  return Object.values(urls).some(base => url.startsWith(base));
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/services/__tests__/platform-resolver.test.ts
```

Expected: All tests PASS

### Step 5: Commit

```bash
git add src/services/core/platform-resolver.ts src/services/__tests__/platform-resolver.test.ts
git commit -m "feat(services): add platform-resolver — lazy singleton for 3DX URL resolution"
```

---

## Task 4: `core/csrf-manager.ts`

**Files:**
- Create: `src/services/core/csrf-manager.ts`
- Create: `src/services/__tests__/csrf-manager.test.ts`

Fetches CSRF token from 3DSpace, caches it, invalidates on expiry.

### Step 1: Write the failing test

```ts
// src/services/__tests__/csrf-manager.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/widget/api', () => ({
  getAPIs: vi.fn(),
  getWidget: vi.fn(),
}));
vi.mock('../core/platform-resolver', () => ({
  getPlatformUrls: vi.fn(),
}));
vi.mock('../core/waf-transport', () => ({
  wafAuthenticatedRequest: vi.fn(),
}));

import { getAPIs, getWidget } from '@/lib/widget/api';
import { getPlatformUrls } from '../core/platform-resolver';
import { wafAuthenticatedRequest } from '../core/waf-transport';
import { getToken, invalidate, resetCsrfManager } from '../core/csrf-manager';

beforeEach(() => {
  vi.clearAllMocks();
  resetCsrfManager();
  vi.mocked(getPlatformUrls).mockResolvedValue({ '3DSpace': 'https://3dspace.example.com' });
  vi.mocked(getWidget).mockReturnValue({ getValue: () => null } as any);
  vi.mocked(getAPIs).mockReturnValue({} as any);
});

describe('getToken', () => {
  it('fetches and returns CSRF token', async () => {
    vi.mocked(wafAuthenticatedRequest).mockResolvedValue({
      data: { csrf: { name: 'ENO_CSRF_TOKEN', value: 'abc123' } },
      status: 200, statusText: 'OK', headers: {}, time: 10, size: 50,
    });

    const token = await getToken();
    expect(token).toEqual({ name: 'ENO_CSRF_TOKEN', value: 'abc123' });
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      'https://3dspace.example.com/resources/v1/application/CSRF',
      expect.objectContaining({ type: 'json' })
    );
  });

  it('returns cached token on second call without re-fetching', async () => {
    vi.mocked(wafAuthenticatedRequest).mockResolvedValue({
      data: { csrf: { name: 'ENO_CSRF_TOKEN', value: 'abc123' } },
      status: 200, statusText: 'OK', headers: {}, time: 10, size: 50,
    });

    await getToken();
    await getToken();
    expect(wafAuthenticatedRequest).toHaveBeenCalledTimes(1);
  });

  it('re-fetches after invalidate()', async () => {
    vi.mocked(wafAuthenticatedRequest).mockResolvedValue({
      data: { csrf: { name: 'ENO_CSRF_TOKEN', value: 'abc123' } },
      status: 200, statusText: 'OK', headers: {}, time: 10, size: 50,
    });

    await getToken();
    invalidate();
    await getToken();
    expect(wafAuthenticatedRequest).toHaveBeenCalledTimes(2);
  });

  it('rejects if CSRF fetch fails', async () => {
    const { ServiceError } = await import('../types');
    vi.mocked(wafAuthenticatedRequest).mockRejectedValue(
      new ServiceError(500, 'Internal Server Error', null, {})
    );

    await expect(getToken()).rejects.toThrow('500 Internal Server Error');
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/services/__tests__/csrf-manager.test.ts
```

Expected: FAIL — `Cannot find module '../core/csrf-manager'`

### Step 3: Create `src/services/core/csrf-manager.ts`

```ts
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
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/services/__tests__/csrf-manager.test.ts
```

Expected: All tests PASS

### Step 5: Commit

```bash
git add src/services/core/csrf-manager.ts src/services/__tests__/csrf-manager.test.ts
git commit -m "feat(services): add csrf-manager — auto fetch, cache, and invalidate CSRF token"
```

---

## Task 5: `core/retry.ts`

**Files:**
- Create: `src/services/core/retry.ts`
- Create: `src/services/__tests__/retry.test.ts`

Pure, stateless retry executor. No side effects.

### Step 1: Write the failing test

```ts
// src/services/__tests__/retry.test.ts
import { describe, expect, it, vi } from 'vitest';
import { ServiceError } from '../types';
import { withRetry } from '../core/retry';

describe('withRetry', () => {
  it('resolves immediately if fn succeeds on first attempt', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxAttempts: 3 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries up to maxAttempts when shouldRetry returns true', async () => {
    const err = new ServiceError(403, 'Forbidden', null, {});
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');

    const result = await withRetry(fn, { maxAttempts: 3, delayMs: 0 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('throws after maxAttempts are exhausted', async () => {
    const err = new ServiceError(403, 'Forbidden', null, {});
    const fn = vi.fn().mockRejectedValue(err);

    await expect(withRetry(fn, { maxAttempts: 2, delayMs: 0 })).rejects.toBeInstanceOf(ServiceError);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('does not retry when shouldRetry returns false', async () => {
    const err = new ServiceError(500, 'Server Error', null, {});
    const fn = vi.fn().mockRejectedValue(err);

    await expect(
      withRetry(fn, { maxAttempts: 3, shouldRetry: () => false, delayMs: 0 })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('uses isCsrfExpiry as default shouldRetry', async () => {
    const csrfErr = new ServiceError(403, 'Forbidden', null, {});
    const otherErr = new ServiceError(500, 'Error', null, {});
    const fn = vi.fn()
      .mockRejectedValueOnce(csrfErr)  // should retry
      .mockRejectedValue(otherErr);    // should NOT retry

    await expect(withRetry(fn, { maxAttempts: 3, delayMs: 0 })).rejects.toBeInstanceOf(ServiceError);
    // Called twice: first (403 → retry), second (500 → stop)
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('waits delayMs between retries', async () => {
    vi.useFakeTimers();
    const err = new ServiceError(403, 'Forbidden', null, {});
    const fn = vi.fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValue('ok');

    const promise = withRetry(fn, { maxAttempts: 2, delayMs: 100 });
    await vi.advanceTimersByTimeAsync(100);
    const result = await promise;
    expect(result).toBe('ok');
    vi.useRealTimers();
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/services/__tests__/retry.test.ts
```

Expected: FAIL — `Cannot find module '../core/retry'`

### Step 3: Create `src/services/core/retry.ts`

```ts
import { ServiceError, type RetryConfig } from '../types';

const DEFAULT_SHOULD_RETRY = (error: ServiceError) => error.isCsrfExpiry;

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig,
): Promise<T> {
  const { maxAttempts, shouldRetry = DEFAULT_SHOULD_RETRY, delayMs = 0 } = config;
  let lastError: ServiceError;
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      return await fn();
    } catch (err) {
      attempts++;
      if (!(err instanceof ServiceError)) throw err;
      lastError = err;
      if (attempts >= maxAttempts || !shouldRetry(err)) throw err;
      if (delayMs > 0) await delay(delayMs);
    }
  }

  throw lastError!;
}
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/services/__tests__/retry.test.ts
```

Expected: All 6 tests PASS

### Step 5: Commit

```bash
git add src/services/core/retry.ts src/services/__tests__/retry.test.ts
git commit -m "feat(services): add retry — pure configurable retry executor with CSRF-expiry default"
```

---

## Task 6: `http/request-pipeline.ts`

**Files:**
- Create: `src/services/http/request-pipeline.ts`
- Create: `src/services/__tests__/request-pipeline.test.ts`

The middleware chain that composes transport, CSRF, and retry.

### Step 1: Write the failing test

```ts
// src/services/__tests__/request-pipeline.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../core/waf-transport', () => ({
  wafAuthenticatedRequest: vi.fn(),
  wafProxifiedRequest: vi.fn(),
}));
vi.mock('../core/platform-resolver', () => ({
  is3DXUrl: vi.fn(),
}));
vi.mock('../core/csrf-manager', () => ({
  getToken: vi.fn(),
  invalidate: vi.fn(),
}));

import { wafAuthenticatedRequest, wafProxifiedRequest } from '../core/waf-transport';
import { is3DXUrl } from '../core/platform-resolver';
import { getToken, invalidate } from '../core/csrf-manager';
import { ServiceError } from '../types';
import { executePipeline } from '../http/request-pipeline';

const okResponse = { data: 'result', status: 200, statusText: 'OK', headers: {}, time: 5, size: 10 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(is3DXUrl).mockResolvedValue(true);
  vi.mocked(wafAuthenticatedRequest).mockResolvedValue(okResponse as any);
  vi.mocked(wafProxifiedRequest).mockResolvedValue(okResponse as any);
  vi.mocked(getToken).mockResolvedValue({ name: 'ENO_CSRF_TOKEN', value: 'tok123' });
});

describe('executePipeline — transport selection', () => {
  it('uses authenticatedRequest for 3DX URLs by default', async () => {
    vi.mocked(is3DXUrl).mockResolvedValue(true);
    await executePipeline('GET', 'https://3dspace.example.com/api', {}, {});
    expect(wafAuthenticatedRequest).toHaveBeenCalled();
    expect(wafProxifiedRequest).not.toHaveBeenCalled();
  });

  it('uses authenticatedRequest even for non-3DX URLs when useProxy is not set', async () => {
    vi.mocked(is3DXUrl).mockResolvedValue(false);
    await executePipeline('GET', 'https://external.example.com/api', {}, {});
    expect(wafAuthenticatedRequest).toHaveBeenCalled();
  });

  it('uses proxifiedRequest when useProxy is true', async () => {
    await executePipeline('GET', 'https://external.example.com/api', { useProxy: true }, {});
    expect(wafProxifiedRequest).toHaveBeenCalled();
    expect(wafAuthenticatedRequest).not.toHaveBeenCalled();
  });
});

describe('executePipeline — URL building', () => {
  it('appends params to URL as query string', async () => {
    await executePipeline('GET', 'https://3dspace.example.com/api', { params: { foo: 'bar', baz: '1' } }, {});
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      expect.stringContaining('foo=bar'),
      expect.any(Object)
    );
  });
});

describe('executePipeline — CSRF injection', () => {
  it('injects CSRF header for POST requests', async () => {
    await executePipeline('POST', 'https://3dspace.example.com/api', {}, {});
    expect(getToken).toHaveBeenCalled();
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ ENO_CSRF_TOKEN: 'tok123' }),
      })
    );
  });

  it('does NOT inject CSRF for GET requests', async () => {
    await executePipeline('GET', 'https://3dspace.example.com/api', {}, {});
    expect(getToken).not.toHaveBeenCalled();
  });

  it('uses csrfOverride when provided, skipping getToken()', async () => {
    await executePipeline('POST', 'https://3dspace.example.com/api', { csrfOverride: 'my-token' }, {});
    expect(getToken).not.toHaveBeenCalled();
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ ENO_CSRF_TOKEN: 'my-token' }),
      })
    );
  });

  it('invalidates CSRF and retries on 403', async () => {
    const csrfErr = new ServiceError(403, 'Forbidden', null, {});
    vi.mocked(wafAuthenticatedRequest)
      .mockRejectedValueOnce(csrfErr)
      .mockResolvedValue(okResponse as any);

    const result = await executePipeline('POST', 'https://3dspace.example.com/api', {}, { retry: { maxAttempts: 2 } });
    expect(invalidate).toHaveBeenCalled();
    expect(wafAuthenticatedRequest).toHaveBeenCalledTimes(2);
    expect(result.data).toBe('result');
  });
});

describe('executePipeline — default headers', () => {
  it('merges defaultHeaders from ServiceConfig into request', async () => {
    await executePipeline('GET', 'https://3dspace.example.com/api', {}, { defaultHeaders: { 'X-App': 'widget' } });
    expect(wafAuthenticatedRequest).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ 'X-App': 'widget' }) })
    );
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/services/__tests__/request-pipeline.test.ts
```

Expected: FAIL — `Cannot find module '../http/request-pipeline'`

### Step 3: Create `src/services/http/request-pipeline.ts`

```ts
import { invalidate as invalidateCsrf, getToken } from '../core/csrf-manager';
import { is3DXUrl } from '../core/platform-resolver';
import { withRetry } from '../core/retry';
import { wafAuthenticatedRequest, wafProxifiedRequest } from '../core/waf-transport';
import { ServiceError, type HttpMethod, type RequestOptions, type ServiceConfig, type ServiceResponse } from '../types';

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
    if (opts.csrfOverride) {
      merged[opts.csrfOverride] = opts.csrfOverride; // name used as key — override pattern
      // Actually: caller provides the raw token value; name comes from the CSRF response
      // Use a fixed header key pattern: inject as { [csrfName]: csrfValue }
      // Since csrfOverride is the value, we still need the name. Use a sentinel key.
      // Re-design: treat csrfOverride as the token VALUE, inject under ENO_CSRF_TOKEN key.
    }
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
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/services/__tests__/request-pipeline.test.ts
```

Expected: All tests PASS

### Step 5: Commit

```bash
git add src/services/http/request-pipeline.ts src/services/__tests__/request-pipeline.test.ts
git commit -m "feat(services): add request-pipeline — transport, CSRF, and retry middleware chain"
```

---

## Task 7: `http/client.ts`

**Files:**
- Create: `src/services/http/client.ts`
- Create: `src/services/__tests__/client.test.ts`

Factory that returns the typed `HttpClient` and exports a default singleton.

### Step 1: Write the failing test

```ts
// src/services/__tests__/client.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../http/request-pipeline', () => ({
  executePipeline: vi.fn(),
}));

import { executePipeline } from '../http/request-pipeline';
import { createHttpClient } from '../http/client';

const ok = { data: 'ok', status: 200, statusText: 'OK', headers: {}, time: 5, size: 2 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(executePipeline).mockResolvedValue(ok as any);
});

describe('createHttpClient', () => {
  it('get() calls executePipeline with GET method', async () => {
    const client = createHttpClient();
    await client.get('https://example.com/api');
    expect(executePipeline).toHaveBeenCalledWith('GET', 'https://example.com/api', {}, expect.any(Object));
  });

  it('post() calls executePipeline with POST and serializes body into opts.data', async () => {
    const client = createHttpClient();
    const body = { name: 'test' };
    await client.post('https://example.com/api', body);
    expect(executePipeline).toHaveBeenCalledWith(
      'POST',
      'https://example.com/api',
      expect.objectContaining({ data: JSON.stringify(body) }),
      expect.any(Object)
    );
  });

  it('post() does not override Content-Type if caller already set it', async () => {
    const client = createHttpClient();
    await client.post('https://example.com/api', { x: 1 }, { headers: { 'Content-Type': 'text/plain' } });
    expect(executePipeline).toHaveBeenCalledWith(
      'POST',
      expect.any(String),
      expect.objectContaining({ headers: expect.objectContaining({ 'Content-Type': 'text/plain' }) }),
      expect.any(Object)
    );
  });

  it('put(), patch(), delete() pass correct methods', async () => {
    const client = createHttpClient();
    await client.put('https://example.com/api', {});
    expect(executePipeline).toHaveBeenCalledWith('PUT', expect.any(String), expect.any(Object), expect.any(Object));

    await client.patch('https://example.com/api', {});
    expect(executePipeline).toHaveBeenCalledWith('PATCH', expect.any(String), expect.any(Object), expect.any(Object));

    await client.delete('https://example.com/api');
    expect(executePipeline).toHaveBeenCalledWith('DELETE', expect.any(String), expect.any(Object), expect.any(Object));
  });

  it('execute() passes method and opts directly', async () => {
    const client = createHttpClient();
    await client.execute('PATCH', 'https://example.com/api', { timeout: 5000 });
    expect(executePipeline).toHaveBeenCalledWith('PATCH', 'https://example.com/api', { timeout: 5000 }, expect.any(Object));
  });

  it('merges ServiceConfig defaults into pipeline calls', async () => {
    const client = createHttpClient({ defaultTimeout: 10000, defaultHeaders: { 'X-App': 'widget' } });
    await client.get('https://example.com/api');
    expect(executePipeline).toHaveBeenCalledWith(
      'GET',
      expect.any(String),
      expect.any(Object),
      expect.objectContaining({ defaultTimeout: 10000, defaultHeaders: { 'X-App': 'widget' } })
    );
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/services/__tests__/client.test.ts
```

Expected: FAIL — `Cannot find module '../http/client'`

### Step 3: Create `src/services/http/client.ts`

```ts
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
```

### Step 4: Run test to verify it passes

```bash
npx vitest run src/services/__tests__/client.test.ts
```

Expected: All tests PASS

### Step 5: Commit

```bash
git add src/services/http/client.ts src/services/__tests__/client.test.ts
git commit -m "feat(services): add createHttpClient factory with get/post/put/patch/delete/execute"
```

---

## Task 8: `hooks/use-waf-query.ts` + `hooks/use-waf-mutation.ts`

**Files:**
- Create: `src/services/hooks/use-waf-query.ts`
- Create: `src/services/hooks/use-waf-mutation.ts`
- Create: `src/services/__tests__/hooks.test.tsx`

TanStack Query wrappers. Tests use `@testing-library/react` with a `QueryClient` wrapper.

### Step 1: Write the failing test

```tsx
// src/services/__tests__/hooks.test.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../http/client', () => ({
  httpClient: {
    get: vi.fn(),
    execute: vi.fn(),
  },
}));

import { httpClient } from '../http/client';
import { useWafMutation } from '../hooks/use-waf-mutation';
import { useWafQuery } from '../hooks/use-waf-query';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const ok = { data: { id: 1 }, status: 200, statusText: 'OK', headers: {}, time: 5, size: 10 };

beforeEach(() => vi.clearAllMocks());

describe('useWafQuery', () => {
  it('fetches data via httpClient.get and returns it', async () => {
    vi.mocked(httpClient.get).mockResolvedValue(ok as any);

    const { result } = renderHook(
      () => useWafQuery('https://example.com/api'),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.data).toEqual({ id: 1 });
    expect(httpClient.get).toHaveBeenCalledWith('https://example.com/api', expect.any(Object));
  });

  it('is disabled when enabled: false', () => {
    const { result } = renderHook(
      () => useWafQuery('https://example.com/api', { enabled: false }),
      { wrapper }
    );
    expect(result.current.isPending).toBe(true);
    expect(httpClient.get).not.toHaveBeenCalled();
  });
});

describe('useWafMutation', () => {
  it('calls httpClient.execute with correct method and body', async () => {
    vi.mocked(httpClient.execute).mockResolvedValue(ok as any);

    const { result } = renderHook(
      () => useWafMutation('POST', 'https://example.com/api'),
      { wrapper }
    );

    result.current.mutate({ name: 'test' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(httpClient.execute).toHaveBeenCalledWith(
      'POST',
      'https://example.com/api',
      expect.objectContaining({ data: { name: 'test' } })
    );
  });
});
```

### Step 2: Run test to verify it fails

```bash
npx vitest run src/services/__tests__/hooks.test.tsx
```

Expected: FAIL — `Cannot find module '../hooks/use-waf-query'`

### Step 3: Create `src/services/hooks/use-waf-query.ts`

```ts
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { httpClient } from '../http/client';
import type { RequestOptions, ServiceError, ServiceResponse } from '../types';

export interface UseWafQueryOptions extends RequestOptions {
  queryKey?: unknown[];
  enabled?: boolean;
}

export function useWafQuery<T = unknown>(
  url: string,
  opts: UseWafQueryOptions = {},
): UseQueryResult<ServiceResponse<T>, ServiceError> {
  const { queryKey: extraKey, enabled, ...requestOpts } = opts;

  return useQuery<ServiceResponse<T>, ServiceError>({
    queryKey: ['waf', url, requestOpts.params, ...(extraKey ?? [])],
    queryFn: () => httpClient.get<T>(url, requestOpts),
    enabled,
  });
}
```

### Step 4: Create `src/services/hooks/use-waf-mutation.ts`

```ts
import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { httpClient } from '../http/client';
import type { HttpMethod, RequestOptions, ServiceError, ServiceResponse } from '../types';

export function useWafMutation<TData = unknown, TBody = unknown>(
  method: Exclude<HttpMethod, 'GET'>,
  url: string,
  opts: RequestOptions = {},
): UseMutationResult<ServiceResponse<TData>, ServiceError, TBody> {
  return useMutation<ServiceResponse<TData>, ServiceError, TBody>({
    mutationFn: (body: TBody) =>
      httpClient.execute<TData>(method, url, { ...opts, data: body as any }),
  });
}
```

### Step 5: Run test to verify it passes

```bash
npx vitest run src/services/__tests__/hooks.test.tsx
```

Expected: All tests PASS

### Step 6: Commit

```bash
git add src/services/hooks/use-waf-query.ts src/services/hooks/use-waf-mutation.ts src/services/__tests__/hooks.test.tsx
git commit -m "feat(services): add useWafQuery and useWafMutation TanStack Query hooks"
```

---

## Task 9: `index.ts` barrel + full test suite run

**Files:**
- Create: `src/services/index.ts`

### Step 1: Create the public barrel

```ts
// src/services/index.ts

// Factory + singleton client
export { createHttpClient, httpClient } from './http/client';
export type { HttpClient } from './http/client';

// Hooks
export { useWafQuery } from './hooks/use-waf-query';
export { useWafMutation } from './hooks/use-waf-mutation';

// Types (everything callers need, nothing internal)
export type {
  HttpMethod,
  RequestOptions,
  ServiceConfig,
  ServiceResponse,
  RetryConfig,
  CsrfToken,
} from './types';
export { ServiceError } from './types';
```

### Step 2: Run the full test suite

```bash
cd "C:\UK VM\Issues\widgets\templates\tanstack-start-widget-template"
npx vitest run src/services/
```

Expected: All tests across all service files PASS

### Step 3: Run TypeScript check

```bash
npx tsc --noEmit
```

Expected: No type errors

### Step 4: Commit

```bash
git add src/services/index.ts
git commit -m "feat(services): add barrel export — public API for WAFData service module"
```

---

## Task 10: Update memory + final verification

### Step 1: Run full test suite one more time

```bash
npx vitest run
```

Expected: All tests PASS, no failures

### Step 2: Build to confirm no compile errors in widget bundle

```bash
npx vite build
```

Expected: Build succeeds

### Step 3: Update CLAUDE.md memory if applicable

Check `C:\Users\pagu01\.claude\projects\...\memory\MEMORY.md` and add a note about `src/services/` being the WAFData service module — its pattern, key files, and that `src/app/services/apiClient.ts` is a placeholder to be replaced.

### Step 4: Final commit

```bash
git add -A
git commit -m "docs(services): finalize WAFData service module implementation"
```

---

## File Map (final state)

```
src/services/
├── __tests__/
│   ├── types.test.ts
│   ├── waf-transport.test.ts
│   ├── platform-resolver.test.ts
│   ├── csrf-manager.test.ts
│   ├── retry.test.ts
│   ├── request-pipeline.test.ts
│   ├── client.test.ts
│   └── hooks.test.tsx
├── core/
│   ├── waf-transport.ts
│   ├── platform-resolver.ts
│   ├── csrf-manager.ts
│   └── retry.ts
├── http/
│   ├── request-pipeline.ts
│   └── client.ts
├── hooks/
│   ├── use-waf-query.ts
│   └── use-waf-mutation.ts
├── types.ts
└── index.ts
```

## Dependency order (no circular deps)

```
types
  ↑
waf-transport
  ↑
platform-resolver   csrf-manager   retry
  ↑                      ↑           ↑
              request-pipeline
                      ↑
                    client
                      ↑
             use-waf-query   use-waf-mutation
                      ↑
                   index.ts
```
