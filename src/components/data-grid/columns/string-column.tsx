import type {
	ColumnMeta,
	GridColumnDef,
} from "@/components/data-grid/types/column-types";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/components/data-grid/utils/grid-utils";

interface StringColumnOptions {
	accessorKey: string;
	header: string;
	editable?: boolean;
	copyable?: boolean;
	width?: number;
	minWidth?: number;
	meta?: Partial<ColumnMeta>;
	[key: string]: unknown;
}

function CopyButton({ value }: { value: string }) {
	const [copied, setCopied] = useState(false);
	const handleCopy = async () => {
		await navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};
	return (
		<button
			onClick={(e) => {
				e.stopPropagation();
				void handleCopy();
			}}
			className="ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
			aria-label="Copy value"
		>
			{copied ? (
				<Check className="h-3 w-3 text-emerald-500" />
			) : (
				<Copy className="h-3 w-3" />
			)}
		</button>
	);
}

/**
 * Creates a string column definition.
 *
 * @param options.accessorKey - The key of the data field to display
 * @param options.header - Column header label
 * @param options.editable - Enable double-click inline editing (default: false)
 * @param options.copyable - Show copy button on cell hover (default: false)
 * @param options.width - Base width in pixels (default: 200)
 * @param options.minWidth - Minimum width of the column layout (default: 80)
 * @param options.meta - Extra column metadata injected into react-table
 *
 * @example
 * stringColumn({ accessorKey: 'name', header: 'Name', editable: true, copyable: true })
 */
export function stringColumn(options: StringColumnOptions): GridColumnDef {
	const {
		accessorKey,
		header,
		editable,
		copyable,
		width,
		minWidth,
		meta: extraMeta,
		...rest
	} = options;

	const classNameHeader = extraMeta?.classNameHeader as string | undefined;

	return {
		accessorKey,
		header: classNameHeader
			? ({ column }) => <div className={classNameHeader}>{header}</div>
			: header,
		size: width ?? 200,
		minSize: minWidth ?? 80,
		filterFn: "includesString",
		meta: {
			type: "string",
			editable: editable ?? false,
			copyable: copyable ?? false,
			...extraMeta,
		},
		cell: ({ getValue, column }) => {
			const value = getValue<string>() ?? "";
			const meta = column.columnDef.meta as ColumnMeta | undefined;
			const isRenderingBadge = meta?.renderType === "badge";
			const classNameCell = meta?.classNameCell as string | undefined;

			if (isRenderingBadge) {
				return (
					<Badge
						variant="outline"
						className={cn("text-xs font-medium capitalize", classNameCell)}
					>
						{value}
					</Badge>
				);
			}

			return (
				<div className={cn("flex items-center group truncate", classNameCell)}>
					<span className="truncate">{value}</span>
					{copyable && value && <CopyButton value={value} />}
				</div>
			);
		},
		...rest,
	} as GridColumnDef;
}
