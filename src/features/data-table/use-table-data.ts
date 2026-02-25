import { useQuery } from "@tanstack/react-query";
import { createQueryOptions } from "@/services/query-factory";
import type { EndpointDefinition } from "@/types/config";

const STUB_ENDPOINT: EndpointDefinition = {
	id: "__stub__",
	url: "",
	method: "GET",
};

export function useTableData(
	endpoint: EndpointDefinition | undefined,
	params: Record<string, string> = {},
) {
	const query = useQuery({
		...createQueryOptions(endpoint ?? STUB_ENDPOINT, params),
		enabled: !!endpoint,
	});

	return {
		data: (query.data as Record<string, unknown>[]) ?? [],
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
	};
}
