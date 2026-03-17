import type {
	ColumnMeta,
	GridColumnDef,
} from "@/components/data-grid/types/column-types";
import { cn } from "@/components/data-grid/utils/grid-utils";
import { formatDate } from "@/components/data-grid/utils/formatters";
import { CalendarIcon } from "lucide-react";

interface DateColumnOptions {
	accessorKey: string;
	header: string;
	editable?: boolean;
	dateFormat?: string;
	width?: number;
	meta?: Partial<ColumnMeta>;
	[key: string]: unknown;
}

/**
 * Creates a date column definition with calendar icon.
 *
 * @param options.accessorKey - The key of the data field to display
 * @param options.header - Column header label
 * @param options.editable - Enable double-click inline editing (default: false)
 * @param options.dateFormat - Format string for date display (default: 'MMM d, yyyy')
 * @param options.width - Base width in pixels (default: 160)
 * @param options.meta - Extra column metadata injected into react-table
 *
 * @example
 * dateColumn({ accessorKey: 'createdAt', header: 'Created', dateFormat: 'MMM d, yyyy' })
 */
export function dateColumn(options: DateColumnOptions): GridColumnDef {
	const {
		accessorKey,
		header,
		editable,
		dateFormat = "MMM d, yyyy",
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
		size: width ?? 160,
		meta: {
			type: "date",
			editable: editable ?? false,
			dateFormat,
			...extraMeta,
		},
		cell: ({ getValue, column }) => {
			const value = getValue<Date | string | number | null>();
			if (!value) return null;
			const meta = column.columnDef.meta as any;
			const classNameCell = meta?.classNameCell as string | undefined;
			const display = formatDate(value, dateFormat);
			return (
				<div
					className={cn(
						"-mx-1.5 flex items-center gap-1.5 rounded bg-orange-500/5 px-1.5",
						classNameCell,
					)}
				>
					<CalendarIcon className="h-3.5 w-3.5 shrink-0 text-orange-400" />
					<span className="text-sm">{display}</span>
				</div>
			);
		},
		...rest,
	} as GridColumnDef;
}
