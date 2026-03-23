import type { GroupingFeatureConfig } from "@/components/data-grid/types/grid-types";
import type {
	ExpandedState,
	GroupingState,
	OnChangeFn,
} from "@tanstack/react-table";
import React from "react";

export function useGrouping(config: GroupingFeatureConfig | undefined) {
	const [grouping, setGrouping] = React.useState<GroupingState>([]);
	const [expanded, setExpanded] = React.useState<ExpandedState>({});

	const handleGroupingChange: OnChangeFn<GroupingState> = React.useCallback(
		(updater) => {
			setGrouping((prev) =>
				typeof updater === "function" ? updater(prev) : updater,
			);
		},
		[],
	);

	const handleExpandedChange: OnChangeFn<ExpandedState> = React.useCallback(
		(updater) => {
			setExpanded((prev) =>
				typeof updater === "function" ? updater(prev) : updater,
			);
		},
		[],
	);

	const tableOptions = {
		enableGrouping: config?.enabled ?? true,
		groupedColumnMode: "reorder" as const,
		onGroupingChange: handleGroupingChange,
		onExpandedChange: handleExpandedChange,
		autoResetExpanded: false,
	};

	return { grouping, expanded, tableOptions };
}
