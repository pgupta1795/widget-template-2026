# Form Engine — Global Edit Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pencil icon to the PropertiesPanel header that activates a global edit mode for all form fields, with Save (Check) and Cancel (X) icons to commit or discard changes.

**Architecture:** `PropertiesPanel` owns `isEditMode` state and the edit toolbar (Pencil/Check/X). It holds a `ref` to `FormEngine` (via `forwardRef` + `useImperativeHandle`) to trigger `saveAll`/`cancelAll` imperatively. `editMode` flows into `FormEngineContext` so `InlineEditField` can enter/exit editing state reactively.

**Tech Stack:** React 19, react-hook-form, TanStack Query, lucide-react, sonner (toasts), Tailwind CSS, Biome (lint/format)

---

## File Map

| File | Change |
|------|--------|
| `src/components/form-engine/types.ts` | Add `editMode?` to `FormEngineContextValue` |
| `src/components/form-engine/FormEngine.tsx` | `forwardRef`, `FormEngineHandle`, `editMode` prop, `handleSaveAll`, `handleCancelAll`, `useImperativeHandle` |
| `src/components/form-engine/InlineEditField.tsx` | Read `editMode` from context; `useEffect` to sync edit state |
| `src/components/form-engine/index.ts` | Export `FormEngineHandle` type |
| `src/components/object-detail/types.ts` | Add `editable?` to `propertiesPanel` config shape |
| `src/components/object-detail/PropertiesPanel.tsx` | `editable` prop, `isEditMode` state, `formRef`, pencil/check/X toolbar |
| `src/components/object-detail/ObjectDetailView.tsx` | Forward `propertiesPanel.editable` to `PropertiesPanel` |
| `src/features/change/configs/change-action-detail.config.ts` | Add `editable: true` to `propertiesPanel` |

---

## Task 1: Add `editMode` to FormEngineContextValue and `editable` to ObjectDetailConfig

**Files:**
- Modify: `src/components/form-engine/types.ts`
- Modify: `src/components/object-detail/types.ts`

- [ ] **Step 1: Update `FormEngineContextValue` in `src/components/form-engine/types.ts`**

Find this block:
```ts
export interface FormEngineContextValue {
	adapter: FormApiAdapter;
	hooks?: FormEngineHooks;
	fieldRegistry: Map<FieldType, FieldRenderer>;
	schema: FormSchema;
	form: UseFormReturn<FieldValues>;
	params?: Record<string, string>;
}
```
Replace with:
```ts
export interface FormEngineContextValue {
	adapter: FormApiAdapter;
	hooks?: FormEngineHooks;
	fieldRegistry: Map<FieldType, FieldRenderer>;
	schema: FormSchema;
	form: UseFormReturn<FieldValues>;
	params?: Record<string, string>;
	editMode?: boolean;
}
```

- [ ] **Step 2: Add `editable` to `ObjectDetailConfig.propertiesPanel` in `src/components/object-detail/types.ts`**

Find:
```ts
	propertiesPanel: {
		form: FormSchema;
		defaultOpen?: boolean;
		defaultSize?: number; // % width, default 25
		minSize?: number; // % width, default 15
	};
```
Replace with:
```ts
	propertiesPanel: {
		form: FormSchema;
		defaultOpen?: boolean;
		defaultSize?: number; // % width, default 25
		minSize?: number; // % width, default 15
		editable?: boolean;
	};
```

- [ ] **Step 3: Verify TypeScript is happy**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && npx tsc --noEmit 2>&1 | head -30
```
Expected: zero new errors (pre-existing errors in `openApiParser.ts` and `main.tsx` are fine to ignore).

- [ ] **Step 4: Commit**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && git add src/components/form-engine/types.ts src/components/object-detail/types.ts && git commit -m "feat(form-engine): add editMode to context and editable to ObjectDetailConfig"
```

---

## Task 2: Update FormEngine with `forwardRef`, `FormEngineHandle`, and save/cancel logic

**Files:**
- Modify: `src/components/form-engine/FormEngine.tsx`

- [ ] **Step 1: Replace the entire contents of `src/components/form-engine/FormEngine.tsx`**

```tsx
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

		const contextValue = useMemo(
			() => ({ adapter, hooks, fieldRegistry, schema, form, params, editMode }),
			[adapter, hooks, fieldRegistry, schema, form, params, editMode],
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
					return adapter.updateField({
						method: f.apiBinding!.method,
						url: resolvedUrl,
						body,
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
				toast.error(`${failed.length} of ${fieldsToSave.length} field(s) failed to save`);
				// Stay in edit mode so user can retry
			}
		}, [form, schema.fields, params, adapter, onSaveAll]);

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
```

- [ ] **Step 2: Run check**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && npx tsc --noEmit 2>&1 | head -30
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && git add src/components/form-engine/FormEngine.tsx && git commit -m "feat(form-engine): add forwardRef, FormEngineHandle, and saveAll/cancelAll logic"
```

---

## Task 3: Update InlineEditField to sync with global editMode

**Files:**
- Modify: `src/components/form-engine/InlineEditField.tsx`

- [ ] **Step 1: Add `useEffect` import and `useFormEngineContext` import**

Find this import line at the top of `InlineEditField.tsx`:
```ts
import { useCallback, useRef, useState, type ReactNode } from "react";
```
Replace with:
```ts
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
```

Find:
```ts
import { resolveField } from "./field-registry";
import { useFieldMutation } from "./hooks/use-field-mutation";
```
Replace with:
```ts
import { resolveField } from "./field-registry";
import { useFormEngineContext } from "./FormEngineProvider";
import { useFieldMutation } from "./hooks/use-field-mutation";
```

- [ ] **Step 2: Read `editMode` from context and add the sync effect**

In the component body, immediately after the destructure of `descriptor` (the block starting with `const { name, label, readOnly...}`), add:

```ts
	const { editMode } = useFormEngineContext();
```

Then, after the `containerRef` declaration (`const containerRef = useRef...`), add this effect:

```ts
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
		// biome-ignore lint/correctness/useExhaustiveDependencies: intentionally reacts only to editMode toggle; field.value captured into ref at that moment
	}, [editMode, readOnly, editTrigger]);
```

- [ ] **Step 3: Run lint and typecheck**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && npx biome check src/components/form-engine/InlineEditField.tsx 2>&1
```
Expected: no errors (the biome-ignore comment suppresses the exhaustive-deps warning).

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && git add src/components/form-engine/InlineEditField.tsx && git commit -m "feat(form-engine): sync InlineEditField with global editMode from context"
```

---

## Task 4: Export `FormEngineHandle` from the form-engine package

**Files:**
- Modify: `src/components/form-engine/index.ts`

- [ ] **Step 1: Add `FormEngineHandle` to the type exports**

Find this line in `src/components/form-engine/index.ts`:
```ts
export { FormEngine } from "./FormEngine";
```
Replace with:
```ts
export { FormEngine } from "./FormEngine";
export type { FormEngineHandle } from "./FormEngine";
```

- [ ] **Step 2: Commit**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && git add src/components/form-engine/index.ts && git commit -m "feat(form-engine): export FormEngineHandle type"
```

---

## Task 5: Update PropertiesPanel with edit toolbar

**Files:**
- Modify: `src/components/object-detail/PropertiesPanel.tsx`

- [ ] **Step 1: Replace entire contents of `src/components/object-detail/PropertiesPanel.tsx`**

```tsx
import { FormEngine } from "@/components/form-engine";
import type { FormEngineHandle } from "@/components/form-engine";
import { wafdataFormAdapter } from "@/components/form-engine/adapters/wafdata-form-adapter";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import type { FormApiAdapter, FormSchema } from "@/components/form-engine";
import { Check, Pencil, X, icons, type LucideIcon } from "lucide-react";
import { useRef, useState } from "react";

interface PropertiesPanelProps {
	title: string;
	subtitle?: string;
	icon?: string;
	form: FormSchema;
	adapter?: FormApiAdapter;
	params?: Record<string, string>;
	className?: string;
	editable?: boolean;
}

function getIcon(name?: string): LucideIcon | null {
	if (!name) return null;
	return (icons as Record<string, LucideIcon>)[name] ?? null;
}

export function PropertiesPanel({
	title,
	subtitle,
	icon,
	form,
	adapter = wafdataFormAdapter,
	params,
	className,
	editable = false,
}: PropertiesPanelProps) {
	const IconComponent = getIcon(icon);
	const [isEditMode, setIsEditMode] = useState(false);
	const formRef = useRef<FormEngineHandle>(null);

	return (
		<div
			className={cn(
				"flex h-full flex-col overflow-hidden border-l border-border/60 bg-muted/20 backdrop-blur-sm",
				className,
			)}
		>
			{/* Panel header */}
			<div
				className={cn(
					"flex items-center gap-3 border-b bg-card px-4 py-3 transition-colors",
					isEditMode && "border-t-2 border-t-primary",
				)}
			>
				{IconComponent && (
					<div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/15 ring-1 ring-primary/20">
						<IconComponent className="size-4 text-primary" />
					</div>
				)}
				<div className="min-w-0 flex-1">
					<div className="text-sm font-bold truncate">{title}</div>
					{subtitle && (
						<div className="text-xs text-muted-foreground truncate">
							{subtitle}
						</div>
					)}
				</div>

				{editable && (
					<div className="flex shrink-0 items-center gap-1">
						{isEditMode ? (
							<>
								<button
									type="button"
									aria-label="Save all changes"
									onClick={() => formRef.current?.saveAll()}
									className="flex size-6 items-center justify-center rounded text-primary transition-colors hover:bg-primary/10"
								>
									<Check className="size-3.5" />
								</button>
								<button
									type="button"
									aria-label="Cancel editing"
									onClick={() => formRef.current?.cancelAll()}
									className="flex size-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted"
								>
									<X className="size-3.5" />
								</button>
							</>
						) : (
							<button
								type="button"
								aria-label="Edit properties"
								onClick={() => setIsEditMode(true)}
								className="flex size-6 items-center justify-center rounded text-muted-foreground opacity-60 transition-all hover:bg-muted hover:opacity-100"
							>
								<Pencil className="size-3.5" />
							</button>
						)}
					</div>
				)}
			</div>

			<Separator />

			{/* Form content */}
			<FormEngine
				ref={formRef}
				schema={form}
				adapter={adapter}
				params={params}
				editMode={isEditMode}
				onSaveAll={() => setIsEditMode(false)}
				onCancelAll={() => setIsEditMode(false)}
				className="flex-1"
			/>
		</div>
	);
}
```

- [ ] **Step 2: Run lint and typecheck**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && npx biome check src/components/object-detail/PropertiesPanel.tsx 2>&1
```
Expected: no errors.

```bash
npx tsc --noEmit 2>&1 | head -30
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && git add src/components/object-detail/PropertiesPanel.tsx && git commit -m "feat(object-detail): add editable prop and pencil/save/cancel toolbar to PropertiesPanel"
```

---

## Task 6: Forward `editable` through ObjectDetailView

**Files:**
- Modify: `src/components/object-detail/ObjectDetailView.tsx`

- [ ] **Step 1: Pass `editable` from config to PropertiesPanel**

Find this block in `ObjectDetailView.tsx`:
```tsx
					<PropertiesPanel
						title={title}
						icon={config.icon}
						form={propertiesPanel.form}
						params={params}
					/>
```
Replace with:
```tsx
					<PropertiesPanel
						title={title}
						icon={config.icon}
						form={propertiesPanel.form}
						params={params}
						editable={propertiesPanel.editable}
					/>
```

- [ ] **Step 2: Typecheck**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && npx tsc --noEmit 2>&1 | head -30
```
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && git add src/components/object-detail/ObjectDetailView.tsx && git commit -m "feat(object-detail): forward editable config to PropertiesPanel"
```

---

## Task 7: Enable edit mode in the Change Action detail config

**Files:**
- Modify: `src/features/change/configs/change-action-detail.config.ts`

- [ ] **Step 1: Add `editable: true` to the propertiesPanel config**

Find:
```ts
	propertiesPanel: {
		form: propertiesForm,
		defaultOpen: true,
		defaultSize: 25,
		minSize: 15,
	},
```
Replace with:
```ts
	propertiesPanel: {
		form: propertiesForm,
		defaultOpen: true,
		defaultSize: 25,
		minSize: 15,
		editable: true,
	},
```

- [ ] **Step 2: Commit**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && git add src/features/change/configs/change-action-detail.config.ts && git commit -m "feat(change): enable editable properties panel for Change Action detail"
```

---

## Task 8: Final verification

- [ ] **Step 1: Run Biome check across all changed files**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && npx biome check src/components/form-engine/FormEngine.tsx src/components/form-engine/InlineEditField.tsx src/components/form-engine/types.ts src/components/object-detail/PropertiesPanel.tsx src/components/object-detail/ObjectDetailView.tsx src/components/object-detail/types.ts src/features/change/configs/change-action-detail.config.ts 2>&1
```
Expected: no errors. If formatting issues appear, run:
```bash
npx biome check --write src/components/form-engine/FormEngine.tsx src/components/form-engine/InlineEditField.tsx src/components/object-detail/PropertiesPanel.tsx
```

- [ ] **Step 2: Full typecheck**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && npx tsc --noEmit 2>&1 | grep -v "openApiParser\|main.tsx"
```
Expected: no output (zero new errors; pre-existing errors in `openApiParser.ts` and `main.tsx` are ignored).

- [ ] **Step 3: Build**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && npm run build 2>&1 | tail -20
```
Expected: build completes successfully with no errors.

- [ ] **Step 4: Final commit if any formatting fixes were applied**

```bash
cd "C:/UK VM/Issues/widgets/templates/tanstack-start-widget-template" && git add -p && git commit -m "fix(form-engine): apply Biome formatting"
```
(Only run this step if Step 1 produced auto-fixes.)
