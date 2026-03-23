import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { EditorProps } from "@/components/data-grid/types/editor-types";
import type React from "react";
import { useEffect, useRef, useState } from "react";

export function CodeEditor({
	value,
	onChange,
	onSave,
	onCancel,
	meta,
}: EditorProps<string>) {
	const ref = useRef<HTMLTextAreaElement>(null);
	const [localValue, setLocalValue] = useState(String(value ?? ""));

	useEffect(() => {
		const el = ref.current;
		if (!el) return;
		el.focus();
		el.setSelectionRange(el.value.length, el.value.length);
		// Auto-size height
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
	}, []);

	const autoResize = () => {
		const el = ref.current;
		if (!el) return;
		el.style.height = "auto";
		el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
			e.preventDefault();
			onChange(localValue);
			onSave();
		}
		if (e.key === "Escape") {
			e.preventDefault();
			onCancel();
		}
		if (e.key === "Tab") {
			e.preventDefault();
			const el = e.currentTarget;
			const start = el.selectionStart;
			const end = el.selectionEnd;
			const next =
				localValue.substring(0, start) + "  " + localValue.substring(end);
			setLocalValue(next);
			requestAnimationFrame(() => {
				el.selectionStart = start + 2;
				el.selectionEnd = start + 2;
			});
		}
	};

	const handleBlur = () => {
		if (meta?.saveOnBlur !== false) {
			onChange(localValue);
			onSave();
		}
	};

	return (
		<Textarea
			ref={ref}
			value={localValue}
			onChange={(e) => {
				setLocalValue(e.target.value);
				autoResize();
			}}
			onKeyDown={handleKeyDown}
			onBlur={handleBlur}
			rows={1}
			className={cn(
				"w-full px-(--cell-px) py-(--cell-py)",
				"resize-none overflow-y-auto bg-transparent outline-none",
				"font-mono text-xs",
				"leading-snug",
				"field-sizing-manual min-h-0 rounded-none border-0 shadow-none focus-visible:border-transparent focus-visible:ring-0",
			)}
			style={{ maxHeight: 80 }}
		/>
	);
}
