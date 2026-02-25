import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createMutationFn } from "@/services/mutation-factory";
import type { EndpointDefinition } from "@/types/config";

export function useFormSubmit(
	endpoint: EndpointDefinition | undefined,
	options?: {
		invalidateKeys?: string[][];
		onSuccess?: (data: unknown) => void;
		onError?: (error: unknown) => void;
	},
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: endpoint ? createMutationFn(endpoint) : async () => {},
		onSuccess: (data) => {
			if (options?.invalidateKeys) {
				for (const key of options.invalidateKeys) {
					queryClient.invalidateQueries({ queryKey: key });
				}
			}
			options?.onSuccess?.(data);
		},
		onError: options?.onError,
	});
}
