import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TabConfig } from "@/types";

interface TabTriggerProps {
	tab: TabConfig;
	isActive: boolean;
	onClick: () => void;
}

export function Tab({ tab, isActive, onClick }: TabTriggerProps) {
	const isDisabled =
		typeof tab.disabled === "boolean" ? tab.disabled : false;

	return (
		<button
			type="button"
			role="tab"
			aria-selected={isActive}
			aria-disabled={isDisabled}
			disabled={isDisabled}
			onClick={onClick}
			className={cn(
				"relative inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors",
				"hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
				isActive
					? "border-primary text-foreground"
					: "border-transparent text-muted-foreground",
				isDisabled && "pointer-events-none opacity-50",
			)}
		>
			{tab.icon && (
				<span className="text-[14px] leading-none">{tab.icon}</span>
			)}
			{tab.label}
			{typeof tab.badge === "string" && tab.badge && (
				<Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
					{tab.badge}
				</Badge>
			)}
		</button>
	);
}
