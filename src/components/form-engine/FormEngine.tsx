// src/components/form-engine/FormEngine.tsx

import { zodResolver } from "@hookform/resolvers/zod";
import { forwardRef, useCallback, useImperativeHandle, useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { toast } from "sonner";
import { getFieldRegistry } from "./field-registry";
import { registerBuiltinFields } from "./fields";
import { FormEngineProvider } from "./FormEngineProvider";
import { useFormData } from "./hooks/use-form-data";
import { InlineEditField } from "./InlineEditField";
import type { FormApiAdapter, FormEngineHooks, FormSchema } from "./types";
import { buildFormSchema } from "./validation-builder";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";

// Ensure built-in fields are registered
registerBuiltinFields();

export interface FormEngineHandle {
	saveAll: () => Promise<void>;
	cancelAll: () => void;
}

interface FormEngineProps {
	schema: FormSchema;
	adapter: FormApiAdapter;
	params?: Record<string, string>;
	hooks?: FormEngineHooks;
	className?: string;
	editMode?: boolean;
	onSaveAll?: () => void;
	onCancelAll?: () => void;
}

export const FormEngine = forwardRef<FormEngineHandle, FormEngineProps>(
	function FormEngine(
		{
			schema,
			adapter,
			params = {},
			hooks,
			className,
			editMode,
			onSaveAll,
			onCancelAll,
		},
		ref,
	) {
		// Fetch initial data
		const { data, isLoading, isError } = useFormData(schema.fetch, params);

		// Build Zod validation schema from field descriptors
		const zodSchema = useMemo(
			() => buildFormSchema(schema.fields),
			[schema.fields],
		);

		// Build default values from fetched data
		const defaultValues = useMemo(() => {
			const fetched = data?.data ?? {};
			const defaults: Record<string, unknown> = {};
			for (const field of schema.fields) {
				defaults[field.name] =
					fetched[field.name] ?? field.defaultValue ?? undefined;
			}
			return defaults;
		}, [data, schema.fields]);

		// Create react-hook-form instance
		const form = useForm({
			resolver: zodResolver(zodSchema),
			defaultValues,
			values: defaultValues,
			mode: "onChange",
		});

		const fieldRegistry = getFieldRegistry();

		const rawData = useMemo(
			() => (data?.data ?? {}) as Record<string, unknown>,
			[data],
		);

		const contextValue = useMemo(
			() => ({ adapter, hooks, fieldRegistry, schema, form, params, editMode, rawData }),
			[adapter, hooks, fieldRegistry, schema, form, params, editMode, rawData],
		);

		// ─── Save all dirty fields ───────────────────────────────────────────────
		const handleSaveAll = useCallback(async () => {
			const dirtyFieldNames = Object.keys(form.formState.dirtyFields);

			const fieldsToSave = schema.fields.filter(
				(f) => dirtyFieldNames.includes(f.name) && f.apiBinding && !f.readOnly,
			);

			if (fieldsToSave.length === 0) {
				onSaveAll?.();
				return;
			}

			const results = await Promise.allSettled(
				fieldsToSave.map((f) => {
					const resolvedUrl = f.apiBinding!.url.replace(
						/:(\w+)/g,
						(_, key: string) => params[key] ?? `:${key}`,
					);
					const value = form.getValues(f.name);
					const body = f.apiBinding!.bodyKey
						? { [f.apiBinding!.bodyKey]: value }
						: { [f.name]: value };
					const staticExtras: Record<string, unknown> = {};
					for (const key of f.apiBinding!.staticBodyFields ?? []) {
						if (rawData[key] !== undefined) staticExtras[key] = rawData[key];
					}
					return adapter.updateField({
						method: f.apiBinding!.method,
						url: resolvedUrl,
						body: { ...staticExtras, ...body },
						headers: f.apiBinding!.headers,
					});
				}),
			);

			const failed = results.filter((r) => r.status === "rejected");

			if (failed.length === 0) {
				toast.success("Changes saved");
				form.reset(form.getValues());
				onSaveAll?.();
			} else {
				toast.error(
					`${failed.length} of ${fieldsToSave.length} field(s) failed to save`,
				);
				// Stay in edit mode so user can retry
			}
		}, [form, schema.fields, params, adapter, onSaveAll, rawData]);

		// ─── Cancel: reset all fields to last-fetched values ────────────────────
		const handleCancelAll = useCallback(() => {
			form.reset();
			onCancelAll?.();
		}, [form, onCancelAll]);

		// ─── Expose save/cancel to PropertiesPanel via ref ──────────────────────
		useImperativeHandle(
			ref,
			() => ({ saveAll: handleSaveAll, cancelAll: handleCancelAll }),
			[handleSaveAll, handleCancelAll],
		);

		if (isLoading) {
			return (
				<div className="flex flex-col gap-4 p-4">
					{schema.fields.slice(0, 6).map((f) => (
						<div key={f.name} className="flex flex-col gap-1">
							<Skeleton className="h-3 w-20" />
							<Skeleton className="h-7 w-full" />
						</div>
					))}
				</div>
			);
		}

		if (isError) {
			return (
				<div className="p-4 text-sm text-destructive">
					Failed to load form data.
				</div>
			);
		}

		return (
			<FormEngineProvider value={contextValue}>
				<FormProvider {...form}>
					<ScrollArea className={className}>
						<div className="flex flex-col gap-3 p-4">
							{schema.fields.map((descriptor) => (
								<InlineEditField
									key={descriptor.name}
									descriptor={descriptor}
									control={form.control}
									fieldRegistry={fieldRegistry}
									params={params}
								/>
							))}
						</div>
					</ScrollArea>
				</FormProvider>
			</FormEngineProvider>
		);
	},
);
