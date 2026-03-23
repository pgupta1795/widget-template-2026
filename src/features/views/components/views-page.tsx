import { useSidebarSlot } from "@/components/layout/sidebar-slot-context";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { SidebarGroup, SidebarGroupContent } from "@/components/ui/sidebar";
import { ViewRenderer } from "@/components/view/ViewRenderer";
import {
	changeActionConfig,
	bomExplorerConfig,
	partDetailConfig,
} from "@/configs/examples";
import type { ViewConfig } from "@/types";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { changeActionData, bomData, partData, mockTableRows } from "./mock-data";
import { cn } from "@/lib/utils";

interface ExampleView {
	id: string;
	label: string;
	config: ViewConfig;
	data: Record<string, unknown>;
}

const EXAMPLE_VIEWS: ExampleView[] = [
	{
		id: "change-action",
		label: "Change Action",
		config: changeActionConfig,
		data: changeActionData,
	},
	{
		id: "bom-explorer",
		label: "BOM Explorer",
		config: bomExplorerConfig,
		data: bomData,
	},
	{
		id: "part-detail",
		label: "Part Detail",
		config: partDetailConfig,
		data: partData,
	},
];

function ViewsSidebarContent({
	views,
	activeId,
	onSelect,
}: {
	views: ExampleView[];
	activeId: string;
	onSelect: (id: string) => void;
}) {
	return (
		<div className="flex h-full flex-col">
			<div className="border-b px-3 py-2">
				<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					View Configs
				</h3>
			</div>
			<SidebarGroup className="flex-1 overflow-auto p-0">
				<SidebarGroupContent>
					<div className="flex flex-col gap-0.5 p-1">
						{views.map((view) => (
							<button
								key={view.id}
								type="button"
								onClick={() => onSelect(view.id)}
								className={cn(
									"w-full rounded-md px-3 py-2 text-left text-sm transition-colors",
									activeId === view.id
										? "bg-accent text-accent-foreground font-medium"
										: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
								)}
							>
								{view.label}
							</button>
						))}
					</div>
				</SidebarGroupContent>
			</SidebarGroup>
		</div>
	);
}

function MockTable({
	tableId,
	tableConfig,
}: {
	tableId: string;
	tableConfig: unknown;
}) {
	const config = tableConfig as
		| { columns?: { id: string; header: string; accessorKey: string }[] }
		| undefined;
	const columns = config?.columns ?? [];
	const rows = mockTableRows[tableId] ?? [];

	return (
		<div className="flex h-full flex-col">
			<div className="min-h-0 flex-1 overflow-auto">
				<Table>
					<TableHeader>
						<TableRow className="bg-muted/30">
							{columns.map((col) => (
								<TableHead key={col.id}>{col.header}</TableHead>
							))}
						</TableRow>
					</TableHeader>
					<TableBody>
						{rows.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={columns.length}
									className="h-24 text-center text-muted-foreground"
								>
									No data available
								</TableCell>
							</TableRow>
						) : (
							rows.map((row, idx) => (
								<TableRow key={idx}>
									{columns.map((col) => (
										<TableCell key={col.id}>
											{String(row[col.accessorKey] ?? "")}
										</TableCell>
									))}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
			<div className="border-t bg-muted/20 px-3 py-1.5 text-xs text-muted-foreground">
				Total Items: {rows.length} &nbsp; Selected Items: 0
			</div>
		</div>
	);
}

export function ViewsPage() {
	const [activeId, setActiveId] = useState("change-action");
	const { slotEl } = useSidebarSlot();

	const activeView = EXAMPLE_VIEWS.find((v) => v.id === activeId) ?? EXAMPLE_VIEWS[0];

	const tableRenderer = useCallback(
		(tableId: string, tableConfig: unknown) => (
			<MockTable tableId={tableId} tableConfig={tableConfig} />
		),
		[],
	);

	return (
		<>
			{slotEl &&
				createPortal(
					<ViewsSidebarContent
						views={EXAMPLE_VIEWS}
						activeId={activeId}
						onSelect={setActiveId}
					/>,
					slotEl,
				)}
			<ViewRenderer
				config={activeView.config}
				data={activeView.data}
				tableRenderer={tableRenderer}
				className="h-full"
			/>
		</>
	);
}
