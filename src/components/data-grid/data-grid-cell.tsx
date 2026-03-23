import { getEditor } from "@/components/data-grid/editors/get-editor";
import { getPinnedShadowClass } from "@/components/data-grid/features/pinning/pinned-shadow";
import type { ColumnMeta } from "@/components/data-grid/types/column-types";
import type { GridRow } from "@/components/data-grid/types/grid-types";
import {
	formatDate,
	formatNumber,
} from "@/components/data-grid/utils/formatters";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { TableCell } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { flexRender, type Cell } from "@tanstack/react-table";
import { Calendar, Check, Copy, X } from "lucide-react";
import type React from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { useDataGridContext } from "./data-grid-context";

// ---------------------------------------------------------------------------
// CopyButton
// ---------------------------------------------------------------------------

function CopyButton({
	value,
	alwaysVisible,
}: {
	value: string;
	alwaysVisible?: boolean;
}) {
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		await navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<Button
			variant="ghost"
			size="icon-xs"
			onClick={(e) => {
				e.stopPropagation();
				void handleCopy();
			}}
			className={cn(
				"ml-1.5 shrink-0 text-muted-foreground hover:text-foreground",
				alwaysVisible ? "opacity-100" : "opacity-0 group-hover/row:opacity-100",
			)}
			aria-label="Copy value"
		>
			{copied ? (
				<Check className="h-3 w-3 text-emerald-500" />
			) : (
				<Copy className="h-3 w-3" />
			)}
		</Button>
	);
}

// ---------------------------------------------------------------------------
// DEFAULT_COLORS palette (matches select-column.tsx)
// ---------------------------------------------------------------------------

const DEFAULT_COLORS: Record<string, string> = {
	active:
		"bg-emerald-500/10 text-emerald-700 border-emerald-200 dark:text-emerald-400 dark:border-emerald-800",
	draft:
		"bg-blue-500/10 text-blue-700 border-blue-200 dark:text-blue-400 dark:border-blue-800",
	obsolete:
		"bg-zinc-500/10 text-zinc-600 border-zinc-200 dark:text-zinc-400 dark:border-zinc-700",
	review:
		"bg-amber-500/10 text-amber-700 border-amber-200 dark:text-amber-400 dark:border-amber-800",
};

// ---------------------------------------------------------------------------
// Type-based renderers
// ---------------------------------------------------------------------------

function StringRenderer({
	value,
	meta,
}: {
	value: unknown;
	meta?: ColumnMeta;
}) {
	const str = String(value ?? "");
	return (
		<div className="flex min-w-0 items-center">
			<span className="truncate">{str}</span>
			{meta?.copyable && str && <CopyButton value={str} />}
		</div>
	);
}

function NumberRenderer({
	value,
	meta,
}: {
	value: unknown;
	meta?: ColumnMeta;
}) {
	const num = Number(value);
	const display = meta?.format
		? formatNumber(
				num,
				meta.format,
				meta.locale ?? "en-US",
				meta.currency ?? "USD",
			)
		: String(value ?? "");

	return <span className="font-mono">{display}</span>;
}

function DateRenderer({ value, meta }: { value: unknown; meta?: ColumnMeta }) {
	const display = formatDate(
		value as Date | string | number | null | undefined,
		meta?.dateFormat,
	);

	return (
		<div className="flex items-center gap-1.5">
			<Calendar
				className="shrink-0 text-muted-foreground"
				style={{ width: 14, height: 14 }}
			/>
			<span>{display}</span>
		</div>
	);
}

function MultiValueRenderer({
	value,
	meta,
}: {
	value: unknown;
	meta?: ColumnMeta;
}) {
	const items = Array.isArray(value) ? (value as string[]) : [];
	const maxVisible = meta?.maxVisible ?? 3;
	const visible = items.slice(0, maxVisible);
	const overflow = items.length - maxVisible;

	return (
		<div className="flex flex-wrap items-center gap-1">
			{visible.map((item, i) => (
				<Badge key={i} variant="secondary" className="text-xs">
					{item}
				</Badge>
			))}
			{overflow > 0 && (
				<Badge variant="secondary" className="text-xs">
					+{overflow}
				</Badge>
			)}
		</div>
	);
}

function SelectRenderer({
	value,
	meta,
}: {
	value: unknown;
	meta?: ColumnMeta;
}) {
	const str = String(value ?? "");
	if (!str) return null;

	const opt = meta?.options?.find((o) => o.value === str);
	const label = opt?.label ?? str;
	const colorClass = opt?.color ?? DEFAULT_COLORS[str] ?? "";

	return (
		<Badge
			variant="outline"
			className={cn("text-xs font-medium capitalize", colorClass)}
		>
			{label}
		</Badge>
	);
}

function BooleanRenderer({
	value,
	meta,
}: {
	value: unknown;
	meta?: ColumnMeta;
}) {
	const bool = !!value;
	const renderAs = meta?.renderAs ?? "badge";

	if (renderAs === "checkbox") {
		return (
			<div className="pointer-events-none flex items-center">
				<Checkbox checked={bool} disabled />
			</div>
		);
	}

	if (renderAs === "icon") {
		return bool ? (
			<Check className="h-4 w-4 text-emerald-500" />
		) : (
			<X className="h-4 w-4 text-muted-foreground/50" />
		);
	}

	// default: badge
	return (
		<Badge
			variant="outline"
			className={cn(
				"text-xs font-medium",
				bool
					? "border-emerald-200 bg-emerald-500/10 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
					: "border-zinc-200 bg-zinc-500/10 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
			)}
		>
			{bool ? (meta?.trueLabel ?? "Yes") : (meta?.falseLabel ?? "No")}
		</Badge>
	);
}

function CodeRenderer({ value }: { value: unknown }) {
	const str = String(value ?? "");
	return (
		<div className="flex min-w-0 items-center">
			<code className="truncate rounded bg-muted/40 px-1.5 py-0.5 font-mono text-xs">
				{str}
			</code>
			{str && <CopyButton value={str} alwaysVisible />}
		</div>
	);
}

// ---------------------------------------------------------------------------
// DataGridCell
// ---------------------------------------------------------------------------

export interface DataGridCellProps {
	cell: Cell<GridRow, unknown>;
	className?: string;
}

function DataGridCellInner({ cell, className }: DataGridCellProps) {
	const {
		table,
		mode,
		features,
		tableContainerRef,
		activeEdit,
		startEditing,
		cancelEditing,
		commitEditing,
	} = useDataGridContext();

	const { column, row } = cell;
	const meta = column.columnDef.meta as ColumnMeta | undefined;
	const value = cell.getValue();

	const isEditing =
		activeEdit?.rowId === row.id && activeEdit?.columnId === column.id;
	const isEditable = Boolean(meta?.editable && features?.editing?.enabled);

	// Ref tracks current editor value — avoids context updates on every keystroke
	const editorValueRef = useRef<unknown>(value);
	useEffect(() => {
		if (isEditing) editorValueRef.current = activeEdit?.originalValue ?? value;
	}, [isEditing, activeEdit?.originalValue, value]);

	const handleEditorChange = useCallback((v: unknown) => {
		editorValueRef.current = v;
	}, []);

	const handleEditorSave = useCallback(() => {
		void commitEditing(editorValueRef.current);
	}, [commitEditing]);

	// td ref for keyboard navigation
	const tdRef = useRef<HTMLTableCellElement>(null);

	// Keyboard navigation — pure DOM, no state
	const navigateCell = useCallback(
		(direction: "left" | "right" | "up" | "down") => {
			const td = tdRef.current;
			if (!td) return;
			const tr = td.closest("tr");
			if (!tr) return;

			if (direction === "left" || direction === "right") {
				const cells = Array.from(tr.querySelectorAll("td[tabindex]"));
				const idx = cells.indexOf(td);
				const next = cells[direction === "right" ? idx + 1 : idx - 1];
				(next as HTMLElement | undefined)?.focus();
			} else {
				const container = tableContainerRef.current;
				if (!container) return;
				const tbody = tr.closest("tbody");
				if (!tbody) return;
				const rows = Array.from(tbody.querySelectorAll("tr"));
				const rowIdx = rows.indexOf(tr);
				const nextRow = rows[direction === "down" ? rowIdx + 1 : rowIdx - 1];
				if (!nextRow) return;
				const cells = Array.from(tr.querySelectorAll("td[tabindex]"));
				const colIdx = cells.indexOf(td);
				const nextCells = Array.from(nextRow.querySelectorAll("td[tabindex]"));
				(nextCells[colIdx] as HTMLElement | undefined)?.focus();
			}
		},
		[tableContainerRef],
	);

	const handleCellKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTableCellElement>) => {
			if (e.key === "Enter" || e.key === "F2") {
				if (isEditable) {
					e.preventDefault();
					startEditing(row.id, column.id, value);
				}
				return;
			}
			if (e.key === "Delete" || e.key === "Backspace") {
				if (isEditable) {
					e.preventDefault();
					startEditing(row.id, column.id, "");
					void commitEditing("");
				}
				return;
			}
			if (e.key === "Tab") {
				e.preventDefault();
				navigateCell(e.shiftKey ? "left" : "right");
				return;
			}
			if (e.key === "ArrowRight") {
				e.preventDefault();
				navigateCell("right");
				return;
			}
			if (e.key === "ArrowLeft") {
				e.preventDefault();
				navigateCell("left");
				return;
			}
			if (e.key === "ArrowDown") {
				e.preventDefault();
				navigateCell("down");
				return;
			}
			if (e.key === "ArrowUp") {
				e.preventDefault();
				navigateCell("up");
			}
		},
		[
			isEditable,
			startEditing,
			commitEditing,
			navigateCell,
			row.id,
			column.id,
			value,
		],
	);

	// In tree mode, add depth indentation to the first non-special data column
	const isTreeMode = mode === "tree";
	const firstDataColId = isTreeMode
		? table
				.getVisibleLeafColumns()
				.find((c) => c.id !== "__expand__" && c.id !== "__select__")?.id
		: undefined;
	const isFirstDataColumn = isTreeMode && column.id === firstDataColId;
	const extraPaddingLeft = isFirstDataColumn
		? `${row.depth * 20}px`
		: undefined;

	// Pinned column sticky styles
	const isPinned = column.getIsPinned();
	const leftCols = table.getLeftLeafColumns();
	const rightCols = table.getRightLeafColumns();
	const pinnedStyle: React.CSSProperties = isPinned
		? {
				position: "sticky",
				left: isPinned === "left" ? column.getStart("left") : undefined,
				right: isPinned === "right" ? column.getAfter("right") : undefined,
				zIndex: 1,
			}
		: {};
	const shadowClass = getPinnedShadowClass(column, leftCols, rightCols);

	const cellStyle: React.CSSProperties = {
		...pinnedStyle,
		...(extraPaddingLeft ? { paddingLeft: extraPaddingLeft } : {}),
	};

	const baseCellClasses = cn(
		"border-r border-border/30 last:border-r-0",
		"border-b border-border/50",
		"text-[length:var(--font-size)]",
		"transition-colors duration-100",
		"group-hover/row:bg-muted/30",
		isPinned && "bg-background",
		shadowClass,
		className,
	);

	// ---- Editing mode ----
	if (isEditing) {
		const EditorComponent = meta?.renderEditor ? null : getEditor(meta?.type);

		return (
			<TableCell
				style={cellStyle}
				className={cn(
					baseCellClasses,
					"p-0 ring-2 ring-primary/60 ring-inset",
					// Override group-hover bg when editing
					"bg-background! group-hover/row:bg-background!",
				)}
			>
				{meta?.renderEditor ? (
					// eslint-disable-next-line react-hooks/refs
					meta.renderEditor({
						value,
						onChange: handleEditorChange,
						onSave: handleEditorSave,
						onCancel: cancelEditing,
						row: row.original,
						columnId: column.id,
						meta: meta,
					})
				) : EditorComponent ? (
					<EditorComponent
						value={value}
						onChange={handleEditorChange}
						onSave={handleEditorSave}
						onCancel={cancelEditing}
						row={row.original}
						columnId={column.id}
						meta={meta!}
					/>
				) : null}
			</TableCell>
		);
	}

	// ---- Normal render ----

	// 1. Custom render function takes priority
	if (typeof meta?.render === "function") {
		const rendered = (
			meta.render as (value: unknown, row: GridRow) => React.ReactNode
		)(value, row.original);
		return (
			<TableCell
				ref={tdRef}
				tabIndex={-1}
				style={cellStyle}
				className={cn(
					baseCellClasses,
					"px-(--cell-px) py-(--cell-py)",
					isEditable && "cursor-text",
					"focus:ring-1 focus:ring-primary/40 focus:outline-none focus:ring-inset",
				)}
				onDoubleClick={() => {
					if (isEditable) startEditing(row.id, column.id, value);
				}}
				onKeyDown={handleCellKeyDown}
			>
				{rendered}
			</TableCell>
		);
	}

	// 2. Type-based rendering
	if (column.columnDef.cell) {
		return (
			<TableCell
				ref={tdRef}
				tabIndex={-1}
				style={cellStyle}
				className={cn(
					baseCellClasses,
					"px-(--cell-px) py-(--cell-py)",
					isEditable && "cursor-text",
					"focus:ring-1 focus:ring-primary/40 focus:outline-none focus:ring-inset",
				)}
				onDoubleClick={() => {
					if (isEditable) startEditing(row.id, column.id, value);
				}}
				onKeyDown={handleCellKeyDown}
			>
				{flexRender(column.columnDef.cell, cell.getContext())}
			</TableCell>
		);
	}

	const type = meta?.type;

	let content: React.ReactNode;
	let isDateCell = false;

	switch (type) {
		case "string":
			content = <StringRenderer value={value} meta={meta} />;
			break;

		case "number":
			content = <NumberRenderer value={value} meta={meta} />;
			break;

		case "date":
			isDateCell = true;
			content = <DateRenderer value={value} meta={meta} />;
			break;

		case "multi-value":
			content = <MultiValueRenderer value={value} meta={meta} />;
			break;

		case "select":
			content = <SelectRenderer value={value} meta={meta} />;
			break;

		case "boolean":
			content = <BooleanRenderer value={value} meta={meta} />;
			break;

		case "code":
			content = <CodeRenderer value={value} />;
			break;

		default:
			content = <span>{String(value ?? "")}</span>;
			break;
	}

	return (
		<TableCell
			ref={tdRef}
			tabIndex={-1}
			style={cellStyle}
			className={cn(
				baseCellClasses,
				"px-(--cell-px) py-(--cell-py)",
				type === "number" && "text-right",
				isDateCell && "bg-orange-500/5",
				isEditable && "cursor-text",
				"focus:ring-1 focus:ring-primary/40 focus:outline-none focus:ring-inset",
			)}
			onDoubleClick={() => {
				if (isEditable) startEditing(row.id, column.id, value);
			}}
			onKeyDown={handleCellKeyDown}
		>
			{content}
		</TableCell>
	);
}

export const DataGridCell = memo(DataGridCellInner, (prev, next) => {
	if (
		prev.cell.column.id === "__select__" ||
		next.cell.column.id === "__select__"
	) {
		return false;
	}

	return (
		prev.cell.getValue() === next.cell.getValue() &&
		prev.className === next.className
	);
});
