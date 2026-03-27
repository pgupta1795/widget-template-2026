// src/routes/ca.tsx
import {
	createFileRoute,
	useNavigate,
	Outlet,
	useMatches,
} from "@tanstack/react-router";
import { ConfiguredTable } from "@/components/data-grid/table-engine";
import type { DAGTableConfig } from "@/components/data-grid/table-engine";
import { getConfig } from "@/components/tab-engine";
import { use3dxDropZone } from "@/hooks/use-3dx-drop-zone";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/ca")({
	component: CAListView,
});

function CAListView() {
	const navigate = useNavigate();
	const matches = useMatches();
	const isDetailActive = matches.some((m) => m.routeId === "/ca/$nodeId");
	const { ref: dropRef, isDragOver } = use3dxDropZone<HTMLDivElement>({
		onDrop: (items) => {
			const item = items[0];
			if (item?.objectId) {
				void navigate({ to: "/ca/$nodeId", params: { nodeId: item.objectId } });
			}
		},
	});

	if (isDetailActive) {
		return <Outlet />;
	}

	const listConfig = getConfig("./ca-search.config.ts") as
		| DAGTableConfig
		| undefined;
	if (!listConfig) {
		return (
			<div className="flex h-full items-center justify-center text-sm text-muted-foreground">
				CA Search config not registered
			</div>
		);
	}

	const nav = listConfig.rowNavigation;

	return (
		<div
			ref={dropRef}
			className={cn(
				"h-full w-full transition-all",
				isDragOver && "ring-2 ring-primary ring-inset",
			)}
		>
			<ConfiguredTable
				config={listConfig}
				className="h-full"
				onRowClick={
					nav
						? (row) => {
								const value = row[nav.paramField];
								if (value != null && value !== "") {
									void navigate({
										to: nav.to as any,
										params: { [nav.paramName]: String(value) },
									});
								}
							}
						: undefined
				}
			/>
		</div>
	);
}
