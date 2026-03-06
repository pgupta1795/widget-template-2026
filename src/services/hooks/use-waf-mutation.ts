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
