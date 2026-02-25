import { getWidgetConfig } from "@/config/registry"
import { WidgetShell } from "@/features/widget-shell/widget-shell"
import { createFileRoute } from "@tanstack/react-router"

export const Route = createFileRoute("/")({ component: App })

function App() {
  const config = getWidgetConfig("engineering-bom")
  return <WidgetShell config={config} />
}
