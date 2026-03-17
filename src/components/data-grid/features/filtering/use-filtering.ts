import React from "react";
import type { ColumnFiltersState, OnChangeFn } from "@tanstack/react-table";
import type { FilteringFeatureConfig } from "@/components/data-grid/types/grid-types";
import type { FilterState } from "@/components/data-grid/types/filter-types";
import {
	stringFilter,
	dateRangeFilter,
	multiValueFilter,
	selectFilter,
	booleanFilter,
} from "./filter-functions";
import { fuzzyFilter } from "./fuzzy-filter";

const FILTER_FNS = {
	fuzzy: fuzzyFilter,
	stringFilter,
	dateRangeFilter,
	multiValueFilter,
	selectFilter,
	booleanFilter,
} as const;

function useDebounce<T extends (...args: never[]) => void>(
	fn: T | undefined,
	ms: number,
): T | undefined {
	const timerRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);
	const fnRef = React.useRef(fn);
	fnRef.current = fn;
	return React.useMemo(
		() =>
			fn
				? (((...args: Parameters<T>) => {
						clearTimeout(timerRef.current);
						timerRef.current = setTimeout(() => fnRef.current?.(...args), ms);
					}) as T)
				: undefined,
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[ms],
	);
}

export function useFiltering(config: FilteringFeatureConfig | undefined) {
	const mode = config?.mode ?? "client";
	const onFilterChange = config?.onFilterChange;

	const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
		[],
	);
	const [globalFilter, setGlobalFilter] = React.useState<string>("");

	const debouncedOnFilterChange = useDebounce(onFilterChange, 300);

	const handleColumnFiltersChange: OnChangeFn<ColumnFiltersState> =
		React.useCallback(
			(updater) => {
				setColumnFilters((prev) => {
					const next = typeof updater === "function" ? updater(prev) : updater;
					if (mode === "server" && debouncedOnFilterChange) {
						const filters: FilterState[] = next.map((f) => ({
							columnId: f.id,
							value: f.value,
						}));
						debouncedOnFilterChange(filters);
					}
					return next;
				});
			},
			[mode, debouncedOnFilterChange],
		);

	const tableOptions = {
		manualFiltering: mode === "server",
		filterFns: FILTER_FNS,
		globalFilterFn: "fuzzy" as const,
		onColumnFiltersChange: handleColumnFiltersChange,
		onGlobalFilterChange: setGlobalFilter,
	};

	return {
		columnFilters,
		setColumnFilters,
		globalFilter,
		setGlobalFilter,
		tableOptions,
	};
}
