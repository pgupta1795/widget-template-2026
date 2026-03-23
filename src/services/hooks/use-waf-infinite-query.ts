import { httpClient } from "@/services/http/client";
import type {
	RequestOptions,
	ServiceError,
	ServiceResponse,
} from "@/services/types";
import {
	useInfiniteQuery,
	type InfiniteData,
	type UseInfiniteQueryResult,
} from "@tanstack/react-query";

export interface UseWafInfiniteQueryOptions<T>
	extends Omit<RequestOptions, "params"> {
	/** Base params always merged into every page request. Do NOT include $top/$skip here. */
	params?: Record<string, string>;
	/** Compute next page params from the last fetched page. Return undefined to stop. */
	getNextPageParam: (
		lastPage: ServiceResponse<T>,
		allPages: ServiceResponse<T>[],
	) => Record<string, string> | undefined;
	/** Params for the very first page fetch. Default: {} */
	initialPageParam?: Record<string, string>;
	/** Extra keys to append to the TanStack Query cache key */
	queryKey?: unknown[];
	enabled?: boolean;
}

export function useWafInfiniteQuery<T = unknown>(
	url: string,
	opts: UseWafInfiniteQueryOptions<T>,
): UseInfiniteQueryResult<InfiniteData<ServiceResponse<T>>, ServiceError> {
	const {
		queryKey: extraKey,
		enabled,
		getNextPageParam,
		initialPageParam = {},
		params,
		...requestOpts
	} = opts;

	return useInfiniteQuery<
		ServiceResponse<T>,
		ServiceError,
		InfiniteData<ServiceResponse<T>>,
		unknown[],
		Record<string, string>
	>({
		queryKey: ["waf-infinite", url, params, ...(extraKey ?? [])],
		queryFn: ({ pageParam }) =>
			httpClient.get<T>(url, {
				...requestOpts,
				params: { ...params, ...pageParam },
			}),
		initialPageParam,
		getNextPageParam: (lastPage, allPages) =>
			getNextPageParam(lastPage, allPages),
		enabled,
	});
}
