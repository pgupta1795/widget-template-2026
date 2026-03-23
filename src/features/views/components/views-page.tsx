import { useSidebarSlot } from "@/components/layout/sidebar-slot-context";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	SidebarGroup,
	SidebarGroupContent,
	SidebarGroupLabel,
	SidebarHeader,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
} from "@/components/ui/sidebar";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
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

interface ExampleView {
	id: string;
	label: string;
	description: string;
	config: ViewConfig;
	data: Record<string, unknown>;
}

const EXAMPLE_VIEWS: ExampleView[] = [
	{
		id: "change-action",
		label: "Change Action",
		description: "Engineering change workflow",
		config: changeActionConfig,
		data: changeActionData,
	},
	{
		id: "bom-explorer",
		label: "BOM Explorer",
		description: "Bill of materials hierarchy",
		config: bomExplorerConfig,
		data: bomData,
	},
	{
		id: "part-detail",
		label: "Part Detail",
		description: "Part metadata and attributes",
		config: partDetailConfig,
		data: partData,
	},
];

const STATE_BADGE_VARIANTS: Record<string, "info" | "success" | "warning" | "destructive" | "secondary"> = {
	Draft: "info",
	"In Work": "info",
	"In Approval": "warning",
	Complete: "success",
	Released: "success",
	Rejected: "destructive",
};

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
			<SidebarHeader className="border-b">
				<h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
					View Configs
				</h3>
			</SidebarHeader>
			<SidebarGroup className="flex-1 overflow-auto p-0">
				<SidebarGroupLabel>Example Configs</SidebarGroupLabel>
				<SidebarGroupContent>
					<SidebarMenu>
						{views.map((view) => (
							<SidebarMenuItem key={view.id}>
								<SidebarMenuButton
									isActive={activeId === view.id}
									onClick={() => onSelect(view.id)}
								>
									<div className="flex flex-col gap-0.5">
										<span>{view.label}</span>
										<span className="text-[10px] text-muted-foreground font-normal">
											{view.description}
										</span>
									</div>
								</SidebarMenuButton>
							</SidebarMenuItem>
						))}
					</SidebarMenu>
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
			<ScrollArea className="min-h-0 flex-1">
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
									{columns.map((col) => {
										const cellValue = String(row[col.accessorKey] ?? "");
										const isStateColumn = col.header === "Maturity State" || col.accessorKey === "maturityState" || col.accessorKey === "state";
										if (isStateColumn && cellValue) {
											const variant = STATE_BADGE_VARIANTS[cellValue] ?? "secondary";
											return (
												<TableCell key={col.id}>
													<Badge variant={variant}>{cellValue}</Badge>
												</TableCell>
											);
										}
										return (
											<TableCell key={col.id}>
												{cellValue}
											</TableCell>
										);
									})}
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</ScrollArea>
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
