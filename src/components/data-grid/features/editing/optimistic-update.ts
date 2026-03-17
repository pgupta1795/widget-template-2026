import type {
	QueryClient,
	QueryKey,
	UseMutationOptions,
} from "@tanstack/react-query";
import type { GridRow } from "@/components/data-grid/types/grid-types";

interface MutationVars {
	rowId: string;
	columnId: string;
	value: unknown;
}

interface MutationContext {
	previousData: GridRow[] | undefined;
}

/**
 * Returns TanStack Query mutation options with optimistic update + rollback.
 * Use this when your data comes from a react-query cache.
 */
export function createOptimisticMutation<TData extends GridRow>(
	queryClient: QueryClient,
	queryKey: QueryKey,
	onMutate: (rowId: string, columnId: string, value: unknown) => Promise<void>,
): UseMutationOptions<void, unknown, MutationVars, MutationContext> {
	return {
		mutationFn: ({ rowId, columnId, value }: MutationVars) =>
			onMutate(rowId, columnId, value),

		onMutate: async ({ rowId, columnId, value }: MutationVars) => {
			await queryClient.cancelQueries({ queryKey });
			const previousData = queryClient.getQueryData<TData[]>(queryKey);

			queryClient.setQueryData<TData[]>(queryKey, (old = []) =>
				old.map((row) =>
					row.id === rowId ? { ...row, [columnId]: value } : row,
				),
			);

			return { previousData } as MutationContext;
		},

		onError: (_err, _vars, context) => {
			if (context?.previousData) {
				queryClient.setQueryData(queryKey, context.previousData);
			}
		},

		onSettled: () => {
			queryClient.invalidateQueries({ queryKey });
		},
	};
}
