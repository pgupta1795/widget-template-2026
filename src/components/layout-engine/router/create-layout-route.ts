// src/components/layout-engine/router/create-layout-route.ts
import { createFileRoute, useParams } from "@tanstack/react-router";
import { createElement } from "react";
import type { DAGLayoutConfig } from "../types/layout.types";
import { LayoutEngine } from "../layout-engine";

/**
 * Thin wrapper around createFileRoute that injects a DAGLayoutConfig.
 *
 * Usage (in a route file):
 *   export const Route = createLayoutRoute('/xen/ca/$nodeId', caLayoutConfig);
 *
 * TanStack Router still requires a physical route file — this just reduces boilerplate
 * for simple layouts that don't need custom DnD wiring.
 */
export function createLayoutRoute(routePath: string, config: DAGLayoutConfig) {
	// `as never` — createFileRoute's path argument is typed against the generated
	// routeTree union. This helper is path-agnostic, so we bypass that check.
	// The caller is responsible for ensuring routePath matches the physical route file.
	return createFileRoute(routePath as never)({
		component: function LayoutRouteComponent() {
			const routeParams = useParams({ strict: false }) as Record<
				string,
				string
			>;
			return createElement(LayoutEngine, { config, params: routeParams });
		},
	});
}
