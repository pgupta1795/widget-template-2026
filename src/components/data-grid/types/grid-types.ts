import type { SortState } from "./sort-types";
import type { FilterState } from "./filter-types";

export interface GridRow {
	id: string;
	children?: GridRow[];
	_hasChildren?: boolean;
	[key: string]: unknown;
}

export type GridMode = "flat" | "paginated" | "infinite" | "tree";
export type GridDensity = "compact" | "normal" | "comfortable";

export interface MutationContext {
	rowId: string;
	columnId: string;
	previousValue: unknown;
}

export interface PaginationState {
	pageIndex: number;
	pageSize: number;
}

export interface InfiniteDataResult<T> {
	rows: T[];
	nextCursor?: string | number | null;
	totalCount?: number;
}

export interface SortingFeatureConfig {
	enabled?: boolean;
	mode?: "client" | "server";
	onSortChange?: (sorts: SortState[]) => void;
}

export interface FilteringFeatureConfig {
	enabled?: boolean;
	mode?: "client" | "server";
	filterRow?: boolean;
	onFilterChange?: (filters: FilterState[]) => void;
}

export interface EditingFeatureConfig {
	enabled?: boolean;
	onMutate?: (rowId: string, columnId: string, value: unknown) => Promise<void>;
	onError?: (error: unknown) => void;
	saveOnBlur?: boolean;
}

export interface SelectionFeatureConfig {
	enabled?: boolean;
	mode?: "single" | "multi";
}

export interface PaginationFeatureConfig {
	enabled?: boolean;
	pageSize?: number;
	pageSizes?: number[];
}

export interface VirtualizationFeatureConfig {
	enabled?: boolean;
	rowHeight?: number;
	overscan?: number;
}

export interface GroupingFeatureConfig {
	enabled?: boolean;
}

export interface LoadingFeatureConfig {
	enabled?: boolean;
	skeletonRows?: number;
}

export interface ColumnPinningFeatureConfig {
	enabled?: boolean;
}

export interface RowPinningFeatureConfig {
	enabled?: boolean;
}

export interface AddRowFeatureConfig {
	enabled?: boolean;
	onAddRow?: () => void;
}

export interface GridFeaturesConfig {
	sorting?: SortingFeatureConfig;
	filtering?: FilteringFeatureConfig;
	editing?: EditingFeatureConfig;
	selection?: SelectionFeatureConfig;
	pagination?: PaginationFeatureConfig;
	virtualization?: VirtualizationFeatureConfig;
	grouping?: GroupingFeatureConfig;
	loading?: LoadingFeatureConfig;
	columnPinning?: ColumnPinningFeatureConfig;
	rowPinning?: RowPinningFeatureConfig;
	addRow?: AddRowFeatureConfig | boolean;
}
