# Form Engine — Phase 4: `useDAGForm` Hook + `ConfiguredForm` Component

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `useDAGForm` (TanStack Query-backed data hook), `HeaderFormRenderer`, `DetailPanelRenderer`, and `ConfiguredForm`. Call `bootstrapFormEngine()` from `main.tsx`. Wire a sample CA form config into the xen feature.

**Architecture:** `useDAGForm` uses `useQuery` for data loading and `useMutation` pattern (manual async) for save. The form state (dirty fields, edit mode, collapsed) lives in React `useState`. `ConfiguredForm` composes the header and detail panel renderers — it has zero knowledge of panels or resizing. All data flows through `LayoutContext.params` in Phase 3.

**Tech Stack:** React 19, TanStack Query v5, shadcn/ui (Badge, Button, Skeleton, Separator, ScrollArea, Tooltip), lucide-react, sonner, tailwind v4

**Spec:** `docs/superpowers/specs/2026-03-24-form-engine-design.md`

**Prev phase:** `docs/superpowers/plans/2026-03-24-form-engine-phase-3-nodes.md`

---

## File Map

| File | Action |
|------|--------|
| `src/components/form-engine/hooks/use-dag-form.ts` | Create — TanStack Query data hook |
| `src/components/form-engine/components/header-form-renderer.tsx` | Create — header strip UI |
| `src/components/form-engine/components/detail-panel-renderer.tsx` | Create — right panel UI |
| `src/components/form-engine/components/form-section-renderer.tsx` | Create — section with fields |
| `src/components/form-engine/components/form-field-renderer.tsx` | Create — single field row |
| `src/components/form-engine/configured-form.tsx` | Create — public entry component |
| `src/main.tsx` | Modify — call `bootstrapFormEngine()` |
| `src/features/xen/configs/ca-form.config.ts` | Create — sample CA form config |
| `src/components/form-engine/index.ts` | Modify — export ConfiguredForm |

---

## Task 1: `use-dag-form.ts` hook

**File:** `src/components/form-engine/hooks/use-dag-form.ts`

- [ ] Create:

```ts
// src/components/form-engine/hooks/use-dag-form.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { createDefaultEngine } from "@/components/data-grid/table-engine/bootstrap";
import { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import type { ApiNodeConfig } from "@/components/data-grid/table-engine/types/table.types";
import type { ApiNodeOutput } from "@/components/data-grid/table-engine/types/table.types";
import type {
  DAGFormConfig,
  DetailPanelNodeOutput,
  FormFieldData,
  FormSectionData,
  HeaderFormData,
  HeaderFormNodeConfig,
} from "../types/form.types";

export interface UseDAGFormResult {
  /** Structured header data for HeaderFormRenderer */
  headerData: HeaderFormData | null;
  /** Raw row data from root-api for DetailPanelRenderer field values */
  rowData: Record<string, JsonPrimitive>;
  /** Processed sections from detailPanel node */
  sections: FormSectionData[];
  /** Detail panel node output (toolbar config, saveApiNodeId, etc.) */
  detailConfig: DetailPanelNodeOutput | null;
  isLoading: boolean;
  error: Error | null;
  isEditing: boolean;
  dirtyFields: Record<string, JsonPrimitive>;
  setFieldValue: (fieldId: string, value: JsonPrimitive) => void;
  save: () => Promise<void>;
  isSaving: boolean;
  toggleEditMode: () => void;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
}

export function useDAGForm(
  config: DAGFormConfig,
  params: Record<string, JsonPrimitive> = {},
): UseDAGFormResult {
  const { formId, dag } = config;
  const engine = useMemo(() => createDefaultEngine(), []);
  const qc = useQueryClient();

  const [isEditing, setIsEditing] = useState(false);
  const [dirtyFields, setDirtyFields] = useState<Record<string, JsonPrimitive>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // ── Data loading ───────────────────────────────────────────────────────────
  const queryKey = [formId, "form", params] as const;

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const ctx = new NodeContext(params);
      return engine.execute(dag, ctx);
    },
    enabled: Object.keys(params).length > 0,  // only fetch when object context is set
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  const rowData = useMemo<Record<string, JsonPrimitive>>(() => {
    if (!data) return {};
    // Root API output is the first ApiNodeOutput in the execution result
    const apiOutput = data.find((o): o is ApiNodeOutput => "rows" in o);
    return (apiOutput?.rows?.[0] ?? {}) as Record<string, JsonPrimitive>;
  }, [data]);

  const headerData = useMemo<HeaderFormData | null>(() => {
    if (!data) return null;
    const headerNode = dag.nodes.find((n) => n.type === "headerForm");
    if (!headerNode) return null;
    const cfg = headerNode.config as HeaderFormNodeConfig;
    const row = rowData;
    return {
      image:   cfg.imageField  ? String(row[cfg.imageField]  ?? "") : undefined,
      title:   String(row[cfg.titleField] ?? ""),
      name:    cfg.nameField   ? String(row[cfg.nameField]   ?? "") : undefined,
      badge:   cfg.badgeField  ? String(row[cfg.badgeField]  ?? "") : undefined,
      badgeColor: cfg.badgeColorMap?.[String(row[cfg.badgeField ?? ""] ?? "")] ?? "gray",
      expandedFields: (cfg.expandedFields ?? []).map((f) => ({ label: f, value: String(row[f] ?? "") })),
      keyValueFields: (cfg.keyValueFields ?? []).map((f) => ({ label: f, value: String(row[f] ?? "") })),
    };
  }, [data, dag.nodes, rowData]);

  const sections = useMemo<FormSectionData[]>(() => {
    if (!data) return [];
    const detailOutput = data.find((o): o is DetailPanelNodeOutput => "sections" in o);
    if (!detailOutput) return [];
    return detailOutput.sections.map((sec): FormSectionData => ({
      sectionId: sec.sectionId,
      label: sec.config.label,
      layout: sec.config.layout,
      columns: sec.config.columns,
      collapsible: sec.config.collapsible ?? false,
      defaultCollapsed: sec.config.defaultCollapsed ?? false,
      fields: sec.fields.map((f): FormFieldData => ({
        fieldId: f.fieldId,
        label: f.config.label,
        fieldType: f.config.fieldType,
        value: (dirtyFields[f.fieldId] !== undefined ? dirtyFields[f.fieldId] : rowData[f.config.sourceField]) ?? null,
        editable: f.config.editable ?? false,
        badgeColorMap: f.config.badgeColorMap,
        linkUrl: f.config.linkUrl,
      })),
    }));
  }, [data, rowData, dirtyFields]);

  const detailConfig = useMemo<DetailPanelNodeOutput | null>(() => {
    if (!data) return null;
    return data.find((o): o is DetailPanelNodeOutput => "sections" in o) ?? null;
  }, [data]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const setFieldValue = useCallback((fieldId: string, value: JsonPrimitive) => {
    setDirtyFields((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  const save = useCallback(async () => {
    const saveNodeId = detailConfig?.config.saveApiNodeId;
    if (!saveNodeId) {
      toast.error("No save API configured for this form.");
      return;
    }
    setIsSaving(true);
    try {
      const saveNode = dag.nodes.find((n) => n.id === saveNodeId && n.type === "api");
      if (!saveNode) throw new Error(`Save API node "${saveNodeId}" not found`);
      const ctx = new NodeContext({ ...params, ...dirtyFields });
      await engine.executeNode(saveNode, ctx, dag.nodes);
      await qc.invalidateQueries({ queryKey });
      setDirtyFields({});
      setIsEditing(false);
      toast.success("Changes saved.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed.";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  }, [detailConfig, dag.nodes, params, dirtyFields, engine, qc, queryKey]);

  const toggleEditMode = useCallback(() => {
    setIsEditing((prev) => {
      if (prev) setDirtyFields({}); // discard on cancel
      return !prev;
    });
  }, []);

  const toggleCollapsed = useCallback(() => setIsCollapsed((prev) => !prev), []);

  return {
    headerData,
    rowData,
    sections,
    detailConfig,
    isLoading,
    error: error as Error | null,
    isEditing,
    dirtyFields,
    setFieldValue,
    save,
    isSaving,
    toggleEditMode,
    isCollapsed,
    toggleCollapsed,
  };
}
```

---

## Task 2: `form-field-renderer.tsx`

**File:** `src/components/form-engine/components/form-field-renderer.tsx`

- [ ] Create:

```tsx
// src/components/form-engine/components/form-field-renderer.tsx
import { fieldTypeRegistry } from "../core/field-type-registry";
import type { FormFieldData } from "../types/form.types";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

interface FormFieldRendererProps {
  field: FormFieldData;
  isEditing: boolean;
  onChange: (fieldId: string, value: JsonPrimitive) => void;
}

export function FormFieldRenderer({ field, isEditing, onChange }: FormFieldRendererProps) {
  const def = fieldTypeRegistry.resolve(field.fieldType);
  const canEdit = isEditing && field.editable;

  const sharedProps = {
    value: field.value,
    label: field.label,
    badgeColorMap: field.badgeColorMap,
    linkUrl: field.linkUrl,
    options: field.options,
  };

  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-muted-foreground">{field.label}</span>
      {canEdit
        ? <def.EditComponent {...sharedProps} onChange={(v) => onChange(field.fieldId, v)} />
        : <def.ReadComponent {...sharedProps} />
      }
    </div>
  );
}
```

---

## Task 3: `form-section-renderer.tsx`

**File:** `src/components/form-engine/components/form-section-renderer.tsx`

- [ ] Create:

```tsx
// src/components/form-engine/components/form-section-renderer.tsx
import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { FormFieldRenderer } from "./form-field-renderer";
import type { FormSectionData } from "../types/form.types";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

interface FormSectionRendererProps {
  section: FormSectionData;
  isEditing: boolean;
  onChange: (fieldId: string, value: JsonPrimitive) => void;
}

export function FormSectionRenderer({ section, isEditing, onChange }: FormSectionRendererProps) {
  const [isCollapsed, setIsCollapsed] = useState(section.defaultCollapsed);

  const gridCols = section.layout === "grid"
    ? `grid-cols-${Math.min(section.columns ?? 2, 4)}`
    : section.layout === "horizontal" ? "grid-cols-2" : "grid-cols-1";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {section.collapsible && (
          <button
            type="button"
            onClick={() => setIsCollapsed((p) => !p)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        )}
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {section.label}
        </span>
        <Separator className="flex-1" />
      </div>

      {!isCollapsed && (
        <div className={cn("grid gap-3", gridCols)}>
          {section.fields.map((field) => (
            <FormFieldRenderer
              key={field.fieldId}
              field={field}
              isEditing={isEditing}
              onChange={onChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Task 4: `detail-panel-renderer.tsx`

**File:** `src/components/form-engine/components/detail-panel-renderer.tsx`

- [ ] Create:

```tsx
// src/components/form-engine/components/detail-panel-renderer.tsx
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { FormSectionRenderer } from "./form-section-renderer";
import type { DetailPanelNodeOutput, FormSectionData } from "../types/form.types";
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";

interface DetailPanelRendererProps {
  sections: FormSectionData[];
  detailConfig: DetailPanelNodeOutput | null;
  isLoading: boolean;
  isEditing: boolean;
  isSaving: boolean;
  skeletonRows?: number;
  onChange: (fieldId: string, value: JsonPrimitive) => void;
  onToggleEdit: () => void;
  onSave: () => void;
  onClose?: () => void;
}

export function DetailPanelRenderer({
  sections,
  detailConfig,
  isLoading,
  isEditing,
  isSaving,
  skeletonRows = 6,
  onChange,
  onToggleEdit,
  onSave,
  onClose,
}: DetailPanelRendererProps) {
  const toolbar = detailConfig?.config.toolbar ?? { showSave: true, showEdit: true };

  return (
    <div className="flex h-full flex-col bg-background/80 backdrop-blur-md">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-sm font-medium">Details</span>
        <div className="flex items-center gap-1">
          {toolbar.showEdit && !isEditing && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleEdit}>
              <Pencil size={14} />
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleEdit}>
                <X size={14} />
              </Button>
              {toolbar.showSave && (
                <Button size="sm" className="h-7 px-2 text-xs" onClick={onSave} disabled={isSaving}>
                  <Save size={12} className="mr-1" />
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              )}
            </>
          )}
          {toolbar.showClose && onClose && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
              <X size={14} />
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 px-3 py-3">
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <div key={i} className="flex flex-col gap-1">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-5 w-full" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {sections.map((section) => (
              <FormSectionRenderer
                key={section.sectionId}
                section={section}
                isEditing={isEditing}
                onChange={onChange}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
```

---

## Task 5: `header-form-renderer.tsx`

**File:** `src/components/form-engine/components/header-form-renderer.tsx`

- [ ] Create:

```tsx
// src/components/form-engine/components/header-form-renderer.tsx
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { getBadgeClasses } from "../fields/badge-colors";
import type { HeaderFormData } from "../types/form.types";

interface HeaderFormRendererProps {
  data: HeaderFormData | null;
  isLoading: boolean;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
  onToggleDetail?: () => void;
  showInfoIcon?: boolean;
}

export function HeaderFormRenderer({
  data,
  isLoading,
  isCollapsed,
  onToggleCollapsed,
  onToggleDetail,
  showInfoIcon = true,
}: HeaderFormRendererProps) {
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 border-b bg-background/80 backdrop-blur-md px-4 py-2">
        <Skeleton className="h-10 w-10 rounded-md" />
        <div className="flex flex-col gap-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={cn("border-b bg-background/80 backdrop-blur-md px-4 transition-all duration-200", isCollapsed ? "py-2" : "py-3")}>
      {/* Always-visible row: icon + title + badge + actions */}
      <div className="flex items-center gap-3">
        {data.image && (
          <img src={data.image} alt={data.title} className="h-10 w-10 rounded-md object-cover shrink-0" />
        )}

        <div className="flex min-w-0 flex-1 items-center gap-2 flex-wrap">
          <span className="font-semibold text-foreground truncate">{data.title}</span>
          {data.badge && (
            <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", getBadgeClasses({ [data.badge]: data.badgeColor ?? "gray" }, data.badge))}>
              {data.badge}
            </span>
          )}
          {!isCollapsed && data.name && (
            <span className="text-sm text-muted-foreground">{data.name}</span>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {showInfoIcon && onToggleDetail && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleDetail}>
              <Info size={14} />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapsed}>
            {isCollapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
          </Button>
        </div>
      </div>

      {/* Expanded section: owner + key-value pairs */}
      {!isCollapsed && (data.expandedFields.length > 0 || data.keyValueFields.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          {data.expandedFields.map(({ label, value }) => (
            <span key={label} className="text-muted-foreground">
              {label}: <span className="text-primary">{value || "—"}</span>
            </span>
          ))}
          {data.keyValueFields.map(({ label, value }) => (
            <span key={label} className="text-muted-foreground">
              {label}: <span className="text-foreground">{value || "—"}</span>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Task 6: `configured-form.tsx`

**File:** `src/components/form-engine/configured-form.tsx`

- [ ] Create:

```tsx
// src/components/form-engine/configured-form.tsx
import type { JsonPrimitive } from "@/components/data-grid/table-engine/types/dag.types";
import { useDAGForm } from "./hooks/use-dag-form";
import { HeaderFormRenderer } from "./components/header-form-renderer";
import { DetailPanelRenderer } from "./components/detail-panel-renderer";
import type { DAGFormConfig } from "./types/form.types";

export interface ConfiguredFormProps {
  config: DAGFormConfig;
  /** Injected by Layout Engine or feature route — the dropped/selected object context */
  params?: Record<string, JsonPrimitive>;
  /** Called when the ℹ icon is clicked — Layout Engine handles actual panel toggle */
  onToggleDetail?: () => void;
  /** Show only the DetailPanel (when ConfiguredForm is embedded in a sidebar panel) */
  panelOnly?: boolean;
}

export function ConfiguredForm({
  config,
  params = {},
  onToggleDetail,
  panelOnly = false,
}: ConfiguredFormProps) {
  const headerNode = config.dag.nodes.find((n) => n.type === "headerForm");
  const {
    headerData,
    sections,
    detailConfig,
    isLoading,
    error,
    isEditing,
    isSaving,
    setFieldValue,
    save,
    toggleEditMode,
    isCollapsed,
    toggleCollapsed,
  } = useDAGForm(config, params);

  const skeletonRows = detailConfig?.config.skeletonRows ?? 6;
  const showInfoIcon = headerNode
    ? (headerNode.config as import("./types/form.types").HeaderFormNodeConfig).infoIconTogglesDetailPanel
    : false;

  return (
    <div className="flex h-full flex-col">
      {!panelOnly && headerNode && (
        <HeaderFormRenderer
          data={headerData}
          isLoading={isLoading}
          isCollapsed={isCollapsed}
          onToggleCollapsed={toggleCollapsed}
          onToggleDetail={showInfoIcon ? onToggleDetail : undefined}
          showInfoIcon={Boolean(showInfoIcon)}
        />
      )}
      <div className="flex-1 overflow-hidden">
        <DetailPanelRenderer
          sections={sections}
          detailConfig={detailConfig}
          isLoading={isLoading}
          isEditing={isEditing}
          isSaving={isSaving}
          skeletonRows={skeletonRows}
          onChange={setFieldValue}
          onToggleEdit={toggleEditMode}
          onSave={save}
          onClose={onToggleDetail}
        />
      </div>
    </div>
  );
}
```

---

## Task 7: Wire bootstrap in `main.tsx`

**File:** `src/main.tsx`

- [ ] Add the `bootstrapFormEngine()` call before `ReactDOM.createRoot`. Check the existing `main.tsx` for the exact location and add:

```ts
import { bootstrapFormEngine } from "@/components/form-engine";

bootstrapFormEngine(); // registers field type renderers
```

---

## Task 8: Sample CA Form config

**File:** `src/features/xen/configs/ca-form.config.ts`

- [ ] Create:

```ts
// src/features/xen/configs/ca-form.config.ts
import type { DAGFormConfig } from "@/components/form-engine";

const CA_DETAIL_URL = '$:"/resources/v1/modeler/dslc/changeaction/" & $params.nodeId';

export const caFormConfig: DAGFormConfig = {
  formId: "ca-form",
  acceptedTypes: ["ChangeAction"],
  dropParamName: "nodeId",
  dag: {
    nodes: [
      {
        id: "root-api",
        type: "api",
        config: {
          url: CA_DETAIL_URL,
          method: "GET",
          authAdapterId: "wafdata",
          headers: { Accept: "application/json" },
          responseTransform: `[{
            "identifier":    identifier,
            "name":          name,
            "title":         title,
            "state":         state,
            "description":   description,
            "severity":      severity,
            "owner":         owner,
            "organization":  organization,
            "collabSpace":   collabSpace,
            "onHold":        onHold,
            "estimatedEnd":  $."Estimated Completion Date",
            "actualEnd":     $."Actual Completion Date"
          }]`,
        },
      },
      {
        id: "save-api",
        type: "api",
        config: {
          url: CA_DETAIL_URL,
          method: "PATCH",
          authAdapterId: "wafdata",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
        },
      },
      {
        id: "header",
        type: "headerForm",
        config: {
          sourceNodeId: "root-api",
          titleField: "title",
          nameField: "name",
          badgeField: "state",
          badgeColorMap: { Draft: "blue", "In Work": "yellow", Released: "green" },
          expandedFields: ["owner", "collabSpace"],
          keyValueFields: ["organization", "severity"],
          infoIconTogglesDetailPanel: true,
        },
      },
      // Detail panel
      {
        id: "detail",
        type: "detailPanel",
        config: {
          sourceNodeId: "root-api",
          saveApiNodeId: "save-api",
          rowKeyField: "identifier",
          sections: ["core-section", "dates-section"],
          toolbar: { showSave: true, showEdit: true, showClose: true },
          skeletonRows: 8,
        },
      },
      // Sections (content nodes — not in edges)
      {
        id: "core-section",
        type: "formSection",
        config: {
          label: "Core Details",
          layout: "vertical",
          collapsible: false,
          defaultCollapsed: false,
          fieldIds: ["field-name", "field-title", "field-state", "field-severity", "field-description"],
        },
      },
      {
        id: "dates-section",
        type: "formSection",
        config: {
          label: "Dates",
          layout: "grid",
          columns: 2,
          collapsible: true,
          defaultCollapsed: false,
          fieldIds: ["field-estimated-end", "field-actual-end", "field-on-hold"],
        },
      },
      // Fields (content nodes — not in edges)
      { id: "field-name",          type: "formField", config: { fieldType: "text",    label: "Name",           sourceField: "name",         editable: false } },
      { id: "field-title",         type: "formField", config: { fieldType: "text",    label: "Title",          sourceField: "title",        editable: true } },
      { id: "field-state",         type: "formField", config: { fieldType: "badge",   label: "Maturity State", sourceField: "state",        editable: true, badgeColorMap: { Draft: "blue", "In Work": "yellow", Released: "green" } } },
      { id: "field-severity",      type: "formField", config: { fieldType: "text",    label: "Severity",       sourceField: "severity",     editable: true } },
      { id: "field-description",   type: "formField", config: { fieldType: "richtext",label: "Description",    sourceField: "description",  editable: true } },
      { id: "field-estimated-end", type: "formField", config: { fieldType: "date",    label: "Est. Completion",sourceField: "estimatedEnd", editable: true } },
      { id: "field-actual-end",    type: "formField", config: { fieldType: "date",    label: "Act. Completion",sourceField: "actualEnd",    editable: false } },
      { id: "field-on-hold",       type: "formField", config: { fieldType: "boolean", label: "On Hold",        sourceField: "onHold",       editable: true } },
    ],
    edges: [
      { from: "root-api", to: "header" },
      { from: "root-api", to: "detail" },
    ],
    rootNodeId: "detail",
  },
};
```

---

## Task 9: Export `ConfiguredForm` from index

**File:** `src/components/form-engine/index.ts`

- [ ] Add to the existing exports:

```ts
export { ConfiguredForm } from "./configured-form";
export type { ConfiguredFormProps } from "./configured-form";
```

---

## Task 10: Verify and commit

- [ ] Run `npm run check` — zero errors.
- [ ] Run `npm run build` — must succeed.
- [ ] Start dev server (`npm run dev:widget`) and verify no runtime errors on the xen route.

- [ ] Commit:

```bash
git add src/components/form-engine/ \
        src/features/xen/configs/ca-form.config.ts \
        src/main.tsx
git commit -m "feat(form-engine): add useDAGForm hook, form renderers, ConfiguredForm, CA config (phase 4)"
```
