// src/features/change/components/change-action-detail.tsx

import { ObjectDetailView } from "@/components/object-detail";
import { Skeleton } from "@/components/ui/skeleton";
import { use3dxDropZone } from "@/hooks/use-3dx-drop-zone";
import { cn } from "@/lib/utils";
import { useWafQuery } from "@/services/hooks/use-waf-query";
import { GitPullRequest, MousePointerClick } from "lucide-react";
import { useMemo, useState } from "react";
import { changeActionDetailConfig } from "../configs/change-action-detail.config";

export function ChangeActionDetail() {
	const [caId, setCaId] = useState<string | null>(null);

	const { ref: dropRef, isDragOver } = use3dxDropZone<HTMLDivElement>({
		onDrop: (items) => {
			const id = items[0]?.objectId;
			if (id) setCaId(id);
		},
	});

	const params = useMemo(
		() => (caId ? { caId } : ({} as Record<string, string>)),
		[caId],
	);

	// Fetch CA detail data for header + properties panel
	const { data, isLoading } = useWafQuery<Record<string, unknown>>(
		caId ? `/resources/v1/modeler/dslc/changeaction/${caId}` : "",
		{
			enabled: !!caId,
			queryKey: ["change-action-detail", caId ?? ""],
		},
	);

	return (
		<div
			ref={dropRef}
			className={cn(
				"flex h-full flex-col overflow-hidden transition-all",
				isDragOver && "ring-2 ring-primary ring-inset",
			)}
		>
			{!caId ? (
				<div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
					<div className="flex size-16 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
						<GitPullRequest className="size-8 text-primary/60" />
					</div>
					<div className="flex flex-col items-center gap-1.5">
						<p className="text-sm font-medium text-foreground/60">
							No Change Action selected
						</p>
						<p className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
							<MousePointerClick className="size-3.5" />
							Drop a Change Action here to view its details
						</p>
					</div>
				</div>
			) : isLoading ? (
				<div className="flex flex-col gap-4 p-6">
					<Skeleton className="h-10 w-64" />
					<Skeleton className="h-6 w-96" />
					<Skeleton className="h-[400px] w-full" />
				</div>
			) : (
				<ObjectDetailView
					key={caId}
					config={changeActionDetailConfig}
					data={data?.data ?? {}}
					params={params}
				/>
			)}
		</div>
	);
}
