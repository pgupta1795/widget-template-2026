import { Search, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ToolbarConfig } from "@/types/config";

type TableToolbarProps = {
	config?: ToolbarConfig;
	globalFilter: string;
	onGlobalFilterChange: (value: string) => void;
	totalItems: number;
	selectedItems: number;
};

export function TableToolbar({
	config,
	globalFilter,
	onGlobalFilterChange,
	totalItems,
	selectedItems,
}: TableToolbarProps) {
	const [showSearch, setShowSearch] = useState(false);

	return (
		<div className="flex items-center justify-between border-b border-border px-3 py-1.5">
			{/* Left: action buttons */}
			<div className="flex items-center gap-1">
				{config?.actions?.map((action) => (
					<Button
						key={action.id}
						variant={action.variant ?? "ghost"}
						size="sm"
						className="h-7 text-xs text-muted-foreground hover:text-foreground"
					>
						{action.label}
					</Button>
				))}
			</div>

			{/* Right: item count + search */}
			<div className="flex items-center gap-2">
				<span className="text-[0.6875rem] text-muted-foreground">
					{totalItems} items
					{selectedItems > 0 && ` · ${selectedItems} selected`}
				</span>

				{config?.search !== false &&
					(showSearch ? (
						<div className="flex items-center gap-1">
							<Input
								placeholder="Search..."
								value={globalFilter}
								onChange={(e) => onGlobalFilterChange(e.target.value)}
								className="h-6 w-48 text-xs"
							/>
							<Button
								variant="ghost"
								size="icon-xs"
								onClick={() => {
									setShowSearch(false);
									onGlobalFilterChange("");
								}}
							>
								<X />
							</Button>
						</div>
					) : (
						<Button
							variant="ghost"
							size="icon-xs"
							onClick={() => setShowSearch(true)}
						>
							<Search />
						</Button>
					))}
			</div>
		</div>
	);
}
