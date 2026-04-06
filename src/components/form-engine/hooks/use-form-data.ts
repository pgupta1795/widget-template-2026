// src/components/form-engine/hooks/use-form-data.ts

import { useWafQuery } from "@/services/hooks/use-waf-query";
import type { ServiceError, ServiceResponse } from "@/services/types";
import type { UseQueryResult } from "@tanstack/react-query";
import type { FormFetchConfig } from "../types";

function interpolateUrl(url: string, params: Record<string, string>): string {
	return url.replace(/:(\w+)/g, (_, key) => params[key] ?? `:${key}`);
}

export function useFormData(
	fetchConfig: FormFetchConfig | undefined,
	params: Record<string, string> = {},
): UseQueryResult<ServiceResponse<Record<string, unknown>>, ServiceError> {
	const url = fetchConfig ? interpolateUrl(fetchConfig.url, params) : "";

	return useWafQuery<Record<string, unknown>>(url, {
		queryKey: fetchConfig?.queryKey.map((k) =>
			k.startsWith(":") ? (params[k.slice(1)] ?? k) : k,
		),
		enabled: !!fetchConfig && !!url,
	});
}
