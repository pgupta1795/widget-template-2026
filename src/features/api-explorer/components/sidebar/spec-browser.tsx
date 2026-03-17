import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Loader2, Package, Search } from "lucide-react";
import { useState } from "react";
import { useApiExplorer } from "../../context/api-explorer-context";

export function SpecBrowser() {
	const {
		builtInCollections,
		customCollections,
		builtInLoading,
		toggleActive,
		isActive,
	} = useApiExplorer();
	const [search, setSearch] = useState("");

	const allCollections = [...builtInCollections, ...customCollections];
	const filtered = allCollections.filter(
		(c) =>
			!search.trim() || c.name.toLowerCase().includes(search.toLowerCase()),
	);

	if (builtInLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<Loader2 size={16} className="animate-spin text-muted-foreground" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-2 pb-2">
			<div className="px-3 mb-1">
				<p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/50 mb-2">
					{filtered.length} API collection{filtered.length !== 1 ? "s" : ""}
				</p>
				<div className="relative">
					<Search
						size={11}
						className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/50"
					/>
					<Input
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						placeholder="Search APIs..."
						className="h-7 pl-8 text-xs"
					/>
				</div>
			</div>

			<div className="space-y-px px-1">
				{filtered.map((col) => (
					<div
						key={col.id}
						className={`flex items-center gap-2 px-2 py-2 rounded-lg transition-colors ${
							isActive(col.id)
								? "bg-primary/5 border border-primary/15"
								: "hover:bg-sidebar-accent/50 border border-transparent"
						}`}
					>
						<div className="w-7 h-7 rounded-md bg-muted/60 flex items-center justify-center shrink-0">
							<Package
								size={12}
								className={
									isActive(col.id) ? "text-primary" : "text-muted-foreground/60"
								}
							/>
						</div>
						<div className="flex-1 min-w-0">
							<p
								className={`text-xs font-medium wrap-break-word leading-tight ${isActive(col.id) ? "text-primary" : "text-sidebar-foreground"}`}
							>
								{col.name}
							</p>
							<p className="text-[10px] text-muted-foreground/60 leading-tight mt-0.5">
								{col.serviceType} · {col.endpointCount} endpoints
							</p>
						</div>
						<Switch
							checked={isActive(col.id)}
							onCheckedChange={() => toggleActive(col.id)}
							className="shrink-0 scale-[0.7]"
						/>
					</div>
				))}
				{filtered.length === 0 && (
					<p className="text-xs text-muted-foreground text-center py-6">
						No APIs match your search
					</p>
				)}
			</div>
		</div>
	);
}
