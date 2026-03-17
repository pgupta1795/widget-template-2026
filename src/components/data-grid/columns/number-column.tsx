import type {
	ColumnMeta,
	GridColumnDef,
} from "@/components/data-grid/types/column-types";
import { cn } from "@/components/data-grid/utils/grid-utils";
import { formatNumber } from "@/components/data-grid/utils/formatters";

interface NumberColumnOptions {
	accessorKey: string;
	header: string;
	editable?: boolean;
	format?: "currency" | "percent" | "decimal";
	currency?: string;
	locale?: string;
	width?: number;
	meta?: Partial<ColumnMeta>;
	[key: string]: unknown;
}

/**
 * Creates a number configured column definition.
 *
 * @param options.accessorKey - The key of the data field to display
 * @param options.header - Column header label
 * @param options.editable - Enable double-click inline editing (default: false)
 * @param options.format - Optional formatting ('currency' | 'percent' | 'decimal')
 * @param options.currency - ISO currency code for 'currency' format (e.g. 'USD')
 * @param options.locale - Display locale override (e.g. 'en-US')
 * @param options.width - Base width in pixels (default: 120)
 * @param options.meta - Extra column metadata injected into react-table
 *
 * @example
 * numberColumn({ accessorKey: 'price', header: 'Price', format: 'currency', currency: 'USD' })
 */
export function numberColumn(options: NumberColumnOptions): GridColumnDef {
	const {
		accessorKey,
		header,
		editable,
		format,
		currency,
		locale,
		width,
		meta: extraMeta,
		...rest
	} = options;

	const classNameHeader = extraMeta?.classNameHeader as string | undefined;

	return {
		accessorKey,
		header: classNameHeader
			? ({ column }) => <div className={classNameHeader}>{header}</div>
			: header,
		size: width ?? 120,
		enableSorting: true,
		meta: {
			type: "number",
			editable: editable ?? false,
			format,
			currency,
			locale,
			...extraMeta,
		},
		cell: ({ getValue, column }) => {
			const value = getValue<number>();
			if (value === null || value === undefined) return null;
			const meta = column.columnDef.meta as any;
			const classNameCell = meta?.classNameCell as string | undefined;
			const display = format
				? formatNumber(value, format, locale, currency)
				: String(value);
			return (
				<div className={cn("text-right font-mono tabular-nums", classNameCell)}>
					{display}
				</div>
			);
		},
		...rest,
	} as GridColumnDef;
}
