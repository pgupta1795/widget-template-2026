// src/routes/ca/$nodeId.tsx
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { LayoutEngine } from "@/components/layout-engine";
import { getConfig } from "@/components/tab-engine";
import { use3dxDropZone } from "@/hooks/use-3dx-drop-zone";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ca/$nodeId")({
	component: CADetailView,
});

function CADetailView() {
	const { nodeId } = Route.useParams();
	const navigate = useNavigate();

	const { ref: dropRef, isDragOver } = use3dxDropZone<HTMLDivElement>({
		onDrop: (items) => {
			const item = items[0];
			if (item?.objectId) {
				void navigate({ to: "/ca/$nodeId", params: { nodeId: item.objectId } });
			}
		},
	});

	const detailConfig = getConfig("./ca-layout.config.ts");
	if (!detailConfig) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				CA Layout config not registered
			</div>
		);
	}

	return (
		<div
			ref={dropRef}
			className={cn(
				"h-full w-full transition-all",
				isDragOver && "ring-2 ring-primary ring-inset",
			)}
		>
			<LayoutEngine config={detailConfig as any} params={{ nodeId }} />
		</div>
	);
}
