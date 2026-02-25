import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import type { ColumnDefinition } from "@/types/config";

type RowData = Record<string, unknown>;

function CellRenderer({
	column,
	value,
}: {
	column: ColumnDefinition;
	value: unknown;
}) {
	const strValue = value != null ? String(value) : "";

	switch (column.type) {
		case "badge": {
			const variant = column.badgeVariants?.[strValue] ?? "secondary";
			return <Badge variant={variant}>{strValue}</Badge>;
		}
		case "icon": {
			const iconUrl = column.iconMap?.[strValue] ?? strValue;
			return iconUrl ? (
				<img src={iconUrl} alt={strValue} className="size-5 object-contain" />
			) : null;
		}
		case "link":
			return (
				<span className="text-primary cursor-pointer hover:underline text-xs">
					{strValue}
				</span>
			);
		case "image":
			return strValue ? (
				<img src={strValue} alt="" className="size-8 rounded object-cover" />
			) : null;
		default:
			return <span className="text-xs">{strValue}</span>;
	}
}

export function buildColumns(
	columnDefs: ColumnDefinition[],
	options?: { selectable?: boolean },
): ColumnDef<RowData>[] {
	const columns: ColumnDef<RowData>[] = [];

	if (options?.selectable) {
		columns.push({
			id: "__select",
			header: ({ table }) => (
				<Checkbox
					checked={table.getIsAllPageRowsSelected()}
					onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
				/>
			),
			cell: ({ row }) => (
				<Checkbox
					checked={row.getIsSelected()}
					onCheckedChange={(value) => row.toggleSelected(!!value)}
				/>
			),
			size: 36,
			enableSorting: false,
		});
	}

	for (const colDef of columnDefs) {
		if (colDef.visible === false) continue;

		columns.push({
			id: colDef.id,
			accessorKey: colDef.accessorKey,
			header: colDef.header,
			cell: ({ getValue }) => (
				<CellRenderer column={colDef} value={getValue()} />
			),
			size: colDef.width,
			minSize: colDef.minWidth,
			enableSorting: colDef.sortable ?? false,
		});
	}

	return columns;
}
