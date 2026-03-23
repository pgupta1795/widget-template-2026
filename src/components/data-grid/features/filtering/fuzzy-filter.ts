import { rankItem } from "@tanstack/match-sorter-utils";
import type { FilterFn, Row } from "@tanstack/react-table";
import type { GridRow } from "@/components/data-grid/types/grid-types";

export const fuzzyFilter: FilterFn<GridRow> = (
	row: Row<GridRow>,
	columnId: string,
	filterValue: string,
	addMeta: (meta: Record<string, unknown>) => void,
): boolean => {
	const value = row.getValue<unknown>(columnId);
	const stringValue =
		value === null || value === undefined ? "" : String(value);

	const itemRank = rankItem(stringValue, filterValue);

	// Store rank in row meta for sort-by-rank support
	addMeta({ itemRank });

	return itemRank.passed;
};

fuzzyFilter.autoRemove = (val: unknown) => !val || String(val).length === 0;

export function fuzzyMatch(str: string, query: string): boolean {
	if (!query) return true;
	if (!str) return false;
	const itemRank = rankItem(str, query);
	return itemRank.passed;
}
