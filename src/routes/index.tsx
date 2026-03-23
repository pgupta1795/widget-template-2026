import { ApiExplorer } from "@/features/api-explorer/components/api-explorer";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: ApiExplorer });
