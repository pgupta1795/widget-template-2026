import type { GridRow } from "./grid-types";
import type { ColumnMeta } from "./column-types";

export interface EditorProps<T = unknown> {
	value: T;
	onChange: (value: T) => void;
	onSave: () => void;
	onCancel: () => void;
	row: GridRow;
	columnId: string;
	meta: ColumnMeta;
}
