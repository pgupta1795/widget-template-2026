import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChevronDown, ChevronRight, Clipboard } from "lucide-react";
import { useState } from "react";
import type { SchemaNode } from "../../openapi/schema-generator";

function SchemaNodeRow({
	node,
	depth = 0,
}: {
	node: SchemaNode;
	depth?: number;
}) {
	const [open, setOpen] = useState(depth < 2);
	const hasChildren = node.children && node.children.length > 0;

	return (
		<div>
			<div
				className={`flex items-start gap-1.5 py-0.5 pr-2 rounded-sm text-xs hover:bg-muted/40 transition-colors ${
					hasChildren ? "cursor-pointer" : "cursor-default"
				}`}
				style={{ paddingLeft: `${8 + depth * 12}px` }}
				onClick={() => hasChildren && setOpen((o) => !o)}
			>
				<span className="shrink-0 w-3 mt-0.5">
					{hasChildren ? (
						open ? (
							<ChevronDown size={11} />
						) : (
							<ChevronRight size={11} />
						)
					) : null}
				</span>
				<span className="font-mono text-foreground/90 font-medium">
					{node.name}
				</span>
				<span className="text-muted-foreground/60 ml-0.5 text-[10px]">
					{node.type}
				</span>
				{node.required && (
					<Badge
						variant="destructive"
						className="text-[9px] px-1 py-0 h-3.5 ml-0.5"
					>
						req
					</Badge>
				)}
				{node.description && (
					<span className="text-muted-foreground/50 truncate max-w-32 ml-1 hidden md:inline text-[10px]">
						{node.description}
					</span>
				)}
			</div>
			{hasChildren && open && (
				<div>
					{node.children!.map((child, i) => (
						<SchemaNodeRow
							key={`${child.name}-${i}`}
							node={child}
							depth={depth + 1}
						/>
					))}
				</div>
			)}
		</div>
	);
}

interface Props {
	root: SchemaNode;
	exampleBody: string;
	onCopySample: () => void;
}

export function SchemaPanel({ root, exampleBody, onCopySample }: Props) {
	return (
		<div className="flex flex-col h-full border-l border-border w-56 shrink-0">
			<div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
				<span className="text-xs font-semibold text-foreground">
					{root.name}
				</span>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger
							render={
								<Button
									variant="ghost"
									size="icon"
									onClick={onCopySample}
									disabled={!exampleBody}
									className="h-6 w-6 text-muted-foreground hover:text-primary"
								/>
							}
						>
							<Clipboard size={13} />
						</TooltipTrigger>
						<TooltipContent side="left">Copy sample body</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			</div>
			<ScrollArea className="flex-1">
				<div className="py-1">
					{root.children?.map((child, i) => (
						<SchemaNodeRow key={`${child.name}-${i}`} node={child} depth={0} />
					)) ?? <SchemaNodeRow node={root} depth={0} />}
				</div>
				<div className="px-3 py-2 mt-1 border-t border-border/50">
					<span className="text-[9px] text-muted-foreground/50">
						<Badge
							variant="destructive"
							className="text-[8px] px-1 py-0 h-3 mr-1"
						>
							req
						</Badge>
						= required field
					</span>
				</div>
			</ScrollArea>
		</div>
	);
}
