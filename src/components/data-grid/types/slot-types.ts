// src/components/data-grid/types/slot-types.ts
import type { GridRow } from "./grid-types";

export interface GridSlots {
	selectionActions?: (selectedRows: GridRow[]) => React.ReactNode;
	emptyState?: React.ReactNode;
	loadingState?: React.ReactNode;
}
