import type { ColumnType } from "@/components/data-grid/types/column-types";
import type { EditorProps } from "@/components/data-grid/types/editor-types";
import { TextEditor } from "./text-editor";
import { NumberEditor } from "./number-editor";
import { DateEditor } from "./date-editor";
import { ChipEditor } from "./chip-editor";
import { SelectEditor } from "./select-editor";
import { BooleanEditor } from "./boolean-editor";
import { CodeEditor } from "./code-editor";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getEditor(
	type: ColumnType | undefined,
): React.ComponentType<EditorProps<any>> {
	switch (type) {
		case "number":
			return NumberEditor;
		case "date":
			return DateEditor;
		case "multi-value":
			return ChipEditor;
		case "select":
			return SelectEditor;
		case "boolean":
			return BooleanEditor;
		case "code":
			return CodeEditor;
		default:
			return TextEditor;
	}
}
