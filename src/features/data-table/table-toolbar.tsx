import type { Table as TanstackTable } from "@tanstack/react-table";
import { CommandIcon, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
	Menubar,
	MenubarCheckboxItem,
	MenubarContent,
	MenubarItem,
	MenubarMenu,
	MenubarSeparator,
	MenubarTrigger,
} from "@/components/ui/menubar";
import type { ToolbarConfig } from "@/types/config";

type RowData = Record<string, unknown>;

type TableToolbarProps = {
	table: TanstackTable<RowData>;
	config?: ToolbarConfig;
	globalFilter: string;
	onGlobalFilterChange: (value: string) => void;
	totalItems: number;
	selectedItems: number;
	onAction?: (actionId: string) => void;
};

export function TableToolbar({
	table,
	config,
	globalFilter,
	onGlobalFilterChange,
	totalItems,
	selectedItems,
	onAction,
}: TableToolbarProps) {
	const [commandOpen, setCommandOpen] = useState(false);
	const [showSearch, setShowSearch] = useState(false);

	const visibleColumns = useMemo(
		() => table.getAllLeafColumns().filter((col) => col.id !== "__commands"),
		[table],
	);

	return (
		<div className="flex items-center justify-between border-b border-border px-2 py-1.5">
			<div className="flex items-center gap-1">
				<Menubar className="h-7 rounded-sm border-border bg-background p-0.5">
					<MenubarMenu>
						<MenubarTrigger>Actions</MenubarTrigger>
						<MenubarContent>
							{config?.actions?.map((action) => (
								<MenubarItem
									key={action.id}
									onClick={() => {
										onAction?.(action.id);
										toast.success(`${action.label} completed.`);
									}}
								>
									{action.label}
								</MenubarItem>
							))}
							<MenubarSeparator />
							<MenubarItem
								onClick={() => {
									table.toggleAllRowsSelected(false);
									toast.info("Selection cleared.");
								}}
							>
								Clear Selection
							</MenubarItem>
						</MenubarContent>
					</MenubarMenu>
					<MenubarMenu>
						<MenubarTrigger>View</MenubarTrigger>
						<MenubarContent>
							{visibleColumns.map((column) => (
								<MenubarCheckboxItem
									key={column.id}
									checked={column.getIsVisible()}
									onCheckedChange={() => column.toggleVisibility()}
								>
									{String(column.columnDef.header ?? column.id)}
								</MenubarCheckboxItem>
							))}
						</MenubarContent>
					</MenubarMenu>
				</Menubar>

				<Button
					variant="ghost"
					size="sm"
					onClick={() => setCommandOpen(true)}
					title="Open command palette"
				>
					<CommandIcon />
					Command
				</Button>

				<Drawer>
					<DrawerTrigger render={<Button variant="ghost" size="sm" />}>
						Tools
					</DrawerTrigger>
					<DrawerContent>
						<DrawerHeader>
							<DrawerTitle>Table Tools</DrawerTitle>
							<DrawerDescription>Quick table actions</DrawerDescription>
						</DrawerHeader>
						<div className="space-y-2 px-4 pb-4">
							<Button
								variant="outline"
								className="w-full justify-start"
								onClick={() => {
									table.toggleAllRowsSelected(false);
									toast.info("Selection cleared.");
								}}
							>
								Clear Selection
							</Button>
							{config?.actions?.map((action) => (
								<Button
									key={action.id}
									variant="outline"
									className="w-full justify-start"
									onClick={() => {
										onAction?.(action.id);
										toast.success(`${action.label} completed.`);
									}}
								>
									{action.label}
								</Button>
							))}
						</div>
					</DrawerContent>
				</Drawer>
			</div>

			<div className="flex items-center gap-2">
				<span className="text-[0.6875rem] text-muted-foreground">
					{totalItems} items
					{selectedItems > 0 ? ` · ${selectedItems} selected` : ""}
				</span>

				{config?.search !== false &&
					(showSearch ? (
						<Input
							placeholder="Search..."
							value={globalFilter}
							onChange={(e) => onGlobalFilterChange(e.target.value)}
							className="h-6 w-48 text-xs"
						/>
					) : null)}
				<Button
					variant="ghost"
					size="icon-xs"
					onClick={() => {
						const next = !showSearch;
						setShowSearch(next);
						if (!next) onGlobalFilterChange("");
					}}
				>
					<Search />
				</Button>
			</div>

			<CommandDialog
				open={commandOpen}
				onOpenChange={setCommandOpen}
				title="Table Commands"
				description="Run a table action"
			>
				<Command>
					<CommandInput placeholder="Search command..." />
					<CommandList>
						<CommandEmpty>No command found.</CommandEmpty>
						<CommandGroup heading="Actions">
							{config?.actions?.map((action) => (
								<CommandItem
									key={action.id}
									onSelect={() => {
										onAction?.(action.id);
										setCommandOpen(false);
										toast.success(`${action.label} completed.`);
									}}
								>
									{action.label}
								</CommandItem>
							))}
							<CommandItem
								onSelect={() => {
									table.toggleAllRowsSelected(false);
									setCommandOpen(false);
									toast.info("Selection cleared.");
								}}
							>
								Clear Selection
							</CommandItem>
						</CommandGroup>
					</CommandList>
				</Command>
			</CommandDialog>
		</div>
	);
}
