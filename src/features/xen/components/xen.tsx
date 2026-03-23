import {ConfiguredTable} from "@/components/data-grid/table-engine";
import {Tabs,TabsContent,TabsList,TabsTrigger} from "@/components/ui/tabs";
import {use3dxDropZone} from "@/hooks/use-3dx-drop-zone";
import {cn} from "@/lib/utils";
import {MousePointerClick} from "lucide-react";
import {useMemo,useState} from "react";
import {caSearchConfig} from "../configs/ca-search.config";
import {engExpandConfig} from "../configs/eng-expand.config";
import {engSearchConfig} from "../configs/eng-search.config";

export function Xen() {
	const [nodeId,setNodeId]=useState<string|null>(null);
	const expandParams=useMemo(
		() => (nodeId? {nodeId}:({} as Record<string,string>)),
		[nodeId],
	);

	const {ref: dropRef,isDragOver}=use3dxDropZone<HTMLDivElement>({
		onDrop: (items) => {
			const id=items[0]?.objectId;
			if (id) setNodeId(id);
		},
	});

	return (
		<div
			ref={dropRef}
			className={cn(
				"flex h-full flex-col overflow-hidden transition-all",
				isDragOver&&"ring-2 ring-primary ring-inset",
			)}
		>
			<Tabs defaultValue="change-action" className="flex h-full flex-col">
				<div className="border-b px-4">
					<TabsList className="mt-3 mb-0 h-9">
						<TabsTrigger value="search" className="text-sm">
							Search
						</TabsTrigger>
						<TabsTrigger value="expand" className="text-sm">
							Expand
						</TabsTrigger>
						<TabsTrigger value="change-action" className="text-sm">
							Change Action
						</TabsTrigger>
					</TabsList>
				</div>

				<TabsContent
					value="search"
					className="mt-0 flex flex-1 flex-col gap-2 overflow-hidden p-2"
				>
					<div className="min-h-0 flex-1 overflow-hidden">
						<ConfiguredTable
							config={engSearchConfig}
							// params={searchParams}
							className="h-full"
						/>
					</div>
				</TabsContent>

				<TabsContent value="expand" className="mt-0 flex-1 overflow-hidden">
					{nodeId? (
						<ConfiguredTable
							key={nodeId}
							config={engExpandConfig}
							params={expandParams}
							className="h-full"
						/>
					):(
						<div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
							<MousePointerClick className="h-8 w-8 opacity-40" />
							<p className="text-sm">
								Drop an Engineering Item to explore its structure
							</p>
						</div>
					)}
				</TabsContent>

				<TabsContent
					value="change-action"
					className="mt-0 flex flex-1 flex-col gap-2 overflow-hidden p-2"
				>
					<div className="min-h-0 flex-1 overflow-hidden">
						<ConfiguredTable
							config={caSearchConfig}
							className="h-full"
						/>
					</div>
				</TabsContent>
			</Tabs>
		</div>
	);
}
