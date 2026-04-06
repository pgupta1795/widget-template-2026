# Form Engine + Object Detail View — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a JSON-driven Form Engine with inline editing and per-field API mutations, then use it alongside the existing Table Engine in an Object Detail View for 3DEXPERIENCE Change Actions.

**Architecture:** JSON schema defines form fields -> `schemaResolver` converts to a json-render element tree -> `defineCatalog()` + `defineRegistry()` map field types to React components -> each field uses `react-hook-form` `useController()` for state/validation -> `InlineEditField` wrapper handles read/edit mode transitions and fires `useWafMutation` for per-field API saves. The Object Detail View composes a HeaderBar, resizable PropertiesPanel (FormEngine), and tabbed tables (existing ConfiguredTable).

**Tech Stack:** React 19, TypeScript 5, react-hook-form 7 + @hookform/resolvers + Zod 4, @json-render/core + @json-render/react + @json-render/shadcn 0.16, TanStack Query v5, shadcn/ui (base-ui), react-resizable-panels, sonner, lucide-react, Tailwind CSS v4

**Spec:** `docs/plans/2026-03-30-form-engine-design.md`

---

## File Structure

```
src/components/
  form-engine/
    index.ts                         # public barrel
    types.ts                         # all form engine types
    validation-builder.ts            # field validations[] -> Zod schema
    schema-resolver.ts               # FormSchema -> json-render element tree
    form-catalog.ts                  # defineCatalog() with form field defs
    form-registry.ts                 # defineRegistry() mapping to React components
    field-registry.ts                # Map<FieldType, FieldRenderer> strategy
    adapters/
      form-api-adapter.ts           # interface
      wafdata-form-adapter.ts       # concrete using httpClient
    hooks/
      use-form-data.ts              # useWafQuery wrapper for initial fetch
      use-field-mutation.ts         # useWafMutation wrapper per field
    fields/
      TextField.tsx
      NumberField.tsx
      SelectField.tsx
      SwitchField.tsx
      CheckboxField.tsx
      TextareaField.tsx
      DateField.tsx
      ComboboxField.tsx
      index.ts                      # barrel + default registry population
    FormEngineProvider.tsx           # context/DI container
    InlineEditField.tsx             # read/edit mode wrapper with mutation
    FormEngine.tsx                  # orchestrator: RHF + json-render Renderer

  object-detail/
    index.ts                        # public barrel
    types.ts                        # ObjectDetailConfig, TabConfig, HeaderField
    HeaderBar.tsx                   # read-only header fields
    PropertiesPanel.tsx             # right panel: toolbar + FormEngine
    DetailTabs.tsx                  # tabs -> ConfiguredTable per tab
    ObjectDetailView.tsx            # shell: header + resizable panels

src/features/change/
  components/
    change-action-detail.tsx        # ObjectDetailView consumer for CA
  configs/
    change-action-detail.config.ts  # ObjectDetailConfig with header, form, tabs
    change-action-tabs.config.ts    # DAGTableConfig per tab

src/routes/
  change.tsx                        # /change route

src/components/layout/
  nav-items.ts                      # add /change nav item (modify)
```

---

## Task 1: Form Engine Types

**Files:**
- Create: `src/components/form-engine/types.ts`

All shared TypeScript types for the form engine. Every subsequent task imports from here.

- [ ] **Step 1: Create the types file**

```typescript
// src/components/form-engine/types.ts

import type { Control, FieldValues, UseFormReturn } from "react-hook-form";

// ─── Field Types ─────────────────────────────────────────────────────────────

export type FieldType =
  | "text"
  | "number"
  | "select"
  | "multiselect"
  | "date"
  | "checkbox"
  | "switch"
  | "textarea"
  | "combobox"
  | "file"
  | "richtext";

export type EditTrigger = "click" | "icon" | "always";
export type SaveStrategy = "onBlur" | "onEnter" | "explicit";
export type FormLayout = "vertical" | "grid" | "sections";

// ─── Validation ──────────────────────────────────────────────────────────────

export interface ValidationRule {
  type:
    | "required"
    | "minLength"
    | "maxLength"
    | "min"
    | "max"
    | "pattern"
    | "email"
    | "url";
  value?: unknown;
  message: string;
}

// ─── API Binding ─────────────────────────────────────────────────────────────

export interface FieldApiBinding {
  method: "PATCH" | "PUT" | "POST";
  url: string;
  bodyKey?: string;
  headers?: Record<string, string>;
}

// ─── Field Descriptor ────────────────────────────────────────────────────────

export interface FormFieldDescriptor {
  name: string;
  label: string;
  type: FieldType;
  defaultValue?: unknown;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
  options?: string[] | { label: string; value: string }[];
  validations?: ValidationRule[];
  editTrigger?: EditTrigger;
  saveStrategy?: SaveStrategy;
  apiBinding?: FieldApiBinding;
  visible?: unknown; // json-render visibility condition
  className?: string;
  colSpan?: number;
}

// ─── Form Schema ─────────────────────────────────────────────────────────────

export interface FormFetchConfig {
  url: string;
  queryKey: string[];
  responseTransform?: string;
}

export interface FormSchema {
  id: string;
  title: string;
  layout: FormLayout;
  columns?: number;
  fetch?: FormFetchConfig;
  fields: FormFieldDescriptor[];
}

// ─── Field Renderer ──────────────────────────────────────────────────────────

export interface FieldRendererProps {
  descriptor: FormFieldDescriptor;
  control: Control<FieldValues>;
  isEditing: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export type FieldRenderer = (props: FieldRendererProps) => React.ReactNode;

// ─── API Adapter ─────────────────────────────────────────────────────────────

export interface FetchConfig {
  url: string;
  params?: Record<string, string>;
  headers?: Record<string, string>;
}

export interface UpdateConfig {
  method: "PATCH" | "PUT" | "POST";
  url: string;
  body: Record<string, unknown>;
  headers?: Record<string, string>;
}

export interface FormApiAdapter {
  fetchData(config: FetchConfig): Promise<Record<string, unknown>>;
  updateField(config: UpdateConfig): Promise<unknown>;
  batchUpdate?(fields: UpdateConfig[]): Promise<void>;
}

// ─── Engine Hooks ────────────────────────────────────────────────────────────

export interface FormEngineHooks {
  beforeFieldUpdate?: (field: string, value: unknown) => unknown;
  afterFieldUpdate?: (field: string, response: unknown) => void;
  onValidationError?: (field: string, errors: unknown) => void;
}

// ─── Provider Context ────────────────────────────────────────────────────────

export interface FormEngineContextValue {
  adapter: FormApiAdapter;
  hooks?: FormEngineHooks;
  fieldRegistry: Map<FieldType, FieldRenderer>;
  schema: FormSchema;
  form: UseFormReturn<FieldValues>;
  params?: Record<string, string>;
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors from `types.ts` (pre-existing errors in other files are expected).

- [ ] **Step 3: Commit**

```bash
git add src/components/form-engine/types.ts
git commit -m "feat(form-engine): add core type definitions"
```

---

## Task 2: Validation Builder

**Files:**
- Create: `src/components/form-engine/validation-builder.ts`

Converts `FormFieldDescriptor.validations[]` into a Zod schema dynamically. Also builds a full form Zod schema from all field descriptors.

- [ ] **Step 1: Create the validation builder**

```typescript
// src/components/form-engine/validation-builder.ts

import { z, type ZodType } from "zod";
import type { FormFieldDescriptor, ValidationRule } from "./types";

/**
 * Build a Zod schema for a single field based on its validation rules.
 */
export function buildFieldSchema(descriptor: FormFieldDescriptor): ZodType {
  let schema: ZodType = z.any();

  const { type, validations = [], required } = descriptor;

  // Start with base type
  switch (type) {
    case "number":
      schema = z.coerce.number();
      break;
    case "checkbox":
    case "switch":
      schema = z.boolean();
      break;
    case "date":
      schema = z.coerce.date();
      break;
    case "multiselect":
      schema = z.array(z.string());
      break;
    default:
      schema = z.string();
      break;
  }

  // Apply validation rules
  for (const rule of validations) {
    schema = applyRule(schema, rule, type);
  }

  // Apply required — if not required, make optional + nullable
  if (required) {
    if (schema instanceof z.ZodString) {
      schema = (schema as z.ZodString).min(1, "This field is required");
    }
  } else {
    schema = schema.optional().nullable();
  }

  return schema;
}

function applyRule(
  schema: ZodType,
  rule: ValidationRule,
  fieldType: string,
): ZodType {
  switch (rule.type) {
    case "required":
      if (schema instanceof z.ZodString) {
        return (schema as z.ZodString).min(1, rule.message);
      }
      return schema;

    case "minLength":
      if (schema instanceof z.ZodString) {
        return (schema as z.ZodString).min(
          rule.value as number,
          rule.message,
        );
      }
      return schema;

    case "maxLength":
      if (schema instanceof z.ZodString) {
        return (schema as z.ZodString).max(
          rule.value as number,
          rule.message,
        );
      }
      return schema;

    case "min":
      if (schema instanceof z.ZodNumber) {
        return (schema as z.ZodNumber).min(
          rule.value as number,
          rule.message,
        );
      }
      return schema;

    case "max":
      if (schema instanceof z.ZodNumber) {
        return (schema as z.ZodNumber).max(
          rule.value as number,
          rule.message,
        );
      }
      return schema;

    case "pattern":
      if (schema instanceof z.ZodString) {
        return (schema as z.ZodString).regex(
          new RegExp(rule.value as string),
          rule.message,
        );
      }
      return schema;

    case "email":
      if (schema instanceof z.ZodString) {
        return (schema as z.ZodString).email(rule.message);
      }
      return schema;

    case "url":
      if (schema instanceof z.ZodString) {
        return (schema as z.ZodString).url(rule.message);
      }
      return schema;

    default:
      return schema;
  }
}

/**
 * Build a Zod object schema from all field descriptors.
 * Used as the resolver for react-hook-form.
 */
export function buildFormSchema(
  fields: FormFieldDescriptor[],
): z.ZodObject<Record<string, ZodType>> {
  const shape: Record<string, ZodType> = {};
  for (const field of fields) {
    shape[field.name] = buildFieldSchema(field);
  }
  return z.object(shape);
}
```

- [ ] **Step 2: Verify no TypeScript errors**

Run: `npx tsc --noEmit --pretty 2>&1 | grep "validation-builder"`
Expected: No errors from this file.

- [ ] **Step 3: Commit**

```bash
git add src/components/form-engine/validation-builder.ts
git commit -m "feat(form-engine): add dynamic Zod validation builder"
```

---

## Task 3: Schema Resolver

**Files:**
- Create: `src/components/form-engine/schema-resolver.ts`

Converts a `FormSchema` (with its `fields[]` array) into a json-render element tree that the `Renderer` can consume.

- [ ] **Step 1: Create the schema resolver**

```typescript
// src/components/form-engine/schema-resolver.ts

import type { FormFieldDescriptor, FormLayout, FormSchema } from "./types";

/**
 * A json-render element node.
 */
interface SpecElement {
  type: string;
  props: Record<string, unknown>;
  children?: SpecElement[];
  visible?: unknown;
}

/**
 * The json-render spec root.
 */
export interface FormSpec {
  root: SpecElement;
}

/**
 * Convert a FormSchema into a json-render element tree (spec).
 *
 * Layout modes:
 * - "vertical": Stack of fields
 * - "grid": CSS grid with configurable columns
 * - "sections": grouped by field separator (future; falls back to vertical)
 */
export function resolveFormSchema(schema: FormSchema): FormSpec {
  const fieldElements = schema.fields.map(resolveField);

  const root = wrapInLayout(fieldElements, schema.layout, schema.columns);

  return { root };
}

function resolveField(descriptor: FormFieldDescriptor): SpecElement {
  const element: SpecElement = {
    type: "FormField",
    props: {
      descriptor,
    },
    visible: descriptor.visible,
  };

  return element;
}

function wrapInLayout(
  children: SpecElement[],
  layout: FormLayout,
  columns?: number,
): SpecElement {
  switch (layout) {
    case "grid":
      return {
        type: "Grid",
        props: {
          columns: columns ?? 2,
          gap: 4,
        },
        children,
      };

    case "sections":
      // Future: group fields by section markers
      // Falls through to vertical for now
      return {
        type: "Stack",
        props: {
          direction: "column",
          gap: 3,
        },
        children,
      };

    case "vertical":
    default:
      return {
        type: "Stack",
        props: {
          direction: "column",
          gap: 3,
        },
        children,
      };
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/form-engine/schema-resolver.ts
git commit -m "feat(form-engine): add schema resolver (FormSchema -> json-render spec)"
```

---

## Task 4: API Adapter Interface + WAFData Concrete

**Files:**
- Create: `src/components/form-engine/adapters/form-api-adapter.ts`
- Create: `src/components/form-engine/adapters/wafdata-form-adapter.ts`

- [ ] **Step 1: Create the adapter interface re-export**

The `FormApiAdapter` interface is already in `types.ts`. This file re-exports it and provides the factory type.

```typescript
// src/components/form-engine/adapters/form-api-adapter.ts

export type {
  FormApiAdapter,
  FetchConfig,
  UpdateConfig,
} from "../types";
```

- [ ] **Step 2: Create the WAFData concrete adapter**

```typescript
// src/components/form-engine/adapters/wafdata-form-adapter.ts

import { httpClient } from "#/services";
import type { FormApiAdapter, FetchConfig, UpdateConfig } from "../types";

/**
 * Concrete FormApiAdapter backed by the WAFData httpClient.
 * Reuses the existing service layer — no new HTTP abstractions.
 */
export const wafdataFormAdapter: FormApiAdapter = {
  async fetchData(config: FetchConfig): Promise<Record<string, unknown>> {
    const response = await httpClient.get<Record<string, unknown>>(config.url, {
      params: config.params,
      headers: config.headers,
    });
    return response.data;
  },

  async updateField(config: UpdateConfig): Promise<unknown> {
    const response = await httpClient.execute(config.method, config.url, {
      data: config.body,
      headers: config.headers,
    });
    return response.data;
  },

  async batchUpdate(fields: UpdateConfig[]): Promise<void> {
    await Promise.all(fields.map((f) => this.updateField(f)));
  },
};
```

- [ ] **Step 3: Commit**

```bash
git add src/components/form-engine/adapters/
git commit -m "feat(form-engine): add API adapter interface + WAFData concrete"
```

---

## Task 5: Form Data Hook + Field Mutation Hook

**Files:**
- Create: `src/components/form-engine/hooks/use-form-data.ts`
- Create: `src/components/form-engine/hooks/use-field-mutation.ts`

- [ ] **Step 1: Create useFormData hook**

Wraps `useWafQuery` for initial form data fetch. Supports `:param` interpolation in URLs.

```typescript
// src/components/form-engine/hooks/use-form-data.ts

import { useWafQuery } from "#/services/hooks/use-waf-query";
import type { ServiceError, ServiceResponse } from "#/services/types";
import type { UseQueryResult } from "@tanstack/react-query";
import type { FormFetchConfig } from "../types";

/**
 * Interpolate :param placeholders in URL with actual values.
 * e.g. "/api/parts/:id" + { id: "123" } -> "/api/parts/123"
 */
function interpolateUrl(
  url: string,
  params: Record<string, string>,
): string {
  return url.replace(/:(\w+)/g, (_, key) => params[key] ?? `:${key}`);
}

export function useFormData(
  fetchConfig: FormFetchConfig | undefined,
  params: Record<string, string> = {},
): UseQueryResult<ServiceResponse<Record<string, unknown>>, ServiceError> {
  const url = fetchConfig ? interpolateUrl(fetchConfig.url, params) : "";

  return useWafQuery<Record<string, unknown>>(url, {
    queryKey: fetchConfig?.queryKey.map((k) =>
      k.startsWith(":") ? params[k.slice(1)] ?? k : k,
    ),
    enabled: !!fetchConfig && !!url,
  });
}
```

- [ ] **Step 2: Create useFieldMutation hook**

Wraps `useWafMutation` for per-field saves. Handles `:param` interpolation, bodyKey wrapping, debounce, and rollback.

```typescript
// src/components/form-engine/hooks/use-field-mutation.ts

import { useWafMutation } from "#/services/hooks/use-waf-mutation";
import type { ServiceError, ServiceResponse } from "#/services/types";
import type { UseMutationResult } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import type { FieldApiBinding } from "../types";

/**
 * Interpolate :param placeholders in URL.
 */
function interpolateUrl(
  url: string,
  params: Record<string, string>,
): string {
  return url.replace(/:(\w+)/g, (_, key) => params[key] ?? `:${key}`);
}

interface UseFieldMutationOptions {
  apiBinding: FieldApiBinding;
  params?: Record<string, string>;
  debounceMs?: number;
}

interface UseFieldMutationReturn {
  mutation: UseMutationResult<
    ServiceResponse<unknown>,
    ServiceError,
    Record<string, unknown>
  >;
  save: (fieldName: string, value: unknown) => void;
  saveAsync: (
    fieldName: string,
    value: unknown,
  ) => Promise<ServiceResponse<unknown>>;
  cancel: () => void;
}

export function useFieldMutation({
  apiBinding,
  params = {},
  debounceMs = 300,
}: UseFieldMutationOptions): UseFieldMutationReturn {
  const url = interpolateUrl(apiBinding.url, params);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mutation = useWafMutation<unknown, Record<string, unknown>>(
    apiBinding.method,
    url,
    { headers: apiBinding.headers },
  );

  const cancel = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const save = useCallback(
    (fieldName: string, value: unknown) => {
      cancel();
      timerRef.current = setTimeout(() => {
        const body = apiBinding.bodyKey
          ? { [apiBinding.bodyKey]: value }
          : { [fieldName]: value };
        mutation.mutate(body);
      }, debounceMs);
    },
    [cancel, apiBinding.bodyKey, mutation, debounceMs],
  );

  const saveAsync = useCallback(
    async (
      fieldName: string,
      value: unknown,
    ): Promise<ServiceResponse<unknown>> => {
      cancel();
      const body = apiBinding.bodyKey
        ? { [apiBinding.bodyKey]: value }
        : { [fieldName]: value };
      return mutation.mutateAsync(body);
    },
    [cancel, apiBinding.bodyKey, mutation],
  );

  return { mutation, save, saveAsync, cancel };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/form-engine/hooks/
git commit -m "feat(form-engine): add useFormData + useFieldMutation hooks"
```

---

## Task 6: Field Registry + Field Components

**Files:**
- Create: `src/components/form-engine/field-registry.ts`
- Create: `src/components/form-engine/fields/TextField.tsx`
- Create: `src/components/form-engine/fields/NumberField.tsx`
- Create: `src/components/form-engine/fields/SelectField.tsx`
- Create: `src/components/form-engine/fields/SwitchField.tsx`
- Create: `src/components/form-engine/fields/CheckboxField.tsx`
- Create: `src/components/form-engine/fields/TextareaField.tsx`
- Create: `src/components/form-engine/fields/DateField.tsx`
- Create: `src/components/form-engine/fields/ComboboxField.tsx`
- Create: `src/components/form-engine/fields/index.ts`

- [ ] **Step 1: Create the field registry**

```typescript
// src/components/form-engine/field-registry.ts

import type { FieldRenderer, FieldType } from "./types";

const fieldRegistry = new Map<FieldType, FieldRenderer>();

export function registerField(type: FieldType, renderer: FieldRenderer): void {
  fieldRegistry.set(type, renderer);
}

export function resolveField(type: FieldType): FieldRenderer | undefined {
  return fieldRegistry.get(type);
}

export function getFieldRegistry(): Map<FieldType, FieldRenderer> {
  return fieldRegistry;
}

export function createFieldRegistry(): Map<FieldType, FieldRenderer> {
  return new Map(fieldRegistry);
}
```

- [ ] **Step 2: Create TextField**

```tsx
// src/components/form-engine/fields/TextField.tsx

import { Input } from "#/components/ui/input";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function TextField({
  descriptor,
  control,
  isEditing,
}: FieldRendererProps) {
  const { field, fieldState } = useController({
    name: descriptor.name,
    control,
  });

  if (!isEditing) {
    return (
      <span className="text-sm text-foreground">
        {field.value ?? "—"}
      </span>
    );
  }

  return (
    <Input
      {...field}
      value={field.value ?? ""}
      placeholder={descriptor.placeholder}
      readOnly={descriptor.readOnly}
      aria-invalid={!!fieldState.error}
      className="h-7"
    />
  );
}
```

- [ ] **Step 3: Create NumberField**

```tsx
// src/components/form-engine/fields/NumberField.tsx

import { Input } from "#/components/ui/input";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function NumberField({
  descriptor,
  control,
  isEditing,
}: FieldRendererProps) {
  const { field, fieldState } = useController({
    name: descriptor.name,
    control,
  });

  if (!isEditing) {
    return (
      <span className="text-sm text-foreground">
        {field.value != null ? String(field.value) : "—"}
      </span>
    );
  }

  return (
    <Input
      {...field}
      type="number"
      value={field.value ?? ""}
      onChange={(e) => field.onChange(e.target.valueAsNumber || "")}
      placeholder={descriptor.placeholder}
      readOnly={descriptor.readOnly}
      aria-invalid={!!fieldState.error}
      className="h-7"
    />
  );
}
```

- [ ] **Step 4: Create SelectField**

```tsx
// src/components/form-engine/fields/SelectField.tsx

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
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

export function SelectField({
  descriptor,
  control,
  isEditing,
}: FieldRendererProps) {
  const { field } = useController({
    name: descriptor.name,
    control,
  });

  const opts = normalizeOptions(descriptor.options);

  if (!isEditing) {
    const selected = opts.find((o) => o.value === field.value);
    return (
      <span className="text-sm text-foreground">
        {selected?.label ?? field.value ?? "—"}
      </span>
    );
  }

  return (
    <Select value={field.value ?? ""} onValueChange={field.onChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={descriptor.placeholder ?? "Select..."} />
      </SelectTrigger>
      <SelectContent>
        {opts.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

- [ ] **Step 5: Create SwitchField**

```tsx
// src/components/form-engine/fields/SwitchField.tsx

import { Switch } from "#/components/ui/switch";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function SwitchField({
  descriptor,
  control,
  isEditing,
}: FieldRendererProps) {
  const { field } = useController({
    name: descriptor.name,
    control,
  });

  if (!isEditing) {
    return (
      <span className="text-sm text-foreground">
        {field.value ? "Yes" : "No"}
      </span>
    );
  }

  return (
    <Switch
      checked={!!field.value}
      onCheckedChange={field.onChange}
      disabled={descriptor.readOnly}
    />
  );
}
```

- [ ] **Step 6: Create CheckboxField**

```tsx
// src/components/form-engine/fields/CheckboxField.tsx

import { Checkbox } from "#/components/ui/checkbox";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function CheckboxField({
  descriptor,
  control,
  isEditing,
}: FieldRendererProps) {
  const { field } = useController({
    name: descriptor.name,
    control,
  });

  if (!isEditing) {
    return (
      <span className="text-sm text-foreground">
        {field.value ? "Yes" : "No"}
      </span>
    );
  }

  return (
    <Checkbox
      checked={!!field.value}
      onCheckedChange={field.onChange}
      disabled={descriptor.readOnly}
    />
  );
}
```

- [ ] **Step 7: Create TextareaField**

```tsx
// src/components/form-engine/fields/TextareaField.tsx

import { Textarea } from "#/components/ui/textarea";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function TextareaField({
  descriptor,
  control,
  isEditing,
}: FieldRendererProps) {
  const { field, fieldState } = useController({
    name: descriptor.name,
    control,
  });

  if (!isEditing) {
    return (
      <span className="text-sm text-foreground whitespace-pre-wrap">
        {field.value ?? "—"}
      </span>
    );
  }

  return (
    <Textarea
      {...field}
      value={field.value ?? ""}
      placeholder={descriptor.placeholder}
      readOnly={descriptor.readOnly}
      aria-invalid={!!fieldState.error}
      rows={3}
    />
  );
}
```

- [ ] **Step 8: Create DateField**

```tsx
// src/components/form-engine/fields/DateField.tsx

import { Input } from "#/components/ui/input";
import { format } from "date-fns";
import { useController } from "react-hook-form";
import type { FieldRendererProps } from "../types";

export function DateField({
  descriptor,
  control,
  isEditing,
}: FieldRendererProps) {
  const { field, fieldState } = useController({
    name: descriptor.name,
    control,
  });

  if (!isEditing) {
    const display = field.value
      ? format(new Date(field.value as string), "MMM d, yyyy")
      : "—";
    return <span className="text-sm text-foreground">{display}</span>;
  }

  return (
    <Input
      {...field}
      type="date"
      value={field.value ?? ""}
      readOnly={descriptor.readOnly}
      aria-invalid={!!fieldState.error}
      className="h-7"
    />
  );
}
```

- [ ] **Step 9: Create ComboboxField**

```tsx
// src/components/form-engine/fields/ComboboxField.tsx

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "#/components/ui/combobox";
import { useState } from "react";
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
    <Combobox
      value={field.value ?? ""}
      onValueChange={field.onChange}
    >
      <ComboboxInput
        placeholder={descriptor.placeholder ?? "Search..."}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
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
```

- [ ] **Step 10: Create fields barrel with default registry population**

```typescript
// src/components/form-engine/fields/index.ts

import { registerField } from "../field-registry";
import type { FieldType } from "../types";
import { CheckboxField } from "./CheckboxField";
import { ComboboxField } from "./ComboboxField";
import { DateField } from "./DateField";
import { NumberField } from "./NumberField";
import { SelectField } from "./SelectField";
import { SwitchField } from "./SwitchField";
import { TextField } from "./TextField";
import { TextareaField } from "./TextareaField";

/**
 * Register all built-in field renderers.
 * Call once at app init or when creating a FormEngine.
 */
export function registerBuiltinFields(): void {
  const builtins: [FieldType, typeof TextField][] = [
    ["text", TextField],
    ["number", NumberField],
    ["select", SelectField],
    ["multiselect", SelectField], // reuse select for now
    ["date", DateField],
    ["checkbox", CheckboxField],
    ["switch", SwitchField],
    ["textarea", TextareaField],
    ["combobox", ComboboxField],
    ["richtext", TextareaField], // fallback to textarea
    ["file", TextField], // fallback to text input type=file
  ];

  for (const [type, renderer] of builtins) {
    registerField(type, renderer);
  }
}

export {
  CheckboxField,
  ComboboxField,
  DateField,
  NumberField,
  SelectField,
  SwitchField,
  TextField,
  TextareaField,
};
```

- [ ] **Step 11: Commit**

```bash
git add src/components/form-engine/field-registry.ts src/components/form-engine/fields/
git commit -m "feat(form-engine): add field registry + 8 field components"
```

---

## Task 7: Form Catalog + Form Registry (json-render)

**Files:**
- Create: `src/components/form-engine/form-catalog.ts`
- Create: `src/components/form-engine/form-registry.ts`

- [ ] **Step 1: Create form catalog**

```typescript
// src/components/form-engine/form-catalog.ts

import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { shadcnComponentDefinitions } from "@json-render/shadcn/catalog";
import { z } from "zod";

/**
 * Form engine catalog using json-render.
 * Includes shadcn layout components + a generic FormField component.
 */
export const formCatalog = defineCatalog(schema, {
  components: {
    // Layout components from shadcn
    Card: shadcnComponentDefinitions.Card,
    Stack: shadcnComponentDefinitions.Stack,
    Grid: shadcnComponentDefinitions.Grid,
    Heading: shadcnComponentDefinitions.Heading,
    Separator: shadcnComponentDefinitions.Separator,
    Text: shadcnComponentDefinitions.Text,

    // Generic form field — the schema resolver emits this type.
    // The registry maps it to a React component that reads the
    // descriptor and delegates to the field registry.
    FormField: {
      props: z.object({
        descriptor: z.any(), // FormFieldDescriptor — validated at runtime
      }),
      description:
        "A form field rendered by the field registry based on its descriptor.type",
    },
  },
  actions: {},
});
```

- [ ] **Step 2: Create form registry**

```tsx
// src/components/form-engine/form-registry.ts

import { defineRegistry } from "@json-render/react";
import { shadcnComponents } from "@json-render/shadcn";
import { resolveField } from "./field-registry";
import { formCatalog } from "./form-catalog";
import { useFormEngineContext } from "./FormEngineProvider";
import type { FormFieldDescriptor } from "./types";

/**
 * Form engine registry — maps catalog component names to React implementations.
 * The FormField component bridges json-render -> field registry -> actual input.
 */
export const { registry: formRegistry } = defineRegistry(formCatalog, {
  components: {
    Card: shadcnComponents.Card,
    Stack: shadcnComponents.Stack,
    Grid: shadcnComponents.Grid,
    Heading: shadcnComponents.Heading,
    Separator: shadcnComponents.Separator,
    Text: shadcnComponents.Text,

    FormField: ({ props }) => {
      const descriptor = props.descriptor as FormFieldDescriptor;
      const { form, fieldRegistry } = useFormEngineContext();
      const renderer =
        fieldRegistry.get(descriptor.type) ?? resolveField(descriptor.type);

      if (!renderer) {
        return (
          <div className="text-xs text-destructive">
            Unknown field type: {descriptor.type}
          </div>
        );
      }

      // The InlineEditField wrapper will be composed here by FormEngine
      // For now, render the field directly in "always edit" mode
      return renderer({
        descriptor,
        control: form.control,
        isEditing: descriptor.editTrigger === "always" || !descriptor.readOnly,
        onSave: () => {},
        onCancel: () => {},
      });
    },
  },
});
```

- [ ] **Step 3: Commit**

```bash
git add src/components/form-engine/form-catalog.ts src/components/form-engine/form-registry.ts
git commit -m "feat(form-engine): add json-render catalog + registry"
```

---

## Task 8: FormEngineProvider

**Files:**
- Create: `src/components/form-engine/FormEngineProvider.tsx`

- [ ] **Step 1: Create the provider**

```tsx
// src/components/form-engine/FormEngineProvider.tsx

import { createContext, useContext, type ReactNode } from "react";
import type { FormEngineContextValue } from "./types";

const FormEngineContext = createContext<FormEngineContextValue | null>(null);

export function useFormEngineContext(): FormEngineContextValue {
  const ctx = useContext(FormEngineContext);
  if (!ctx) {
    throw new Error(
      "useFormEngineContext must be used within a FormEngineProvider",
    );
  }
  return ctx;
}

interface FormEngineProviderProps {
  value: FormEngineContextValue;
  children: ReactNode;
}

export function FormEngineProvider({
  value,
  children,
}: FormEngineProviderProps) {
  return (
    <FormEngineContext.Provider value={value}>
      {children}
    </FormEngineContext.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/form-engine/FormEngineProvider.tsx
git commit -m "feat(form-engine): add FormEngineProvider context"
```

---

## Task 9: InlineEditField

**Files:**
- Create: `src/components/form-engine/InlineEditField.tsx`

The core inline editing wrapper. Manages read/edit mode, save triggers, debounced mutations, and error rollback.

- [ ] **Step 1: Create InlineEditField**

```tsx
// src/components/form-engine/InlineEditField.tsx

import { Field, FieldError, FieldTitle } from "#/components/ui/field";
import { Skeleton } from "#/components/ui/skeleton";
import { Loader2, Pencil } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { useController, type Control, type FieldValues } from "react-hook-form";
import { toast } from "sonner";
import { resolveField } from "./field-registry";
import { useFieldMutation } from "./hooks/use-field-mutation";
import type {
  EditTrigger,
  FieldApiBinding,
  FieldRenderer,
  FormFieldDescriptor,
  SaveStrategy,
} from "./types";

type EditState = "idle" | "editing" | "saving";

interface InlineEditFieldProps {
  descriptor: FormFieldDescriptor;
  control: Control<FieldValues>;
  fieldRegistry: Map<string, FieldRenderer>;
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

  const [editState, setEditState] = useState<EditState>(
    editTrigger === "always" && !readOnly ? "editing" : "idle",
  );
  const previousValueRef = useRef<unknown>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);

  const { field, fieldState } = useController({ name, control });

  // Mutation hook — only created if apiBinding exists
  const mutationHook = apiBinding
    ? useFieldMutation({ apiBinding, params, debounceMs: 300 })
    : null;

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
    if (mutationHook) mutationHook.cancel();
    field.onChange(previousValueRef.current);
    setEditState(editTrigger === "always" && !readOnly ? "editing" : "idle");
  }, [mutationHook, field, editTrigger, readOnly]);

  // ─── Save field ────────────────────────────────────────────────────────────
  const saveField = useCallback(async () => {
    if (!mutationHook || !apiBinding) {
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
  }, [mutationHook, apiBinding, field, name, label, editTrigger]);

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
            onClick={startEditing}
            className="ml-1 opacity-0 group-hover/field:opacity-100 transition-opacity"
          >
            <Pencil className="size-3 text-muted-foreground" />
          </button>
        )}
        {editState === "saving" && (
          <Loader2 className="ml-1 size-3 animate-spin text-muted-foreground" />
        )}
      </FieldTitle>

      <div
        ref={containerRef}
        onKeyDown={editState !== "idle" ? handleKeyDown : undefined}
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

      {fieldState.error && (
        <FieldError>{fieldState.error.message}</FieldError>
      )}

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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/form-engine/InlineEditField.tsx
git commit -m "feat(form-engine): add InlineEditField with save strategies + debounce"
```

---

## Task 10: FormEngine Orchestrator

**Files:**
- Create: `src/components/form-engine/FormEngine.tsx`
- Create: `src/components/form-engine/index.ts`

- [ ] **Step 1: Create FormEngine**

```tsx
// src/components/form-engine/FormEngine.tsx

import { zodResolver } from "@hookform/resolvers/zod";
import { Renderer } from "@json-render/react";
import { useMemo } from "react";
import { FormProvider, useForm } from "react-hook-form";
import { getFieldRegistry } from "./field-registry";
import { registerBuiltinFields } from "./fields";
import { FormEngineProvider } from "./FormEngineProvider";
import { formRegistry } from "./form-registry";
import { useFormData } from "./hooks/use-form-data";
import { InlineEditField } from "./InlineEditField";
import { resolveFormSchema } from "./schema-resolver";
import type { FormApiAdapter, FormEngineHooks, FormSchema } from "./types";
import { buildFormSchema } from "./validation-builder";
import { Skeleton } from "#/components/ui/skeleton";
import { ScrollArea } from "#/components/ui/scroll-area";

// Ensure built-in fields are registered
registerBuiltinFields();

interface FormEngineProps {
  schema: FormSchema;
  adapter: FormApiAdapter;
  params?: Record<string, string>;
  hooks?: FormEngineHooks;
  className?: string;
}

export function FormEngine({
  schema,
  adapter,
  params = {},
  hooks,
  className,
}: FormEngineProps) {
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
      defaults[field.name] = fetched[field.name] ?? field.defaultValue ?? undefined;
    }
    return defaults;
  }, [data, schema.fields]);

  // Create react-hook-form instance
  const form = useForm({
    resolver: zodResolver(zodSchema),
    defaultValues,
    values: defaultValues, // sync when data refreshes
    mode: "onChange",
  });

  // Build json-render spec from schema
  const spec = useMemo(() => resolveFormSchema(schema), [schema]);

  const fieldRegistry = getFieldRegistry();

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
    <FormEngineProvider
      value={{
        adapter,
        hooks,
        fieldRegistry,
        schema,
        form,
        params,
      }}
    >
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
}
```

- [ ] **Step 2: Create the public barrel**

```typescript
// src/components/form-engine/index.ts

export { FormEngine } from "./FormEngine";
export { FormEngineProvider, useFormEngineContext } from "./FormEngineProvider";
export { InlineEditField } from "./InlineEditField";
export {
  createFieldRegistry,
  getFieldRegistry,
  registerField,
  resolveField,
} from "./field-registry";
export { registerBuiltinFields } from "./fields";
export { formCatalog } from "./form-catalog";
export { formRegistry } from "./form-registry";
export { useFieldMutation } from "./hooks/use-field-mutation";
export { useFormData } from "./hooks/use-form-data";
export { resolveFormSchema } from "./schema-resolver";
export { buildFieldSchema, buildFormSchema } from "./validation-builder";
export type {
  EditTrigger,
  FieldApiBinding,
  FieldRenderer,
  FieldRendererProps,
  FieldType,
  FormApiAdapter,
  FormEngineContextValue,
  FormEngineHooks,
  FormFetchConfig,
  FormFieldDescriptor,
  FormLayout,
  FormSchema,
  SaveStrategy,
  ValidationRule,
} from "./types";
export { wafdataFormAdapter } from "./adapters/wafdata-form-adapter";
```

- [ ] **Step 3: Commit**

```bash
git add src/components/form-engine/FormEngine.tsx src/components/form-engine/index.ts
git commit -m "feat(form-engine): add FormEngine orchestrator + public barrel"
```

---

## Task 11: Object Detail Types

**Files:**
- Create: `src/components/object-detail/types.ts`

- [ ] **Step 1: Create the types**

```typescript
// src/components/object-detail/types.ts

import type { DAGTableConfig } from "#/components/data-grid/table-engine";
import type { FormSchema } from "#/components/form-engine";

export interface HeaderField {
  field: string;
  label: string;
  type?: "text" | "badge" | "link";
  linkPrefix?: string;
}

export interface TabConfig {
  id: string;
  label: string;
  icon: string; // lucide icon name
  type: "table";
  tableConfig: DAGTableConfig;
}

export interface ObjectDetailConfig {
  id: string;
  title: string;
  icon?: string; // lucide icon name
  header: {
    titleField: string;
    subtitleFields?: HeaderField[];
    badgeField?: string;
  };
  propertiesPanel: {
    form: FormSchema;
    defaultOpen?: boolean;
    defaultSize?: number; // % width, default 25
    minSize?: number; // % width, default 15
  };
  tabs: TabConfig[];
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/object-detail/types.ts
git commit -m "feat(object-detail): add ObjectDetailConfig types"
```

---

## Task 12: HeaderBar Component

**Files:**
- Create: `src/components/object-detail/HeaderBar.tsx`

Read-only header bar matching the 3DX screenshot: icon + title + maturity badge + key-value metadata.

- [ ] **Step 1: Create HeaderBar**

```tsx
// src/components/object-detail/HeaderBar.tsx

import { Badge } from "#/components/ui/badge";
import { cn } from "#/lib/utils";
import { icons, type LucideIcon } from "lucide-react";
import type { HeaderField } from "./types";

interface HeaderBarProps {
  icon?: string;
  title: string;
  badgeValue?: string;
  subtitleFields?: HeaderField[];
  data: Record<string, unknown>;
  className?: string;
}

function getIcon(name?: string): LucideIcon | null {
  if (!name) return null;
  return (icons as Record<string, LucideIcon>)[name] ?? null;
}

export function HeaderBar({
  icon,
  title,
  badgeValue,
  subtitleFields = [],
  data,
  className,
}: HeaderBarProps) {
  const IconComponent = getIcon(icon);

  return (
    <div
      className={cn(
        "flex flex-wrap items-start gap-x-6 gap-y-2 border-b bg-background/80 backdrop-blur-md px-4 py-3",
        className,
      )}
    >
      {/* Title section */}
      <div className="flex items-center gap-2">
        {IconComponent && (
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
            <IconComponent className="size-5 text-primary" />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold leading-tight">{title}</h1>
            {badgeValue && (
              <Badge variant="default" className="text-xs">
                {badgeValue}
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Subtitle key-value pairs */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1 text-xs text-muted-foreground">
        {subtitleFields.map((sf) => {
          const value = data[sf.field];
          const displayValue =
            value != null ? String(value) : "—";

          return (
            <div key={sf.field} className="flex items-center gap-1">
              <span className="font-medium">{sf.label}:</span>
              {sf.type === "badge" ? (
                <Badge variant="outline" className="text-xs">
                  {displayValue}
                </Badge>
              ) : sf.type === "link" ? (
                <span className="text-primary cursor-pointer hover:underline">
                  {displayValue}
                </span>
              ) : (
                <span>{displayValue}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/object-detail/HeaderBar.tsx
git commit -m "feat(object-detail): add HeaderBar component"
```

---

## Task 13: PropertiesPanel Component

**Files:**
- Create: `src/components/object-detail/PropertiesPanel.tsx`

Right-side collapsible properties panel with toolbar and FormEngine.

- [ ] **Step 1: Create PropertiesPanel**

```tsx
// src/components/object-detail/PropertiesPanel.tsx

import { FormEngine } from "#/components/form-engine";
import { wafdataFormAdapter } from "#/components/form-engine/adapters/wafdata-form-adapter";
import { Separator } from "#/components/ui/separator";
import { cn } from "#/lib/utils";
import type { FormApiAdapter, FormSchema } from "#/components/form-engine";
import { icons, type LucideIcon } from "lucide-react";

interface PropertiesPanelProps {
  title: string;
  subtitle?: string;
  icon?: string;
  form: FormSchema;
  adapter?: FormApiAdapter;
  params?: Record<string, string>;
  className?: string;
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
}: PropertiesPanelProps) {
  const IconComponent = getIcon(icon);

  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden bg-background/80 backdrop-blur-md",
        className,
      )}
    >
      {/* Panel header */}
      <div className="flex items-center gap-3 border-b px-4 py-3">
        {IconComponent && (
          <div className="flex size-8 items-center justify-center rounded-md bg-primary/10">
            <IconComponent className="size-4 text-primary" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold truncate">{title}</div>
          {subtitle && (
            <div className="text-xs text-muted-foreground truncate">
              {subtitle}
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Form content */}
      <FormEngine
        schema={form}
        adapter={adapter}
        params={params}
        className="flex-1"
      />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/object-detail/PropertiesPanel.tsx
git commit -m "feat(object-detail): add PropertiesPanel with FormEngine"
```

---

## Task 14: DetailTabs Component

**Files:**
- Create: `src/components/object-detail/DetailTabs.tsx`

Tab container where each tab renders a `ConfiguredTable` from the existing table engine.

- [ ] **Step 1: Create DetailTabs**

```tsx
// src/components/object-detail/DetailTabs.tsx

import { ConfiguredTable } from "#/components/data-grid/table-engine";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "#/components/ui/tabs";
import { cn } from "#/lib/utils";
import { icons, type LucideIcon } from "lucide-react";
import type { TabConfig } from "./types";

interface DetailTabsProps {
  tabs: TabConfig[];
  defaultTab?: string;
  params?: Record<string, string>;
  className?: string;
}

function getIcon(name: string): LucideIcon | null {
  return (icons as Record<string, LucideIcon>)[name] ?? null;
}

export function DetailTabs({
  tabs,
  defaultTab,
  params,
  className,
}: DetailTabsProps) {
  const activeDefault = defaultTab ?? tabs[0]?.id;

  return (
    <Tabs
      defaultValue={activeDefault}
      className={cn("flex h-full flex-col", className)}
    >
      <div className="border-b px-4">
        <TabsList className="mt-2 mb-0 h-9">
          {tabs.map((tab) => {
            const Icon = getIcon(tab.icon);
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="gap-1.5 text-sm"
              >
                {Icon && <Icon className="size-3.5" />}
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>
      </div>

      {tabs.map((tab) => (
        <TabsContent
          key={tab.id}
          value={tab.id}
          className="mt-0 flex flex-1 flex-col overflow-hidden p-2"
        >
          <div className="min-h-0 flex-1 overflow-hidden">
            {tab.type === "table" && (
              <ConfiguredTable
                config={tab.tableConfig}
                params={params}
                className="h-full"
              />
            )}
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/object-detail/DetailTabs.tsx
git commit -m "feat(object-detail): add DetailTabs with ConfiguredTable per tab"
```

---

## Task 15: ObjectDetailView Shell

**Files:**
- Create: `src/components/object-detail/ObjectDetailView.tsx`
- Create: `src/components/object-detail/index.ts`

Top-level shell: HeaderBar + ResizablePanelGroup (main content + properties panel). Info icon toggles panel.

- [ ] **Step 1: Create ObjectDetailView**

```tsx
// src/components/object-detail/ObjectDetailView.tsx

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "#/components/ui/resizable";
import { Button } from "#/components/ui/button";
import { cn } from "#/lib/utils";
import { Info, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { DetailTabs } from "./DetailTabs";
import { HeaderBar } from "./HeaderBar";
import { PropertiesPanel } from "./PropertiesPanel";
import type { ObjectDetailConfig } from "./types";

interface ObjectDetailViewProps {
  config: ObjectDetailConfig;
  data: Record<string, unknown>;
  params?: Record<string, string>;
  className?: string;
}

export function ObjectDetailView({
  config,
  data,
  params,
  className,
}: ObjectDetailViewProps) {
  const { header, propertiesPanel, tabs } = config;
  const panelRef = useRef<ImperativePanelHandle>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(
    propertiesPanel.defaultOpen !== false,
  );

  const togglePanel = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return;

    if (isPanelOpen) {
      panel.collapse();
      setIsPanelOpen(false);
    } else {
      panel.expand();
      setIsPanelOpen(true);
    }
  }, [isPanelOpen]);

  const title = String(data[header.titleField] ?? config.title);
  const badgeValue = header.badgeField
    ? String(data[header.badgeField] ?? "")
    : undefined;

  return (
    <div className={cn("flex h-full flex-col overflow-hidden", className)}>
      {/* Header bar with info toggle */}
      <div className="relative">
        <HeaderBar
          icon={config.icon}
          title={title}
          badgeValue={badgeValue}
          subtitleFields={header.subtitleFields}
          data={data}
        />
        <Button
          variant="ghost"
          size="icon-sm"
          className="absolute top-3 right-3"
          onClick={togglePanel}
        >
          {isPanelOpen ? (
            <X className="size-4" />
          ) : (
            <Info className="size-4" />
          )}
        </Button>
      </div>

      {/* Main content + properties panel */}
      <ResizablePanelGroup direction="horizontal" className="flex-1">
        {/* Main content: tabs with tables */}
        <ResizablePanel defaultSize={75} minSize={40}>
          <DetailTabs tabs={tabs} params={params} />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Properties panel */}
        <ResizablePanel
          ref={panelRef}
          defaultSize={propertiesPanel.defaultSize ?? 25}
          minSize={propertiesPanel.minSize ?? 15}
          collapsible
          collapsedSize={0}
          onCollapse={() => setIsPanelOpen(false)}
          onExpand={() => setIsPanelOpen(true)}
        >
          <PropertiesPanel
            title={title}
            icon={config.icon}
            form={propertiesPanel.form}
            params={params}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
```

- [ ] **Step 2: Create the public barrel**

```typescript
// src/components/object-detail/index.ts

export { DetailTabs } from "./DetailTabs";
export { HeaderBar } from "./HeaderBar";
export { ObjectDetailView } from "./ObjectDetailView";
export { PropertiesPanel } from "./PropertiesPanel";
export type {
  HeaderField,
  ObjectDetailConfig,
  TabConfig,
} from "./types";
```

- [ ] **Step 3: Commit**

```bash
git add src/components/object-detail/
git commit -m "feat(object-detail): add ObjectDetailView shell with resizable panels"
```

---

## Task 16: Change Action Tab Configs

**Files:**
- Create: `src/features/change/configs/change-action-tabs.config.ts`

DAGTableConfig for each of the 4 tabs: Members, Proposed Changes, Realized Changes, Approvals. These reuse the existing table engine and follow the same pattern as `ca-search.config.ts`.

- [ ] **Step 1: Create the tab table configs**

```typescript
// src/features/change/configs/change-action-tabs.config.ts

import type { DAGTableConfig } from "#/components/data-grid/table-engine";

/**
 * Dynamic CA detail URL — resolves at runtime using $row or $params.
 */
const CA_BASE_URL =
  '$:"/resources/v1/modeler/dslc/changeaction/" & $params.caId';

// ─── Members Tab ──────────────────────────────────────────────────────────────

export const membersTabConfig: DAGTableConfig = {
  tableId: "ca-members",
  mode: "flat",
  dag: {
    nodes: [
      {
        id: "members-api",
        type: "api",
        config: {
          url: CA_BASE_URL,
          method: "GET",
          authAdapterId: "wafdata",
          queryParams: { $fields: "members" },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          responseTransform: `
            members.assignees.{
              "name": name,
              "role": "Assignee",
              "email": email
            }
          `,
        },
      },
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "name", header: "Name", sortable: true },
            { field: "role", header: "Role", sortable: true },
            { field: "email", header: "Email" },
          ],
        },
      },
    ],
    edges: [{ from: "members-api", to: "columns" }],
    rootNodeId: "columns",
  },
  features: {
    sorting: { enabled: true },
    selection: { enabled: true, mode: "multi" },
  },
};

// ─── Proposed Changes Tab ─────────────────────────────────────────────────────

export const proposedChangesTabConfig: DAGTableConfig = {
  tableId: "ca-proposed",
  mode: "flat",
  dag: {
    nodes: [
      {
        id: "proposed-api",
        type: "api",
        config: {
          url: CA_BASE_URL,
          method: "GET",
          authAdapterId: "wafdata",
          queryParams: { $fields: "proposedChanges" },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          responseTransform: `
            proposedChanges.{
              "title": where.title,
              "name": where.identifier,
              "revision": where.revision,
              "maturityState": where.state,
              "reasonForChange": why,
              "changeDetails": what,
              "proposalStatus": status,
              "resolvedBy": resolvedBy
            }
          `,
        },
      },
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "title", header: "Title", sortable: true, filterable: true },
            { field: "name", header: "Name", sortable: true },
            { field: "revision", header: "Revision" },
            { field: "maturityState", header: "Maturity State", renderType: "badge" },
            { field: "reasonForChange", header: "Reason for Change" },
            { field: "changeDetails", header: "Change Details" },
            { field: "proposalStatus", header: "Proposal Status", renderType: "badge" },
            { field: "resolvedBy", header: "Resolved By" },
          ],
        },
      },
    ],
    edges: [{ from: "proposed-api", to: "columns" }],
    rootNodeId: "columns",
  },
  features: {
    sorting: { enabled: true },
    filtering: { enabled: true },
    columnResizing: { enabled: true },
    selection: { enabled: true, mode: "multi" },
  },
};

// ─── Realized Changes Tab ─────────────────────────────────────────────────────

export const realizedChangesTabConfig: DAGTableConfig = {
  tableId: "ca-realized",
  mode: "flat",
  dag: {
    nodes: [
      {
        id: "realized-api",
        type: "api",
        config: {
          url: CA_BASE_URL,
          method: "GET",
          authAdapterId: "wafdata",
          queryParams: { $fields: "realizedChanges" },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          responseTransform: `
            realizedChanges.{
              "title": where.title,
              "name": where.identifier,
              "revision": where.revision,
              "maturityState": where.state,
              "changeDetails": what,
              "status": status
            }
          `,
        },
      },
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "title", header: "Title", sortable: true },
            { field: "name", header: "Name", sortable: true },
            { field: "revision", header: "Revision" },
            { field: "maturityState", header: "Maturity State", renderType: "badge" },
            { field: "changeDetails", header: "Change Details" },
            { field: "status", header: "Status", renderType: "badge" },
          ],
        },
      },
    ],
    edges: [{ from: "realized-api", to: "columns" }],
    rootNodeId: "columns",
  },
  features: {
    sorting: { enabled: true },
    columnResizing: { enabled: true },
  },
};

// ─── Approvals Tab ────────────────────────────────────────────────────────────

export const approvalsTabConfig: DAGTableConfig = {
  tableId: "ca-approvals",
  mode: "flat",
  dag: {
    nodes: [
      {
        id: "approvals-api",
        type: "api",
        config: {
          url: CA_BASE_URL,
          method: "GET",
          authAdapterId: "wafdata",
          queryParams: { $fields: "approvals" },
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          responseTransform: `
            approvals.{
              "approver": approver,
              "status": status,
              "comment": comment,
              "date": date
            }
          `,
        },
      },
      {
        id: "columns",
        type: "column",
        config: {
          columns: [
            { field: "approver", header: "Approver", sortable: true },
            { field: "status", header: "Status", renderType: "badge" },
            { field: "comment", header: "Comment" },
            { field: "date", header: "Date", type: "date" },
          ],
        },
      },
    ],
    edges: [{ from: "approvals-api", to: "columns" }],
    rootNodeId: "columns",
  },
  features: {
    sorting: { enabled: true },
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/change/configs/change-action-tabs.config.ts
git commit -m "feat(change): add DAGTableConfig for all 4 detail tabs"
```

---

## Task 17: Change Action Detail Config

**Files:**
- Create: `src/features/change/configs/change-action-detail.config.ts`

The full `ObjectDetailConfig` that wires together the header, properties form, and tab configs.

- [ ] **Step 1: Create the detail config**

```typescript
// src/features/change/configs/change-action-detail.config.ts

import type { FormSchema } from "#/components/form-engine";
import type { ObjectDetailConfig } from "#/components/object-detail";
import {
  approvalsTabConfig,
  membersTabConfig,
  proposedChangesTabConfig,
  realizedChangesTabConfig,
} from "./change-action-tabs.config";

const propertiesForm: FormSchema = {
  id: "ca-properties",
  title: "Change Action Properties",
  layout: "vertical",
  fetch: {
    url: "/resources/v1/modeler/dslc/changeaction/:caId",
    queryKey: ["change-action", ":caId"],
  },
  fields: [
    {
      name: "type",
      label: "Type",
      type: "text",
      readOnly: true,
    },
    {
      name: "title",
      label: "Title",
      type: "text",
      required: true,
      editTrigger: "click",
      saveStrategy: "onBlur",
      apiBinding: {
        method: "PATCH",
        url: "/resources/v1/modeler/dslc/changeaction/:caId",
        bodyKey: "title",
      },
    },
    {
      name: "name",
      label: "Name",
      type: "text",
      readOnly: true,
    },
    {
      name: "description",
      label: "Description",
      type: "textarea",
      editTrigger: "click",
      saveStrategy: "onBlur",
      apiBinding: {
        method: "PATCH",
        url: "/resources/v1/modeler/dslc/changeaction/:caId",
        bodyKey: "description",
      },
    },
    {
      name: "severity",
      label: "Severity",
      type: "select",
      options: ["None", "Low", "Medium", "High", "Critical"],
      editTrigger: "icon",
      saveStrategy: "onEnter",
      apiBinding: {
        method: "PATCH",
        url: "/resources/v1/modeler/dslc/changeaction/:caId",
        bodyKey: "severity",
      },
    },
    {
      name: "estimatedStart",
      label: "Planned Start Date",
      type: "date",
      editTrigger: "click",
      saveStrategy: "onBlur",
      apiBinding: {
        method: "PATCH",
        url: "/resources/v1/modeler/dslc/changeaction/:caId",
        bodyKey: "Estimated Start Date",
      },
    },
    {
      name: "estimatedEnd",
      label: "Planned Completion Date",
      type: "date",
      editTrigger: "click",
      saveStrategy: "onBlur",
      apiBinding: {
        method: "PATCH",
        url: "/resources/v1/modeler/dslc/changeaction/:caId",
        bodyKey: "Estimated Completion Date",
      },
    },
    {
      name: "actualEnd",
      label: "Due Completion Date",
      type: "date",
      editTrigger: "click",
      saveStrategy: "onBlur",
      apiBinding: {
        method: "PATCH",
        url: "/resources/v1/modeler/dslc/changeaction/:caId",
        bodyKey: "Actual Completion Date",
      },
    },
    {
      name: "actualStart",
      label: "Actual Start Date",
      type: "date",
      readOnly: true,
    },
    {
      name: "reasonForCancel",
      label: "Reason For Cancel",
      type: "textarea",
      editTrigger: "click",
      saveStrategy: "onBlur",
      apiBinding: {
        method: "PATCH",
        url: "/resources/v1/modeler/dslc/changeaction/:caId",
        bodyKey: "reasonForCancel",
      },
    },
    {
      name: "state",
      label: "Maturity State",
      type: "text",
      readOnly: true,
    },
    {
      name: "owner",
      label: "Owner",
      type: "text",
      readOnly: true,
    },
    {
      name: "organization",
      label: "Organization",
      type: "text",
      readOnly: true,
    },
    {
      name: "collabSpace",
      label: "Collaborative Space",
      type: "text",
      readOnly: true,
    },
  ],
};

export const changeActionDetailConfig: ObjectDetailConfig = {
  id: "change-action-detail",
  title: "Change Action",
  icon: "GitPullRequest",
  header: {
    titleField: "title",
    badgeField: "state",
    subtitleFields: [
      { field: "owner", label: "Owner", type: "link" },
      { field: "collabSpace", label: "Collaborative Space", type: "link" },
      { field: "applicability", label: "Applicability" },
      { field: "dependency", label: "Dependency" },
      { field: "attachments", label: "Attachments" },
      { field: "organization", label: "Organization" },
      { field: "flowdown", label: "Flowdown" },
      { field: "isGoverned", label: "Is Governed" },
    ],
  },
  propertiesPanel: {
    form: propertiesForm,
    defaultOpen: true,
    defaultSize: 25,
    minSize: 15,
  },
  tabs: [
    {
      id: "members",
      label: "Members",
      icon: "Users",
      type: "table",
      tableConfig: membersTabConfig,
    },
    {
      id: "proposed-changes",
      label: "Proposed Changes",
      icon: "ClipboardList",
      type: "table",
      tableConfig: proposedChangesTabConfig,
    },
    {
      id: "realized-changes",
      label: "Realized Changes",
      icon: "CheckSquare",
      type: "table",
      tableConfig: realizedChangesTabConfig,
    },
    {
      id: "approvals",
      label: "Approvals",
      icon: "ShieldCheck",
      type: "table",
      tableConfig: approvalsTabConfig,
    },
  ],
};
```

- [ ] **Step 2: Commit**

```bash
git add src/features/change/configs/change-action-detail.config.ts
git commit -m "feat(change): add ObjectDetailConfig for Change Action"
```

---

## Task 18: Change Action Detail Component + Route

**Files:**
- Create: `src/features/change/components/change-action-detail.tsx`
- Create: `src/routes/change.tsx`
- Modify: `src/components/layout/nav-items.ts`

- [ ] **Step 1: Create the Change Action Detail page component**

This component handles loading the CA data and passing it to ObjectDetailView. Uses `use3dxDropZone` for object selection (same pattern as xen).

```tsx
// src/features/change/components/change-action-detail.tsx

import { ObjectDetailView } from "#/components/object-detail";
import { useWafQuery } from "#/services/hooks/use-waf-query";
import { use3dxDropZone } from "#/hooks/use-3dx-drop-zone";
import { Skeleton } from "#/components/ui/skeleton";
import { cn } from "#/lib/utils";
import { MousePointerClick } from "lucide-react";
import { useMemo, useState } from "react";
import { changeActionDetailConfig } from "../configs/change-action-detail.config";

export function ChangeActionDetail() {
  const [caId, setCaId] = useState<string | null>(null);

  const { ref: dropRef, isDragOver } = use3dxDropZone<HTMLDivElement>({
    onDrop: (items) => {
      const id = items[0]?.objectId;
      if (id) setCaId(id);
    },
  });

  const params = useMemo(
    () => (caId ? { caId } : ({} as Record<string, string>)),
    [caId],
  );

  // Fetch CA detail data for header + properties panel
  const { data, isLoading } = useWafQuery<Record<string, unknown>>(
    caId
      ? `/resources/v1/modeler/dslc/changeaction/${caId}`
      : "",
    {
      enabled: !!caId,
      queryKey: ["change-action-detail", caId ?? ""],
    },
  );

  return (
    <div
      ref={dropRef}
      className={cn(
        "flex h-full flex-col overflow-hidden transition-all",
        isDragOver && "ring-2 ring-primary ring-inset",
      )}
    >
      {!caId ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
          <MousePointerClick className="h-8 w-8 opacity-40" />
          <p className="text-sm">
            Drop a Change Action to view its details
          </p>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col gap-4 p-6">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-6 w-96" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      ) : (
        <ObjectDetailView
          key={caId}
          config={changeActionDetailConfig}
          data={data?.data ?? {}}
          params={params}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Create the route**

```typescript
// src/routes/change.tsx

import { ChangeActionDetail } from "#/features/change/components/change-action-detail";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/change")({
  component: ChangeActionDetail,
});
```

- [ ] **Step 3: Add nav item**

Add the Change route to `NAV_ITEMS` in `src/components/layout/nav-items.ts`:

```typescript
// Add import:
import { Globe, GitPullRequest, Zap } from "lucide-react";

// Add to NAV_ITEMS array:
{ path: "/change", label: "Change Action", icon: GitPullRequest },
```

The full file should be:

```typescript
import type { LucideIcon } from "lucide-react";
import { GitPullRequest, Globe, Zap } from "lucide-react";

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "3DX API Explorer", icon: Globe },
  { path: "/xen", label: "XEN", icon: Zap },
  { path: "/change", label: "Change Action", icon: GitPullRequest },
];
```

- [ ] **Step 4: Commit**

```bash
git add src/features/change/ src/routes/change.tsx src/components/layout/nav-items.ts
git commit -m "feat(change): add Change Action detail route + nav item"
```

---

## Task 19: Build Verification

- [ ] **Step 1: Run biome check**

Run: `npx biome check src/components/form-engine/ src/components/object-detail/ src/features/change/ src/routes/change.tsx --write`
Expected: Auto-fixes formatting; no blocking errors.

- [ ] **Step 2: Run TypeScript check**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -E "(form-engine|object-detail|change)" | head -30`
Expected: No errors from the new files (pre-existing errors in other files are acceptable).

- [ ] **Step 3: Run build**

Run: `npm run build`
Expected: Build succeeds (or only pre-existing errors from files we didn't touch).

- [ ] **Step 4: Fix any issues found**

If any errors are reported, fix them in the relevant files and commit:

```bash
git add -u
git commit -m "fix(form-engine): resolve build errors"
```

---

## Task Summary

| Task | Description | Files Created |
|------|-------------|---------------|
| 1 | Form Engine Types | `types.ts` |
| 2 | Validation Builder | `validation-builder.ts` |
| 3 | Schema Resolver | `schema-resolver.ts` |
| 4 | API Adapters | `adapters/form-api-adapter.ts`, `adapters/wafdata-form-adapter.ts` |
| 5 | Hooks | `hooks/use-form-data.ts`, `hooks/use-field-mutation.ts` |
| 6 | Field Registry + 8 Fields | `field-registry.ts`, `fields/*.tsx`, `fields/index.ts` |
| 7 | json-render Catalog + Registry | `form-catalog.ts`, `form-registry.ts` |
| 8 | FormEngineProvider | `FormEngineProvider.tsx` |
| 9 | InlineEditField | `InlineEditField.tsx` |
| 10 | FormEngine + Barrel | `FormEngine.tsx`, `index.ts` |
| 11 | Object Detail Types | `object-detail/types.ts` |
| 12 | HeaderBar | `object-detail/HeaderBar.tsx` |
| 13 | PropertiesPanel | `object-detail/PropertiesPanel.tsx` |
| 14 | DetailTabs | `object-detail/DetailTabs.tsx` |
| 15 | ObjectDetailView + Barrel | `object-detail/ObjectDetailView.tsx`, `object-detail/index.ts` |
| 16 | Tab Table Configs | `features/change/configs/change-action-tabs.config.ts` |
| 17 | Change Action Detail Config | `features/change/configs/change-action-detail.config.ts` |
| 18 | Change Action Component + Route | `features/change/components/change-action-detail.tsx`, `routes/change.tsx`, `layout/nav-items.ts` |
| 19 | Build Verification | — |

**Total: 19 tasks, ~30 files created, 1 file modified**
