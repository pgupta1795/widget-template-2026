import {
	ChevronDown,
	ExternalLink,
	Eye,
	Maximize2,
	MoreHorizontal,
	PanelRight,
	Pencil,
	Trash2,
} from "lucide-react";
import type { ComponentType } from "react";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CommandDefinition } from "@/types/config";

const ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
	eye: Eye,
	pencil: Pencil,
	trash: Trash2,
	"external-link": ExternalLink,
	"panel-right": PanelRight,
	"chevron-down": ChevronDown,
	maximize: Maximize2,
};

type TableCommandsProps = {
	commands: CommandDefinition[];
	row: Record<string, unknown>;
	onCommand: (command: CommandDefinition, row: Record<string, unknown>) => void;
};

export function TableCommands({
	commands,
	row,
	onCommand,
}: TableCommandsProps) {
	const inlineCommands = commands.filter(
		(c) => c.type === "expand" || c.type === "side-panel",
	);
	const menuCommands = commands.filter(
		(c) => c.type !== "expand" && c.type !== "side-panel",
	);

	return (
		<div className="flex items-center gap-0.5">
			{inlineCommands.map((cmd) => {
				const Icon = ICON_MAP[cmd.icon] ?? Eye;
				return (
					<Button
						key={cmd.id}
						variant="ghost"
						size="icon-xs"
						onClick={() => onCommand(cmd, row)}
						title={cmd.label}
					>
						<Icon className="size-3" />
					</Button>
				);
			})}

			{menuCommands.length > 0 && (
				<DropdownMenu>
					<DropdownMenuTrigger
						render={<Button variant="ghost" size="icon-xs" />}
					>
						<MoreHorizontal className="size-3" />
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						{menuCommands.map((cmd) => {
							const Icon = ICON_MAP[cmd.icon] ?? Eye;
							return (
								<DropdownMenuItem
									key={cmd.id}
									onClick={() => onCommand(cmd, row)}
								>
									<Icon className="size-3.5 mr-2" />
									{cmd.label}
								</DropdownMenuItem>
							);
						})}
					</DropdownMenuContent>
				</DropdownMenu>
			)}
		</div>
	);
}
