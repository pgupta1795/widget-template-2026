import {AppShell} from "@/components/layout/app-shell";
import TanStackQueryProvider from "@/components/root-provider";
import {Toaster} from "@/components/ui/sonner";
import type {QueryClient} from "@tanstack/react-query";
import {createRootRouteWithContext} from "@tanstack/react-router";
import {TanStackRouterDevtools} from "@tanstack/react-router-devtools";

interface MyRouterContext {
	queryClient: QueryClient;
}

export const Route=createRootRouteWithContext<MyRouterContext>()({
	component: RootComponent,
});

function RootComponent() {
	return (
		<TanStackQueryProvider>
			<AppShell />
			<Toaster position="top-right" closeButton />
			<TanStackRouterDevtools />
		</TanStackQueryProvider>
	);
}
