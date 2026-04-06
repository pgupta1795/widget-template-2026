// src/routes/change.tsx

import { ChangeActionDetail } from "@/features/change/components/change-action-detail";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/change")({
	component: ChangeActionDetail,
});
