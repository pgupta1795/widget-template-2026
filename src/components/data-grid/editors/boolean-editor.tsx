import { useRef, useEffect } from "react";
import type { EditorProps } from "@/components/data-grid/types/editor-types";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export function BooleanEditor({
	value,
	onChange,
	onSave,
	onCancel,
}: EditorProps<boolean>) {
	const containerRef = useRef<HTMLDivElement>(null);
	const checked = Boolean(value);

	useEffect(() => {
		containerRef.current?.focus();

		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onCancel();
			}
		};
		document.addEventListener("keydown", handler);
		return () => document.removeEventListener("keydown", handler);
	}, [onCancel]);

	// Save on click outside
	useEffect(() => {
		const handler = (e: MouseEvent) => {
			if (
				containerRef.current &&
				!containerRef.current.contains(e.target as Node)
			) {
				onChange(checked);
				onSave();
			}
		};
		document.addEventListener("mousedown", handler);
		return () => document.removeEventListener("mousedown", handler);
	}, [checked, onChange, onSave]);

	const handleCheckedChange = (next: boolean) => {
		onChange(next);
		onSave();
	};

	return (
		<div
			ref={containerRef}
			tabIndex={-1}
			className={cn(
				"flex items-center justify-center w-full h-full",
				"outline-none",
			)}
		>
			<Switch checked={checked} onCheckedChange={handleCheckedChange} />
		</div>
	);
}
