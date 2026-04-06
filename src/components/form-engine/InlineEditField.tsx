// src/components/form-engine/InlineEditField.tsx

import { Field, FieldError, FieldTitle } from "@/components/ui/field";
import { Loader2, Pencil } from "lucide-react";
import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react";
import { useController, type Control, type FieldValues } from "react-hook-form";
import { toast } from "sonner";
import { resolveField } from "./field-registry";
import { useFormEngineContext } from "./FormEngineProvider";
import { useFieldMutation } from "./hooks/use-field-mutation";
import type {
	FieldApiBinding,
	FieldRenderer,
	FieldType,
	FormFieldDescriptor,
} from "./types";

type EditState = "idle" | "editing" | "saving";

interface InlineEditFieldProps {
	descriptor: FormFieldDescriptor;
	control: Control<FieldValues>;
	fieldRegistry: Map<FieldType, FieldRenderer>;
	params?: Record<string, string>;
}

export function InlineEditField({
	descriptor,
	control,
	fieldRegistry,
	params = {},
}: InlineEditFieldProps) {
	const {
		name,
		label,
		readOnly = false,
		editTrigger = "click",
		saveStrategy = "onBlur",
		apiBinding,
	} = descriptor;

	const { editMode, rawData = {} } = useFormEngineContext();

	const extraBody = useMemo(() => {
		const extras: Record<string, unknown> = {};
		for (const key of apiBinding?.staticBodyFields ?? []) {
			if (rawData[key] !== undefined) extras[key] = rawData[key];
		}
		return extras;
	}, [apiBinding?.staticBodyFields, rawData]);

	const [editState, setEditState] = useState<EditState>(
		editTrigger === "always" && !readOnly ? "editing" : "idle",
	);
	const previousValueRef = useRef<unknown>(undefined);
	const containerRef = useRef<HTMLDivElement>(null);

	// Sync field edit state with global edit mode.
	// Fields with editTrigger "always" ignore global mode — they're always editing.
	// readOnly fields are never affected.
	useEffect(() => {
		if (readOnly || editTrigger === "always") return;
		if (editMode) {
			previousValueRef.current = field.value;
			setEditState("editing");
		} else {
			setEditState((current) => (current === "saving" ? current : "idle"));
		}
	}, [editMode, readOnly, editTrigger]);

	const { field, fieldState } = useController({ name, control });

	// Always call hook unconditionally (Rules of Hooks)
	const dummyBinding: FieldApiBinding = { url: "", method: "PATCH" };
	const mutationHook = useFieldMutation({
		apiBinding: apiBinding ?? dummyBinding,
		params,
		debounceMs: 300,
		extraBody,
	});
	const hasMutation = !!apiBinding;

	const renderer =
		fieldRegistry.get(descriptor.type) ?? resolveField(descriptor.type);

	// ─── Enter edit mode ───────────────────────────────────────────────────────
	const startEditing = useCallback(() => {
		if (readOnly || editState !== "idle") return;
		previousValueRef.current = field.value;
		setEditState("editing");
	}, [readOnly, editState, field.value]);

	// ─── Cancel edit ───────────────────────────────────────────────────────────
	const cancelEdit = useCallback(() => {
		mutationHook.cancel();
		field.onChange(previousValueRef.current);
		setEditState(editTrigger === "always" && !readOnly ? "editing" : "idle");
	}, [mutationHook, field, editTrigger, readOnly]);

	// ─── Save field ────────────────────────────────────────────────────────────
	const saveField = useCallback(async () => {
		if (!hasMutation) {
			setEditState(editTrigger === "always" ? "editing" : "idle");
			return;
		}

		// Skip if value hasn't changed
		if (field.value === previousValueRef.current) {
			setEditState(editTrigger === "always" ? "editing" : "idle");
			return;
		}

		setEditState("saving");
		try {
			await mutationHook.saveAsync(name, field.value);
			toast.success(`${label} updated`);
			setEditState(editTrigger === "always" ? "editing" : "idle");
		} catch {
			toast.error(`Failed to update ${label}`);
			field.onChange(previousValueRef.current);
			setEditState("editing");
		}
	}, [hasMutation, mutationHook, field, name, label, editTrigger]);

	// ─── Keyboard handling ─────────────────────────────────────────────────────
	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				e.preventDefault();
				cancelEdit();
			}
			if (e.key === "Enter" && saveStrategy === "onEnter") {
				e.preventDefault();
				saveField();
			}
		},
		[cancelEdit, saveField, saveStrategy],
	);

	const handleIdleKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				startEditing();
			}
		},
		[startEditing],
	);

	// ─── Blur handling ─────────────────────────────────────────────────────────
	const handleBlur = useCallback(
		(e: React.FocusEvent) => {
			// Ignore if focus moved to a child element (e.g. dropdown)
			if (containerRef.current?.contains(e.relatedTarget as Node)) return;
			if (saveStrategy === "onBlur" && editState === "editing") {
				saveField();
			}
		},
		[saveStrategy, editState, saveField],
	);

	// ─── Render ────────────────────────────────────────────────────────────────
	const isEditing = editState === "editing" || editState === "saving";

	if (!renderer) {
		return (
			<div className="text-xs text-destructive">
				Unknown field type: {descriptor.type}
			</div>
		);
	}

	const fieldContent: ReactNode = renderer({
		descriptor,
		control,
		isEditing,
		onSave: saveField,
		onCancel: cancelEdit,
	});

	return (
		<Field orientation="vertical" className={descriptor.className}>
			<FieldTitle>
				<span className="font-semibold text-muted-foreground">{label}</span>
				{editTrigger === "icon" && !readOnly && editState === "idle" && (
					<button
						type="button"
						aria-label={`Edit ${label}`}
						onClick={startEditing}
						className="ml-1 opacity-0 group-hover/field:opacity-100 transition-opacity"
					>
						<Pencil className="size-3 text-muted-foreground" />
					</button>
				)}
				{editState === "saving" && (
					<Loader2
						aria-label="Saving"
						className="ml-1 size-3 animate-spin text-muted-foreground"
					/>
				)}
			</FieldTitle>

			<div
				ref={containerRef}
				role={
					editTrigger === "click" && editState === "idle" && !readOnly
						? "button"
						: undefined
				}
				tabIndex={
					editTrigger === "click" && editState === "idle" && !readOnly
						? 0
						: undefined
				}
				onKeyDown={
					editState !== "idle"
						? handleKeyDown
						: editTrigger === "click" && !readOnly
							? handleIdleKeyDown
							: undefined
				}
				onBlur={editState === "editing" ? handleBlur : undefined}
				onClick={
					editTrigger === "click" && editState === "idle"
						? startEditing
						: undefined
				}
				className={
					editTrigger === "click" && editState === "idle" && !readOnly
						? "cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 transition-colors"
						: undefined
				}
			>
				{editState === "saving" ? (
					<div className="relative">
						<div className="opacity-50 pointer-events-none">{fieldContent}</div>
					</div>
				) : (
					fieldContent
				)}
			</div>

			{fieldState.error && <FieldError>{fieldState.error.message}</FieldError>}

			{saveStrategy === "explicit" && editState === "editing" && (
				<div className="flex gap-1 mt-1">
					<button
						type="button"
						onClick={saveField}
						className="text-xs text-primary hover:underline"
					>
						Save
					</button>
					<button
						type="button"
						onClick={cancelEdit}
						className="text-xs text-muted-foreground hover:underline"
					>
						Cancel
					</button>
				</div>
			)}
		</Field>
	);
}
