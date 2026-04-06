import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import { useEffect, useState } from "react";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

function normalizeOptions(
	options?: string[] | { label: string; value: string }[],
): { label: string; value: string }[] {
	if (!options) return [];
	return options.map((o) =>
		typeof o === "string" ? { label: o, value: o } : o,
	);
}

export function ComboboxField({
	descriptor,
	control,
	isEditing,
}: FieldRendererProps) {
	const { field } = useController({
		name: descriptor.name,
		control,
	});

	const opts = normalizeOptions(descriptor.options);
	const [inputValue, setInputValue] = useState("");

	useEffect(() => {
		if (!isEditing) setInputValue("");
	}, [isEditing]);

	if (!isEditing) {
		const selected = opts.find((o) => o.value === field.value);
		return (
			<span className="text-sm text-foreground">
				{selected?.label ?? field.value ?? "—"}
			</span>
		);
	}

	const filtered = opts.filter((o) =>
		o.label.toLowerCase().includes(inputValue.toLowerCase()),
	);

	return (
		<Combobox value={field.value ?? ""} onValueChange={field.onChange}>
			<ComboboxInput
				placeholder={descriptor.placeholder ?? "Search..."}
				value={inputValue}
				onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
					setInputValue(e.target.value)
				}
				disabled={descriptor.readOnly}
			/>
			<ComboboxContent>
				<ComboboxList>
					<ComboboxEmpty>No results found</ComboboxEmpty>
					{filtered.map((opt) => (
						<ComboboxItem key={opt.value} value={opt.value}>
							{opt.label}
						</ComboboxItem>
					))}
				</ComboboxList>
			</ComboboxContent>
		</Combobox>
	);
}
