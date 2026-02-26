import type { QueryClient } from "@tanstack/react-query";
import { createRootRouteWithContext, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";
import TanStackQueryProvider from "@/components/root-provider";
import { Toaster } from "@/components/ui/sonner";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
	component: RootComponent,
});

function RootComponent() {
	return (
		<TanStackQueryProvider>
			<Outlet />
			<Toaster position="top-right" closeButton />
			<TanStackRouterDevtools />
		</TanStackQueryProvider>
	);
}
