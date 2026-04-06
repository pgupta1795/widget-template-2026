# Form Engine — Global Edit Mode Design

**Date:** 2026-03-31  
**Status:** Approved  
**Feature:** Pencil-triggered panel-level edit mode for PropertiesPanel + FormEngine

---

## Overview

Add a global edit mode to the `PropertiesPanel` / `FormEngine` pair. A pencil icon in the panel header activates edit mode for all editable fields simultaneously. Save and Cancel icon buttons replace the pencil icon during editing. Only dirty (changed) fields are saved on Save.

The solution is generic and opt-in: any `PropertiesPanel` usage can enable it with a single `editable` prop.

---

## Architecture

### Approach

Global edit mode is a **controlled prop** on `FormEngine` (`editMode: boolean`), propagated into the existing `FormEngineContextValue`. `InlineEditField` reads the mode from context. `PropertiesPanel` owns the `isEditMode` state and renders the header toolbar.

No changes to `FormSchema` or field configs.

---

## Section 1: Types & Context

**File:** `src/components/form-engine/types.ts`

Add to `FormEngineContextValue`:
```ts
editMode?: boolean;
```

Add to `FormEngine` props:
```ts
editMode?: boolean;      // controlled from PropertiesPanel
onSaveAll?: () => void;  // called after all dirty fields saved successfully
onCancelAll?: () => void; // called after cancel
```

---

## Section 2: FormEngine & InlineEditField Behavior

**Files:** `src/components/form-engine/FormEngine.tsx`, `src/components/form-engine/InlineEditField.tsx`

### Edit Mode Activation
- When `editMode === true` is passed to `FormEngine`, it is stored in context.
- `InlineEditField` reads `editMode` from context.
- If `editMode === true` and the field is **not** `readOnly`, the field enters `"editing"` state. Because `editMode` can change after mount, `InlineEditField` uses a `useEffect` to watch `editMode`: enter editing when it becomes `true`, and return to `"idle"` when it becomes `false`.
- `readOnly` fields are never affected by global edit mode.

### Individual field saves during edit mode
- Per-field save (onBlur, onEnter, icon) continues to work normally during global edit mode.
- Fields can save themselves mid-session without exiting global edit mode.

### Save All Flow
1. Read `form.formState.dirtyFields` to identify changed fields.
2. For each dirty field with an `apiBinding`, call the field's mutation via `Promise.allSettled` (parallel).
3. On completion:
   - Failed fields: individual `toast.error` per field (existing behaviour).
   - At least one success: `toast.success("Changes saved")`.
   - Call `form.reset(form.getValues())` to commit current values and clear dirty state.
   - Call `onSaveAll?.()` — `PropertiesPanel` sets `isEditMode = false`.

### Cancel All Flow
1. Call `form.reset()` — restores all values to last fetched data.
2. Call `onCancelAll?.()` — `PropertiesPanel` sets `isEditMode = false`.

---

## Section 3: PropertiesPanel UI

**File:** `src/components/object-detail/PropertiesPanel.tsx`

### New Prop
```ts
editable?: boolean; // default: false
```

### State
```ts
const [isEditMode, setIsEditMode] = useState(false);
```

### Header Toolbar (when `editable={true}`)

| State | Header right side |
|-------|------------------|
| Idle | `Pencil` icon button (muted, hover highlight) |
| Edit mode | `Check` icon (primary colour) + `X` icon (muted), animated in |

- Edit mode active indicator: `border-t-2 border-primary` on the panel header.
- Icons from `lucide-react`: `Pencil`, `Check`, `X`.

### Wiring to FormEngine
```tsx
<FormEngine
  schema={form}
  adapter={adapter}
  params={params}
  editMode={isEditMode}
  onSaveAll={() => setIsEditMode(false)}
  onCancelAll={() => setIsEditMode(false)}
  className="flex-1"
/>
```

---

## Files Changed

| File | Change |
|------|--------|
| `src/components/form-engine/types.ts` | Add `editMode?` to `FormEngineContextValue` |
| `src/components/form-engine/FormEngine.tsx` | Accept + forward `editMode`, `onSaveAll`, `onCancelAll`; implement Save All / Cancel All logic |
| `src/components/form-engine/InlineEditField.tsx` | Read `editMode` from context; start in editing state when active |
| `src/components/object-detail/PropertiesPanel.tsx` | Add `editable` prop, `isEditMode` state, header toolbar with Pencil/Check/X |
| `src/features/change/components/change-action-detail.tsx` | Add `editable` prop to `PropertiesPanel` usage |

---

## Out of Scope

- No changes to `FormSchema` or any field config files.
- No new `batchUpdate` adapter usage (individual field saves in parallel).
- No changes to tab configs or routing.
