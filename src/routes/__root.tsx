import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import { useEffect } from "react";
import TanStackQueryProvider from "@/components/root-provider";
import { logger } from "@/lib/logger";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootComponent,
});

function RootComponent() {
	useEffect(() => {
		logger.info("Root layout mounted");
	}, []);

	return (
		<TanStackQueryProvider>
			<Outlet />
			<TanStackRouterDevtools />
		</TanStackQueryProvider>
	);
}
