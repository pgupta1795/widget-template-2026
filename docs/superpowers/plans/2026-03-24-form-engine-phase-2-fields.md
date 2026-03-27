# Form Engine — Phase 2: Field Type Registry + Field Components

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `FieldTypeRegistry` and all 10 field read/edit components.

**Architecture:** A `FieldTypeRegistry` (same pattern as `NodeRegistry`) maps `FormFieldType` strings to `{ ReadComponent, EditComponent }` pairs. Each field component is a small focused file under `form-engine/fields/`. All use shadcn/ui primitives and lucide-react icons. Phase 1 types must be in place.

**Tech Stack:** React 19, TypeScript 5, shadcn/ui, lucide-react, tailwind v4, class-variance-authority

**Spec:** `docs/superpowers/specs/2026-03-24-form-engine-design.md`

**Prev phase:** `docs/superpowers/plans/2026-03-24-form-engine-phase-1-types.md`

**Next phase:** `docs/superpowers/plans/2026-03-24-form-engine-phase-3-nodes.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/form-engine/core/field-type-registry.ts` | Create — injectable registry |
| `src/components/form-engine/fields/field-props.ts` | Create — shared FieldReadProps / FieldEditProps interfaces |
| `src/components/form-engine/fields/text-field.tsx` | Create |
| `src/components/form-engine/fields/date-field.tsx` | Create |
| `src/components/form-engine/fields/badge-field.tsx` | Create |
| `src/components/form-engine/fields/link-field.tsx` | Create |
| `src/components/form-engine/fields/dropdown-field.tsx` | Create |
| `src/components/form-engine/fields/number-field.tsx` | Create |
| `src/components/form-engine/fields/boolean-field.tsx` | Create |
| `src/components/form-engine/fields/image-field.tsx` | Create |
| `src/components/form-engine/fields/richtext-field.tsx` | Create |
| `src/components/form-engine/fields/keyvalue-field.tsx` | Create |
| `src/components/form-engine/fields/index.ts` | Create — barrel |

---

## Task 1: Shared field props interfaces

**File:** `src/components/form-engine/fields/field-props.ts`

- [ ] Create:

```ts
// src/components/form-engine/fields/field-props.ts
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

export interface FieldReadProps {
  value: JsonPrimitive;
  label: string;
  /** For badge: color token e.g. "blue", "yellow", "green" */
  badgeColorMap?: Record<string, string>;
  /** For link: resolved URL string */
  linkUrl?: string;
}

export interface FieldEditProps extends FieldReadProps {
  onChange: (value: JsonPrimitive) => void;
  options?: Array<{ label: string; value: JsonPrimitive }>;
  disabled?: boolean;
}

export interface FieldTypeDefinition {
  type: string;
  ReadComponent: React.ComponentType<FieldReadProps>;
  EditComponent: React.ComponentType<FieldEditProps>;
}
```

---

## Task 2: FieldTypeRegistry

**File:** `src/components/form-engine/core/field-type-registry.ts`

- [ ] Create:

```ts
// src/components/form-engine/core/field-type-registry.ts
import type { FieldTypeDefinition } from "../fields/field-props";

export class FieldTypeRegistry {
  private readonly map = new Map<string, FieldTypeDefinition>();

  register(definition: FieldTypeDefinition): this {
    this.map.set(definition.type, definition);
    return this;
  }

  resolve(type: string): FieldTypeDefinition {
    const def = this.map.get(type);
    if (!def) throw new Error(`No field renderer registered for type: "${type}"`);
    return def;
  }

  has(type: string): boolean {
    return this.map.has(type);
  }
}

// Singleton — shared across the app
export const fieldTypeRegistry = new FieldTypeRegistry();
```

---

## Task 3: Badge color helper

- [ ] Create `src/components/form-engine/fields/badge-colors.ts`:

```ts
// src/components/form-engine/fields/badge-colors.ts
// Maps color token strings to Tailwind classes
export const badgeColorClasses: Record<string, string> = {
  blue:   "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  yellow: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  green:  "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  red:    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  gray:   "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  purple: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function getBadgeClasses(colorMap: Record<string, string> | undefined, value: string): string {
  const token = colorMap?.[value] ?? "gray";
  return badgeColorClasses[token] ?? badgeColorClasses.gray;
}
```

---

## Task 4: `text-field.tsx`

- [ ] Create `src/components/form-engine/fields/text-field.tsx`:

```tsx
// src/components/form-engine/fields/text-field.tsx
import { Input } from "@/components/ui/input";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function TextFieldRead({ value }: FieldReadProps) {
  return <span className="text-sm text-foreground">{String(value ?? "—")}</span>;
}

export function TextFieldEdit({ value, onChange, disabled }: FieldEditProps) {
  return (
    <Input
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-7 text-sm"
    />
  );
}
```

---

## Task 5: `date-field.tsx`

- [ ] Create `src/components/form-engine/fields/date-field.tsx`:

```tsx
// src/components/form-engine/fields/date-field.tsx
import { Input } from "@/components/ui/input";
import { format, parseISO, isValid } from "date-fns";
import type { FieldEditProps, FieldReadProps } from "./field-props";

function formatDate(value: unknown): string {
  if (!value) return "—";
  try {
    const d = parseISO(String(value));
    return isValid(d) ? format(d, "MMM d, yyyy") : String(value);
  } catch {
    return String(value);
  }
}

export function DateFieldRead({ value }: FieldReadProps) {
  return <span className="text-sm text-foreground">{formatDate(value)}</span>;
}

export function DateFieldEdit({ value, onChange, disabled }: FieldEditProps) {
  return (
    <Input
      type="date"
      value={value ? String(value).slice(0, 10) : ""}
      onChange={(e) => onChange(e.target.value || null)}
      disabled={disabled}
      className="h-7 text-sm"
    />
  );
}
```

---

## Task 6: `badge-field.tsx`

- [ ] Create `src/components/form-engine/fields/badge-field.tsx`:

```tsx
// src/components/form-engine/fields/badge-field.tsx
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getBadgeClasses } from "./badge-colors";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function BadgeFieldRead({ value, badgeColorMap }: FieldReadProps) {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", getBadgeClasses(badgeColorMap, String(value)))}>
      {String(value)}
    </span>
  );
}

export function BadgeFieldEdit({ value, onChange, options, badgeColorMap, disabled }: FieldEditProps) {
  return (
    <Select value={String(value ?? "")} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-7 text-sm">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {(options ?? []).map((opt) => (
          <SelectItem key={String(opt.value)} value={String(opt.value)}>
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", getBadgeClasses(badgeColorMap, String(opt.value)))}>
              {opt.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

## Task 7: `link-field.tsx`

- [ ] Create `src/components/form-engine/fields/link-field.tsx`:

```tsx
// src/components/form-engine/fields/link-field.tsx
import { ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function LinkFieldRead({ value, linkUrl }: FieldReadProps) {
  const href = linkUrl ?? String(value ?? "");
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary underline-offset-4 hover:underline">
      {String(value)}
      <ExternalLink size={12} />
    </a>
  );
}

export function LinkFieldEdit({ value, onChange, disabled }: FieldEditProps) {
  return (
    <Input
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="h-7 text-sm"
    />
  );
}
```

---

## Task 8: `dropdown-field.tsx`

- [ ] Create `src/components/form-engine/fields/dropdown-field.tsx`:

```tsx
// src/components/form-engine/fields/dropdown-field.tsx
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function DropdownFieldRead({ value, options }: FieldReadProps & Pick<FieldEditProps, "options">) {
  const label = options?.find((o) => o.value === value)?.label ?? String(value ?? "—");
  return <span className="text-sm text-foreground">{label}</span>;
}

export function DropdownFieldEdit({ value, onChange, options, disabled }: FieldEditProps) {
  return (
    <Select value={String(value ?? "")} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="h-7 text-sm">
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {(options ?? []).map((opt) => (
          <SelectItem key={String(opt.value)} value={String(opt.value)}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
```

---

## Task 9: `number-field.tsx`

- [ ] Create `src/components/form-engine/fields/number-field.tsx`:

```tsx
// src/components/form-engine/fields/number-field.tsx
import { Input } from "@/components/ui/input";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function NumberFieldRead({ value }: FieldReadProps) {
  return <span className="text-sm text-foreground tabular-nums">{value !== null && value !== undefined ? String(value) : "—"}</span>;
}

export function NumberFieldEdit({ value, onChange, disabled }: FieldEditProps) {
  return (
    <Input
      type="number"
      value={value !== null && value !== undefined ? String(value) : ""}
      onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
      disabled={disabled}
      className="h-7 text-sm"
    />
  );
}
```

---

## Task 10: `boolean-field.tsx`

- [ ] Create `src/components/form-engine/fields/boolean-field.tsx`:

```tsx
// src/components/form-engine/fields/boolean-field.tsx
import { Switch } from "@/components/ui/switch";
import { Check, X } from "lucide-react";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function BooleanFieldRead({ value }: FieldReadProps) {
  return value
    ? <span className="inline-flex items-center gap-1 text-sm text-green-600"><Check size={14} /> Yes</span>
    : <span className="inline-flex items-center gap-1 text-sm text-muted-foreground"><X size={14} /> No</span>;
}

export function BooleanFieldEdit({ value, onChange, disabled }: FieldEditProps) {
  return (
    <Switch
      checked={Boolean(value)}
      onCheckedChange={(checked) => onChange(checked)}
      disabled={disabled}
    />
  );
}
```

---

## Task 11: `image-field.tsx`

- [ ] Create `src/components/form-engine/fields/image-field.tsx`:

```tsx
// src/components/form-engine/fields/image-field.tsx
// Image fields are always read-only (thumbnail/avatar).
// EditComponent is a no-op that renders the same read view.
import { ImageIcon } from "lucide-react";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function ImageFieldRead({ value, label }: FieldReadProps) {
  if (!value) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
        <ImageIcon size={16} className="text-muted-foreground" />
      </div>
    );
  }
  return (
    <img
      src={String(value)}
      alt={label}
      className="h-10 w-10 rounded-md object-cover"
    />
  );
}

// Read-only in edit mode — no upload support in Phase 1
export function ImageFieldEdit(props: FieldEditProps) {
  if (process.env.NODE_ENV === "development") {
    console.warn("[FormEngine] image field type is read-only; editable:true has no effect.");
  }
  return <ImageFieldRead {...props} />;
}
```

---

## Task 12: `richtext-field.tsx`

- [ ] Create `src/components/form-engine/fields/richtext-field.tsx`:

```tsx
// src/components/form-engine/fields/richtext-field.tsx
// Phase 1: richtext renders with Textarea in edit mode.
// The type name is kept as "richtext" to avoid a breaking rename when a
// rich text editor (e.g. tiptap) is added in a future phase.
import { Textarea } from "@/components/ui/textarea";
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function RichtextFieldRead({ value }: FieldReadProps) {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  // Render as preformatted text in Phase 1 (no HTML rendering)
  return <p className="whitespace-pre-wrap text-sm text-foreground">{String(value)}</p>;
}

export function RichtextFieldEdit({ value, onChange, disabled }: FieldEditProps) {
  return (
    <Textarea
      value={String(value ?? "")}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      rows={4}
      className="text-sm resize-none"
    />
  );
}
```

---

## Task 13: `keyvalue-field.tsx`

- [ ] Create `src/components/form-engine/fields/keyvalue-field.tsx`:

```tsx
// src/components/form-engine/fields/keyvalue-field.tsx
// Keyvalue is always read-only — renders a list of label: value pairs.
// value is expected to be a JSON string of Record<string, string>.
import type { FieldEditProps, FieldReadProps } from "./field-props";

export function KeyvalueFieldRead({ value }: FieldReadProps) {
  let pairs: Array<{ label: string; value: string }> = [];
  try {
    pairs = typeof value === "string" ? JSON.parse(value) : [];
  } catch {
    pairs = [];
  }
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
      {pairs.map(({ label, value: val }) => (
        <div key={label} className="contents">
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-foreground">{val ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function KeyvalueFieldEdit(props: FieldEditProps) {
  return <KeyvalueFieldRead {...props} />;
}
```

---

## Task 14: Fields barrel and registry bootstrap

- [ ] Create `src/components/form-engine/fields/index.ts`:

```ts
// src/components/form-engine/fields/index.ts
export * from "./text-field";
export * from "./date-field";
export * from "./badge-field";
export * from "./link-field";
export * from "./dropdown-field";
export * from "./number-field";
export * from "./boolean-field";
export * from "./image-field";
export * from "./richtext-field";
export * from "./keyvalue-field";
export type { FieldReadProps, FieldEditProps, FieldTypeDefinition } from "./field-props";
```

- [ ] Create `src/components/form-engine/core/register-default-fields.ts` — registers all 10 built-in field types into the singleton registry:

```ts
// src/components/form-engine/core/register-default-fields.ts
import { fieldTypeRegistry } from "./field-type-registry";
import { TextFieldRead, TextFieldEdit } from "../fields/text-field";
import { DateFieldRead, DateFieldEdit } from "../fields/date-field";
import { BadgeFieldRead, BadgeFieldEdit } from "../fields/badge-field";
import { LinkFieldRead, LinkFieldEdit } from "../fields/link-field";
import { DropdownFieldRead, DropdownFieldEdit } from "../fields/dropdown-field";
import { NumberFieldRead, NumberFieldEdit } from "../fields/number-field";
import { BooleanFieldRead, BooleanFieldEdit } from "../fields/boolean-field";
import { ImageFieldRead, ImageFieldEdit } from "../fields/image-field";
import { RichtextFieldRead, RichtextFieldEdit } from "../fields/richtext-field";
import { KeyvalueFieldRead, KeyvalueFieldEdit } from "../fields/keyvalue-field";

export function registerDefaultFields(): void {
  fieldTypeRegistry
    .register({ type: "text",      ReadComponent: TextFieldRead,      EditComponent: TextFieldEdit })
    .register({ type: "date",      ReadComponent: DateFieldRead,      EditComponent: DateFieldEdit })
    .register({ type: "badge",     ReadComponent: BadgeFieldRead,     EditComponent: BadgeFieldEdit })
    .register({ type: "link",      ReadComponent: LinkFieldRead,      EditComponent: LinkFieldEdit })
    .register({ type: "dropdown",  ReadComponent: DropdownFieldRead,  EditComponent: DropdownFieldEdit })
    .register({ type: "number",    ReadComponent: NumberFieldRead,    EditComponent: NumberFieldEdit })
    .register({ type: "boolean",   ReadComponent: BooleanFieldRead,   EditComponent: BooleanFieldEdit })
    .register({ type: "image",     ReadComponent: ImageFieldRead,     EditComponent: ImageFieldEdit })
    .register({ type: "richtext",  ReadComponent: RichtextFieldRead,  EditComponent: RichtextFieldEdit })
    .register({ type: "keyvalue",  ReadComponent: KeyvalueFieldRead,  EditComponent: KeyvalueFieldEdit });
}
```

---

## Task 15: Verify and commit

- [ ] Run `npm run check` — zero errors.
- [ ] Run `npm run build` — must succeed.

- [ ] Commit:

```bash
git add src/components/form-engine/
git commit -m "feat(form-engine): add field type registry and 10 field components (phase 2)"
```
