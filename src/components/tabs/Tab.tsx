import { Badge } from "@/components/ui/badge";
import { TabsTrigger } from "@/components/ui/tabs";
import type { TabConfig } from "@/types";

interface TabTriggerProps {
	tab: TabConfig;
	isActive?: boolean;
}

/**
 * Thin wrapper around shadcn TabsTrigger.
 * Can be used standalone when direct TabsTrigger usage isn't preferred.
 */
export function Tab({ tab }: TabTriggerProps) {
	const isDisabled = typeof tab.disabled === "boolean" ? tab.disabled : false;

	return (
		<TabsTrigger value={tab.id} disabled={isDisabled}>
			{tab.icon && (
				<span className="text-[14px] leading-none">{tab.icon}</span>
			)}
			{tab.label}
			{typeof tab.badge === "string" && tab.badge && (
				<Badge variant="secondary" className="ml-1 h-4 min-w-4 px-1 text-[10px]">
					{tab.badge}
				</Badge>
			)}
		</TabsTrigger>
	);
}
