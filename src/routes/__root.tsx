import TanStackQueryProvider from "@/components/root-provider";
import type {QueryClient} from "@tanstack/react-query";
import {createRootRouteWithContext,Outlet} from "@tanstack/react-router";
import {TanStackRouterDevtools} from "@tanstack/react-router-devtools";

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
			<TanStackRouterDevtools />
		</TanStackQueryProvider>
	);
}