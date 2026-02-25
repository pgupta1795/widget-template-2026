import { queryOptions } from "@tanstack/react-query";
import type { EndpointDefinition } from "@/types/config";
import { executeEndpoint } from "./request";
import { mapResponse, mapSingleResponse } from "./response-mapper";

export function createQueryOptions(
	endpoint: EndpointDefinition,
	params: Record<string, string> = {},
	options?: { single?: boolean; enabled?: boolean },
) {
	return queryOptions({
		queryKey: [endpoint.id, params],
		queryFn: async ({ signal }) => {
			const raw = await executeEndpoint(endpoint, { params, signal });
			if (options?.single) {
				return mapSingleResponse(
					raw,
					endpoint.responseMapping,
					endpoint.defaultValues,
				);
			}
			return mapResponse(raw, endpoint.responseMapping, endpoint.defaultValues);
		},
		enabled: options?.enabled ?? true,
	});
}

export function createInfiniteQueryKey(
	endpoint: EndpointDefinition,
	params: Record<string, string>,
) {
	return [endpoint.id, "infinite", params] as const;
}
