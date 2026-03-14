// src/features/xen/components/xen.tsx

import { MousePointerClick } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ConfiguredTable } from "@/components/data-grid/table-engine";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { use3dxDropZone } from "@/hooks/use-3dx-drop-zone";
import { cn } from "@/lib/utils";
import { engExpandConfig } from "../configs/eng-expand.config";
import { engSearchConfig } from "../configs/eng-search.config";

/**
 * Xen feature root component.
 *
 * Tab 1 — Search: infinite-scroll Engineering Item search with a debounced
 *   search input. Passes `searchStr` to ConfiguredTable via the `params` prop
 *   so the DAG URL's $params.searchStr resolves correctly.
 *
 * Tab 2 — Expand: tree table driven by the dseng:EngItem expand API.
 *   An Engineering Item must be dropped onto the widget first; its objectId
 *   becomes `nodeId` and is passed to ConfiguredTable via `params`.
 *   Shows an empty-state prompt until an item is dropped.
 */
export function Xen() {
	// ── Search state ────────────────────────────────────────────────────────
	const [searchInput, setSearchInput] = useState("");
	const [searchStr, setSearchStr] = useState("");
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const searchParams = useMemo(() => ({ searchStr }), [searchStr]);

	const handleSearchChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			setSearchInput(e.target.value);
			if (debounceRef.current) clearTimeout(debounceRef.current);
			debounceRef.current = setTimeout(() => {
				setSearchStr(e.target.value);
			}, 300);
		},
		[],
	);

	useEffect(() => {
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, []);

	// ── Expand / dropzone state ──────────────────────────────────────────────
	const [nodeId, setNodeId] = useState<string | null>(null);
	const expandParams = useMemo(
		() => (nodeId ? { nodeId } : ({} as Record<string, string>)),
		[nodeId],
	);

	// onDrop does not need useCallback — use3dxDropZone reads it via optionsRef,
	// so callback identity changes never trigger re-registration.
	const { ref: dropRef, isDragOver } = use3dxDropZone<HTMLDivElement>({
		onDrop: (items) => {
			const id = items[0]?.objectId;
			if (id) setNodeId(id);
		},
	});

	// ── Render ───────────────────────────────────────────────────────────────
	return (
		<div
			ref={dropRef}
			className={cn(
				"flex h-full flex-col overflow-hidden transition-all",
				isDragOver && "ring-2 ring-primary ring-inset",
			)}
		>
			<Tabs defaultValue="search" className="flex h-full flex-col">
				<div className="border-b px-4">
					<TabsList className="mt-3 mb-0 h-9">
						<TabsTrigger value="search" className="text-sm">
							Search
						</TabsTrigger>
						<TabsTrigger value="expand" className="text-sm">
							Expand
						</TabsTrigger>
					</TabsList>
				</div>

				{/* ── Search tab ─────────────────────────────────────────── */}
				<TabsContent
					value="search"
					className="mt-0 flex flex-1 flex-col gap-2 overflow-hidden p-2"
				>
					<Input
						placeholder="Search engineering items…"
						value={searchInput}
						onChange={handleSearchChange}
						className="h-8 text-sm"
					/>
					<div className="min-h-0 flex-1 overflow-hidden">
						<ConfiguredTable
							config={engSearchConfig}
							params={searchParams}
							className="h-full"
						/>
					</div>
				</TabsContent>

				{/* ── Expand tab ─────────────────────────────────────────── */}
				<TabsContent value="expand" className="mt-0 flex-1 overflow-hidden">
					{nodeId ? (
						<ConfiguredTable
							key={nodeId}
							config={engExpandConfig}
							params={expandParams}
							className="h-full"
						/>
					) : (
						<div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
							<MousePointerClick className="h-8 w-8 opacity-40" />
							<p className="text-sm">
								Drop an Engineering Item to explore its structure
							</p>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
