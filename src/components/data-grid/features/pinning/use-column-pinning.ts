import type { ColumnPinningFeatureConfig } from "@/components/data-grid/types/grid-types";
import type { ColumnPinningState, OnChangeFn } from "@tanstack/react-table";
import React from "react";

export function useColumnPinning(
	config: ColumnPinningFeatureConfig | undefined,
) {
	const [columnPinning, setColumnPinning] = React.useState<ColumnPinningState>(
		{},
	);

	const handleColumnPinningChange: OnChangeFn<ColumnPinningState> =
		React.useCallback((updater) => {
			setColumnPinning((prev) =>
				typeof updater === "function" ? updater(prev) : updater,
			);
		}, []);

	const tableOptions = {
		enableColumnPinning: config?.enabled ?? true,
		onColumnPinningChange: handleColumnPinningChange,
	};

	return { columnPinning, tableOptions };
}
