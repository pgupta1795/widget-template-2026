import {getContext} from "@/components/root-provider";
import {env} from "@/lib/env";
import {routeTree} from "@/routeTree.gen";
import {createRouter} from "@tanstack/react-router";

export function getRouter() {
	const router=createRouter({
		routeTree,
		basepath: env.VITE_WIDGET_BASE_PATH,
		context: getContext(),
		scrollRestoration: true,
		defaultPreload: "intent",
		defaultPreloadStaleTime: 0,
	});
	return router;
}

declare module "@tanstack/react-router" {
	interface Register {
		router: ReturnType<typeof getRouter>;
	}
}
