import {httpClient} from '@/services/http/client';
import type {RequestOptions,ServiceError,ServiceResponse} from '@/services/types';
import {useQuery,type UseQueryResult} from '@tanstack/react-query';

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
