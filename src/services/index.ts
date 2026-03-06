// src/services/index.ts

// Factory + singleton client
export { createHttpClient, httpClient } from './http/client';
export type { HttpClient } from './http/client';

// Hooks
export { useWafQuery } from './hooks/use-waf-query';
export type { UseWafQueryOptions } from './hooks/use-waf-query';
export { useWafMutation } from './hooks/use-waf-mutation';

// Platform utility — useful for callers routing requests conditionally
export { is3DXUrl } from './core/platform-resolver';

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
