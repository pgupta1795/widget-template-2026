import { ViewsPage } from "@/features/views/components/views-page";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/views")({ component: ViewsPage });
