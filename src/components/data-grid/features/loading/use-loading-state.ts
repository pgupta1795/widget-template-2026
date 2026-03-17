import React from "react";

export interface LoadingConfig {
	enabled?: boolean;
	isRefetching?: boolean;
	isMutating?: boolean;
	isFetchingNextPage?: boolean;
}

export interface LoadingState {
	isInitialLoading: boolean;
	isRefetching: boolean;
	isMutating: boolean;
	isFetchingNextPage: boolean;
}

const INITIAL_LOAD_DELAY_MS = 800;

export function useLoadingState(config: LoadingConfig): LoadingState {
	const {
		enabled = false,
		isRefetching = false,
		isMutating = false,
		isFetchingNextPage = false,
	} = config;

	// Artificial initial loading state simulated via a mount delay
	const [isInitialLoading, setIsInitialLoading] = React.useState(enabled);

	React.useEffect(() => {
		if (!enabled) return;
		const timer = setTimeout(
			() => setIsInitialLoading(false),
			INITIAL_LOAD_DELAY_MS,
		);
		return () => clearTimeout(timer);
		// only run on mount
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return {
		isInitialLoading,
		isRefetching,
		isMutating,
		isFetchingNextPage,
	};
}
