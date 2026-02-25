import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import type { TabDefinition } from "@/types/config";

type AdminTabProps = {
	tabs: (TabDefinition & { isHidden: boolean })[];
	onToggle: (tabId: string) => void;
	onReorder: (order: string[]) => void;
};

export function AdminTab({ tabs, onToggle, onReorder }: AdminTabProps) {
	const moveTab = (index: number, direction: -1 | 1) => {
		const newOrder = tabs.map((t) => t.id);
		const [moved] = newOrder.splice(index, 1);
		newOrder.splice(index + direction, 0, moved);
		onReorder(newOrder);
	};

	return (
		<div className="space-y-4 p-4">
			<div>
				<h3 className="text-sm font-semibold">Tab Configuration</h3>
				<p className="text-xs text-muted-foreground">
					Toggle visibility and reorder tabs
				</p>
			</div>

			<div className="space-y-1">
				{tabs
					.filter((t) => !t.adminOnly)
					.map((tab, index) => (
						<div
							key={tab.id}
							className="flex items-center justify-between rounded-md border px-3 py-2"
						>
							<div className="flex items-center gap-3">
								<Switch
									checked={!tab.isHidden}
									onCheckedChange={() => onToggle(tab.id)}
								/>
								<span className="text-sm">{tab.label}</span>
							</div>

							<div className="flex items-center gap-1">
								<Button
									variant="ghost"
									size="sm"
									disabled={index === 0}
									onClick={() => moveTab(index, -1)}
								>
									<ArrowUp className="size-3.5" />
								</Button>
								<Button
									variant="ghost"
									size="sm"
									disabled={
										index === tabs.filter((t) => !t.adminOnly).length - 1
									}
									onClick={() => moveTab(index, 1)}
								>
									<ArrowDown className="size-3.5" />
								</Button>
							</div>
						</div>
					))}
			</div>
		</div>
	);
}
