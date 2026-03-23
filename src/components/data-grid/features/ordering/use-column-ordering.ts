import React from "react";
import type { ColumnOrderState, OnChangeFn } from "@tanstack/react-table";

export function useColumnOrdering() {
	const [columnOrder, setColumnOrder] = React.useState<ColumnOrderState>([]);

	const handleColumnOrderChange: OnChangeFn<ColumnOrderState> =
		React.useCallback((updater) => {
			setColumnOrder((prev) =>
				typeof updater === "function" ? updater(prev) : updater,
			);
		}, []);

	const tableOptions = {
		onColumnOrderChange: handleColumnOrderChange,
	};

	return { columnOrder, tableOptions };
}
