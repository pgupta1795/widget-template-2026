// src/components/form-engine/hooks/use-field-mutation.ts

import { useWafMutation } from "@/services/hooks/use-waf-mutation";
import type { ServiceError, ServiceResponse } from "@/services/types";
import type { UseMutationResult } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import type { FieldApiBinding } from "../types";

function interpolateUrl(url: string, params: Record<string, string>): string {
	return url.replace(/:(\w+)/g, (_, key) => params[key] ?? `:${key}`);
}

export interface UseFieldMutationOptions {
	apiBinding: FieldApiBinding;
	params?: Record<string, string>;
	debounceMs?: number;
	/** Extra key/value pairs always merged into the request body (e.g. { cestamp: "..." }). */
	extraBody?: Record<string, unknown>;
}

export interface UseFieldMutationReturn {
	mutation: UseMutationResult<
		ServiceResponse<unknown>,
		ServiceError,
		Record<string, unknown>
	>;
	save: (fieldName: string, value: unknown) => void;
	saveAsync: (
		fieldName: string,
		value: unknown,
	) => Promise<ServiceResponse<unknown>>;
	cancel: () => void;
}

export function useFieldMutation({
	apiBinding,
	params = {},
	debounceMs = 300,
	extraBody = {},
}: UseFieldMutationOptions): UseFieldMutationReturn {
	const url = interpolateUrl(apiBinding.url, params);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const mutation = useWafMutation<unknown, Record<string, unknown>>(
		apiBinding.method,
		url,
		{ headers: apiBinding.headers },
	);

	const cancel = useCallback(() => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const save = useCallback(
		(fieldName: string, value: unknown) => {
			cancel();
			timerRef.current = setTimeout(() => {
				const body = apiBinding.bodyKey
					? { [apiBinding.bodyKey]: value }
					: { [fieldName]: value };
				mutation.mutate({ ...extraBody, ...body });
			}, debounceMs);
		},
		[cancel, apiBinding.bodyKey, mutation, debounceMs, extraBody],
	);

	const saveAsync = useCallback(
		async (
			fieldName: string,
			value: unknown,
		): Promise<ServiceResponse<unknown>> => {
			cancel();
			const body = apiBinding.bodyKey
				? { [apiBinding.bodyKey]: value }
				: { [fieldName]: value };
			return mutation.mutateAsync({ ...extraBody, ...body });
		},
		[cancel, apiBinding.bodyKey, mutation, extraBody],
	);

	return { mutation, save, saveAsync, cancel };
}
