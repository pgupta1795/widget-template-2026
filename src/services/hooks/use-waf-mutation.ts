import { httpClient } from "@/services/http/client";
import type {
	HttpMethod,
	RequestOptions,
	ServiceError,
	ServiceResponse,
} from "@/services/types";
import { useMutation, type UseMutationResult } from "@tanstack/react-query";

/**
 * Reactive mutation hook for 3DEXPERIENCE (WAFData) services.
 *
 * Wraps TanStack Query's `useMutation` with the WAFData HTTP client for
 * write operations (`POST`, `PUT`, `PATCH`, `DELETE`). Returns a stable
 * `mutate` / `mutateAsync` function that you can call from event handlers,
 * form submissions, or any imperative code path.
 *
 * ---
 *
 * ### Generic parameters
 * | Parameter | Default   | Description                                                 |
 * |-----------|-----------|-------------------------------------------------------------|
 * | `TData`   | `unknown` | Shape of the **response payload** (`data` field on success). |
 * | `TBody`   | `unknown` | Shape of the **request body** passed to `mutate(body)`.     |
 *
 * ---
 *
 * ### Parameters
 *
 * @param method - HTTP verb to use. Must be one of `'POST'`, `'PUT'`,
 *   `'PATCH'`, or `'DELETE'` — `'GET'` is excluded because reads belong in
 *   {@link useWafQuery}.
 *
 * @param url - Relative or absolute URL targeted by the mutation.
 *   Append dynamic segments before passing (e.g. `` `/api/items/${id}` ``).
 *
 * @param opts - Optional per-request configuration shared with
 *   `RequestOptions`. The request body is supplied at call-time via
 *   `mutate(body)` — do **not** pass it here.
 *
 * | Option            | Type                          | Default      | Description |
 * |-------------------|-------------------------------|--------------|-------------|
 * | `params`          | `Record<string, string>`      | —            | URL query parameters merged into the request URL before dispatch. |
 * | `csrfOverride`    | `string`                      | —            | Caller-supplied CSRF token. When provided, the pipeline skips auto-injection. |
 * | `useProxy`        | `boolean`                     | `false`      | Route the request through `WAFData.proxifiedRequest` instead of `authenticatedRequest`. Required for non-3DS external endpoints. |
 * | `proxyType`       | `'ajax'\|'passport'\|'feed'\|'xml'\|'soap'` | `'ajax'` | Proxy channel used when `useProxy` is `true`. Maps directly to the WAFData `proxy` option. |
 * | `retry`           | `RetryConfig`                 | global cfg   | Per-request retry override — `{ maxAttempts, delayMs?, shouldRetry? }`. |
 * | `async`           | `boolean`                     | `true`       | *(from WAFData)* Set to `false` for a synchronous XHR (not recommended on the main thread). |
 * | `type`            | `WAFDataResponseType\|'xml'`  | —            | *(from WAFData)* Helper that sets both `responseType` and the `Accept` header. Values: `'json'`, `'text'`, `'arraybuffer'`, `'blob'`, `'document'`, `'xml'`. |
 * | `responseType`    | `WAFDataResponseType`         | `'text'`     | *(from WAFData)* Raw XHR `responseType` override. Prefer `type` so the `Accept` header is also set. |
 * | `headers`         | `Record<string, string>`      | —            | *(from WAFData)* Additional request headers merged on top of the defaults (`X-Requested-With: XMLHttpRequest` is always added). |
 * | `timeout`         | `number`                      | `25000`      | *(from WAFData)* Request timeout in milliseconds. `0` disables the timeout. |
 * | `cache`           | `number`                      | —            | *(from WAFData)* Seconds of proxy caching. Negative values bypass the browser cache. |
 * | `onProgress`      | `(e: WAFDataProgressEvent) => void` | —      | *(from WAFData)* Callback monitoring download progress (XHR ProgressEvent). |
 * | `onUploadProgress`| `(e: WAFDataProgressEvent) => void` | —      | *(from WAFData)* Callback monitoring upload progress (e.g. file uploads). |
 *
 * @returns A TanStack Query `UseMutationResult` containing:
 * - **`mutate(body)`** — fire-and-forget trigger; body is typed as `TBody`.
 * - **`mutateAsync(body)`** — `Promise`-based trigger; rejects on error.
 * - **`data`** — `ServiceResponse<TData>` wrapping `{ data: TData, status, statusText, headers, time, size }` after a successful mutation.
 * - **`error`** — `ServiceError` with `.status`, `.statusText`, `.response`, and helpers `.isUnauthorized`, `.isCsrfExpiry`, `.isTimeout` on failure.
 * - **`isPending`** — `true` while the request is in-flight.
 * - **`isError`**, **`isSuccess`**, **`reset()`** — standard TanStack Query mutation flags / helpers.
 *
 * ---
 *
 * ### Basic POST example
 * ```tsx
 * interface CreateItemBody { name: string; description: string; }
 * interface Item { id: string; name: string; description: string; }
 *
 * function CreateItemForm() {
 *   const { mutate, isPending, error } = useWafMutation<Item, CreateItemBody>(
 *     'POST',
 *     '/api/items',
 *   );
 *
 *   const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
 *     e.preventDefault();
 *     mutate({ name: 'Widget', description: 'A fancy widget' });
 *   };
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <button type="submit" disabled={isPending}>
 *         {isPending ? 'Creating…' : 'Create'}
 *       </button>
 *       {error && <p>Error: {error.statusText}</p>}
 *     </form>
 *   );
 * }
 * ```
 *
 * ### DELETE with a dynamic URL
 * ```tsx
 * function DeleteButton({ id }: { id: string }) {
 *   const { mutate } = useWafMutation('DELETE', `/api/items/${id}`);
 *   return <button onClick={() => mutate(undefined)}>Delete</button>;
 * }
 * ```
 *
 * ### Await the result (mutateAsync)
 * ```tsx
 * const { mutateAsync } = useWafMutation<Item, Partial<Item>>(
 *   'PATCH',
 *   `/api/items/${id}`,
 * );
 *
 * const handleSave = async (patch: Partial<Item>) => {
 *   try {
 *     const { data } = await mutateAsync(patch);
 *     console.log('Saved:', data);
 *   } catch (err) {
 *     // err is ServiceError
 *   }
 * };
 * ```
 *
 * ### File upload with progress tracking
 * ```tsx
 * const { mutate } = useWafMutation<UploadResult, FormData>('POST', '/api/upload', {
 *   onUploadProgress: (e) => setProgress(Math.round((e.loaded / e.total) * 100)),
 *   timeout: 0, // disable timeout for large uploads
 * });
 *
 * const handleUpload = (file: File) => {
 *   const form = new FormData();
 *   form.append('file', file);
 *   mutate(form);
 * };
 * ```
 *
 * ### With custom headers and CSRF override
 * ```tsx
 * const { mutate } = useWafMutation<void, Payload>('POST', '/api/secure', {
 *   headers: { 'X-App-Version': '2.0' },
 *   csrfOverride: myCsrfToken,
 * });
 * ```
 */
export function useWafMutation<TData = unknown, TBody = unknown>(
	method: Exclude<HttpMethod, "GET">,
	url: string,
	opts: RequestOptions = {},
): UseMutationResult<ServiceResponse<TData>, ServiceError, TBody> {
	return useMutation<ServiceResponse<TData>, ServiceError, TBody>({
		mutationFn: (body: TBody) =>
			httpClient.execute<TData>(method, url, { ...opts, data: body as any }),
	});
}
