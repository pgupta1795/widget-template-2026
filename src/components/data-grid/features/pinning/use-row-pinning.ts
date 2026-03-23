import type { RowPinningFeatureConfig } from "@/components/data-grid/types/grid-types";
import type { OnChangeFn, RowPinningState } from "@tanstack/react-table";
import React from "react";

export function useRowPinning(config: RowPinningFeatureConfig | undefined) {
	const [rowPinning, setRowPinning] = React.useState<RowPinningState>({});

	const handleRowPinningChange: OnChangeFn<RowPinningState> = React.useCallback(
		(updater) => {
			setRowPinning((prev) =>
				typeof updater === "function" ? updater(prev) : updater,
			);
		},
		[],
	);

	const tableOptions = {
		enableRowPinning: config?.enabled ?? true,
		keepPinnedRows: true,
		onRowPinningChange: handleRowPinningChange,
	};

	return { rowPinning, tableOptions };
}
