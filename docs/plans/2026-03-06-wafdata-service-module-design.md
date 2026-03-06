# WAFData Service Module — Design Document

**Date:** 2026-03-06
**Status:** Approved
**Context:** Foundation service layer for a POSTMAN-type 3DDashboard widget that parses OpenAPI specs and lets users test 3DExperience web services.

---

## 1. Goal

Create a modular, reusable HTTP service layer in `src/services/` that:
- Uses `WAFData.authenticatedRequest` as the default transport (no explicit auth needed)
- Optionally uses `WAFData.proxifiedRequest` for external URLs via `useProxy: true`
- Automatically manages CSRF token fetch, cache, and invalidation for state-changing methods
- Supports configurable retry with automatic CSRF-expiry retry
- Exposes typed TanStack Query hooks for reactive data fetching
- Replaces the placeholder `src/app/services/apiClient.ts` (which used native `fetch`)

---

## 2. File Structure

```
src/services/
├── core/
│   ├── waf-transport.ts        # WAFData callback → Promise adapter
│   ├── csrf-manager.ts         # Singleton CSRF fetch/cache/invalidate
│   ├── platform-resolver.ts    # Singleton 3DX platform URL resolution
│   └── retry.ts                # Pure configurable retry executor
├── http/
│   ├── request-pipeline.ts     # Middleware chain: route → CSRF → execute → retry
│   └── client.ts               # createHttpClient() factory + default singleton
├── hooks/
│   ├── use-waf-query.ts        # useQuery wrapper for authenticated GETs
│   └── use-waf-mutation.ts     # useMutation wrapper for POST/PUT/PATCH/DELETE
├── types.ts                    # All shared types and ServiceError class
└── index.ts                    # Public barrel export
```

---

## 3. Types & Data Contracts

### RequestOptions

Extends `WAFDataBaseRequestOptions` (minus pipeline-managed callbacks) so callers have full WAFData option access:

```ts
type ManagedByPipeline = 'onComplete' | 'onFailure' | 'onPassportError' | 'onTimeout' | 'method';

interface RequestOptions extends Omit<WAFDataBaseRequestOptions, ManagedByPipeline> {
  params?: Record<string, string>;       // appended to URL as query string
  csrfOverride?: string;                 // skip auto-inject, use this token
  useProxy?: boolean;                    // force proxifiedRequest
  proxyType?: 'ajax' | 'passport' | 'feed' | 'xml' | 'soap';
  retry?: RetryConfig;                   // per-request retry override
}
```

Inherited from `WAFDataBaseRequestOptions`: `async`, `data`, `type`, `responseType`, `headers`, `timeout`, `cache`, `onProgress`, `onUploadProgress`.

### ServiceResponse\<T\>

```ts
interface ServiceResponse<T = unknown> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  time: number;   // ms
  size: number;   // bytes
}
```

Matches the existing `ResponseData` shape in `src/lib/types/api.ts` for zero-friction integration.

### ServiceConfig

```ts
interface ServiceConfig {
  defaultTimeout?: number;           // default: 25000
  retry?: RetryConfig;
  defaultHeaders?: Record<string, string>;
}
```

### RetryConfig

```ts
interface RetryConfig {
  maxAttempts: number;
  shouldRetry?: (error: ServiceError) => boolean;  // default: err.isCsrfExpiry
  delayMs?: number;
}
```

### ServiceError

```ts
class ServiceError extends Error {
  status: number;
  statusText: string;
  response: unknown;
  headers: Record<string, string>;

  get isCsrfExpiry(): boolean   // status === 403
  get isUnauthorized(): boolean // status === 401
  get isTimeout(): boolean      // status === 408
}
```

---

## 4. Core Layer

### waf-transport.ts

Single responsibility: convert WAFData's callback API to Promise-based.

- `wafAuthenticatedRequest<T>(url, options): Promise<ServiceResponse<T>>`
- `wafProxifiedRequest<T>(url, options): Promise<ServiceResponse<T>>`
- Both measure response time, calculate byte size, and resolve the same `ServiceResponse<T>` shape.
- Passes `onProgress` / `onUploadProgress` from `RequestOptions` directly to WAFData.
- On `onFailure` or `onPassportError`, rejects with `ServiceError`.

### platform-resolver.ts

Single responsibility: resolve 3DX platform service URLs.

- Calls `i3DXCompassServices.getPlatformServices()` once using `getAPIs()` and `getWidget()`.
- Caches the result as a frozen `Record<string, string>` map.
- `getPlatformUrls(): Promise<Record<string, string>>`
- `is3DXUrl(url: string): Promise<boolean>` — checks if the URL starts with any resolved platform URL.

### csrf-manager.ts

Single responsibility: manage CSRF token lifecycle for 3DSpace.

- `getToken(): Promise<CsrfToken>` — resolves 3DSpace URL, fetches CSRF, caches `{ name, value }`.
- `invalidate(): void` — clears cache so next `getToken()` re-fetches.
- Uses `wafAuthenticatedRequest` internally (no circular dependency — transport has no knowledge of CSRF).

### retry.ts

Single responsibility: pure, stateless retry execution.

- `withRetry<T>(fn: () => Promise<T>, config: RetryConfig): Promise<T>`
- Calls `fn()`, catches `ServiceError`, checks `config.shouldRetry(error)`, waits `delayMs`, retries.
- Default `shouldRetry`: `(err) => err.isCsrfExpiry`.
- Does not mutate state — CSRF invalidation is the caller's responsibility before retrying.

---

## 5. Request Pipeline

`request-pipeline.ts` — ordered middleware executed for every request:

```
1. RESOLVE TRANSPORT
   useProxy: true          → proxifiedRequest (with proxyType)
   else                    → authenticatedRequest (default)

2. BUILD URL
   Append params to URL as query string

3. INJECT CSRF  (POST, PUT, PATCH, DELETE only)
   csrfOverride present?   → use it as-is, skip fetch
   else                    → csrfManager.getToken() → inject { name: value } as header

4. EXECUTE via waf-transport

5. ON FAILURE
   ServiceError.isCsrfExpiry?
     → csrfManager.invalidate()
     → retry.withRetry() re-runs from step 3 with fresh token
   else
     → throw ServiceError immediately

6. RETURN ServiceResponse<T>
```

Internal signature: `executePipeline<T>(method, url, opts, config): Promise<ServiceResponse<T>>`

---

## 6. HTTP Client Factory

`client.ts` — factory + default singleton:

```ts
interface HttpClient {
  get<T>(url: string, opts?: RequestOptions): Promise<ServiceResponse<T>>;
  post<T>(url: string, body?: unknown, opts?: RequestOptions): Promise<ServiceResponse<T>>;
  put<T>(url: string, body?: unknown, opts?: RequestOptions): Promise<ServiceResponse<T>>;
  patch<T>(url: string, body?: unknown, opts?: RequestOptions): Promise<ServiceResponse<T>>;
  delete<T>(url: string, opts?: RequestOptions): Promise<ServiceResponse<T>>;
  execute<T>(method: HttpMethod, url: string, opts?: RequestOptions): Promise<ServiceResponse<T>>;
}

createHttpClient(config?: ServiceConfig): HttpClient
```

- All methods are thin wrappers that set `method` and call `executePipeline`.
- `body` on POST/PUT/PATCH is serialized and set as `opts.data`; `Content-Type: application/json` injected if body is an object and no override is present.
- A default export `httpClient = createHttpClient()` covers 90% of use cases.

---

## 7. TanStack Query Hooks

### use-waf-query.ts

```ts
function useWafQuery<T>(
  url: string,
  opts?: RequestOptions & { queryKey?: unknown[]; enabled?: boolean }
): UseQueryResult<ServiceResponse<T>, ServiceError>
```

- Uses `httpClient.get<T>(url, opts)` as `queryFn`.
- Default `queryKey`: `['waf', url, opts?.params]`.
- Caller can extend `queryKey` for cache segmentation.

### use-waf-mutation.ts

```ts
function useWafMutation<TData, TBody = unknown>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  url: string,
  opts?: RequestOptions
): UseMutationResult<ServiceResponse<TData>, ServiceError, TBody>
```

- Uses `httpClient.execute<TData>(method, url, { ...opts, data: body })` as `mutationFn`.
- CSRF injection is automatic via the pipeline.

---

## 8. Public API (index.ts)

```ts
export { createHttpClient, httpClient } from './http/client';
export { useWafQuery } from './hooks/use-waf-query';
export { useWafMutation } from './hooks/use-waf-mutation';
export type { HttpClient, HttpMethod, RequestOptions, ServiceConfig, ServiceResponse, RetryConfig } from './types';
export { ServiceError } from './types';
```

Nothing internal leaks. Callers only import from `@/services`.

---

## 9. Integration with POSTMAN Widget

`src/app/context.tsx` `sendRequest()` replaces `executeRequest(fetch-based)` with:

```ts
import { httpClient } from '@/services';

const result = await httpClient.execute(method, url, {
  headers: Object.fromEntries(headers.filter(h => h.enabled).map(h => [h.key, h.value])),
  params: Object.fromEntries(params.filter(p => p.enabled).map(p => [p.key, p.value])),
  data: body,
  type: bodyType === 'json' ? 'json' : 'text',
});
```

`ServiceResponse<T>` shape is identical to `ResponseData` — no display logic changes needed.

---

## 10. Key Constraints

- `waf-transport.ts` is the ONLY file that imports or calls `WAFData` directly.
- `csrf-manager.ts` is the ONLY file that knows about CSRF URLs.
- `platform-resolver.ts` is the ONLY file that calls `i3DXCompassServices`.
- All singletons (csrf-manager, platform-resolver) are module-level — initialized lazily on first use.
- No circular dependencies: transport ← csrf-manager ← pipeline ← client ← hooks.
