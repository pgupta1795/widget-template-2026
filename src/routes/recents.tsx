import { createFileRoute } from "@tanstack/react-router";
import { getWidgetConfig } from "@/config/registry";
import { WidgetShell } from "@/features/widget-shell/widget-shell";

export const Route = createFileRoute("/recents")({ component: RecentsRoute });

function RecentsRoute() {
	const config = getWidgetConfig("engineering-bom");
	return <WidgetShell config={config} />;
}
