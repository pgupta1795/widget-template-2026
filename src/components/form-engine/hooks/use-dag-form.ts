// src/components/form-engine/hooks/use-dag-form.ts
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { createDefaultEngine } from "@/components/data-grid/table-engine/bootstrap";
import { NodeContext } from "@/components/data-grid/table-engine/core/node-context";
import type {
	DAGConfig,
	JsonPrimitive,
} from "@/components/data-grid/table-engine/types/dag.types";
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
	const [dirtyFields, setDirtyFields] = useState<Record<string, JsonPrimitive>>(
		{},
	);
	const [isSaving, setIsSaving] = useState(false);
	const [isCollapsed, setIsCollapsed] = useState(false);

	// ── Data loading ───────────────────────────────────────────────────────────
	const queryKey = [formId, "form", params] as const;

	const { data, isLoading, error } = useQuery({
		queryKey,
		queryFn: async () => {
			const ctx = new NodeContext(new Map(), undefined, params);
			await engine.execute(dag, "detailPanel", ctx);
			return Array.from(ctx.getAll().values()).map((e) => e.output);
		},
		enabled: Object.keys(params).length > 0, // only fetch when object context is set
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
			image: cfg.imageField ? String(row[cfg.imageField] ?? "") : undefined,
			title: String(row[cfg.titleField] ?? ""),
			name: cfg.nameField ? String(row[cfg.nameField] ?? "") : undefined,
			badge: cfg.badgeField ? String(row[cfg.badgeField] ?? "") : undefined,
			badgeColor:
				cfg.badgeColorMap?.[String(row[cfg.badgeField ?? ""] ?? "")] ?? "gray",
			expandedFields: (cfg.expandedFields ?? []).map((f) => ({
				label: f,
				value: String(row[f] ?? ""),
			})),
			keyValueFields: (cfg.keyValueFields ?? []).map((f) => ({
				label: f,
				value: String(row[f] ?? ""),
			})),
		};
	}, [data, dag.nodes, rowData]);

	const sections = useMemo<FormSectionData[]>(() => {
		if (!data) return [];
		const detailOutput = data.find(
			(o): o is DetailPanelNodeOutput => "sections" in o,
		);
		if (!detailOutput) return [];
		return detailOutput.sections.map(
			(sec): FormSectionData => ({
				sectionId: sec.sectionId,
				label: sec.config.label,
				layout: sec.config.layout,
				columns: sec.config.columns,
				collapsible: sec.config.collapsible ?? false,
				defaultCollapsed: sec.config.defaultCollapsed ?? false,
				fields: sec.fields.map(
					(f): FormFieldData => ({
						fieldId: f.fieldId,
						label: f.config.label,
						fieldType: f.config.fieldType,
						value:
							(dirtyFields[f.fieldId] !== undefined
								? dirtyFields[f.fieldId]
								: rowData[f.config.sourceField]) ?? null,
						editable: f.config.editable ?? false,
						badgeColorMap: f.config.badgeColorMap,
						linkUrl: f.config.linkUrl,
					}),
				),
			}),
		);
	}, [data, rowData, dirtyFields]);

	const detailConfig = useMemo<DetailPanelNodeOutput | null>(() => {
		if (!data) return null;
		return (
			data.find((o): o is DetailPanelNodeOutput => "sections" in o) ?? null
		);
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
			const saveNode = dag.nodes.find(
				(n) => n.id === saveNodeId && n.type === "api",
			);
			if (!saveNode) throw new Error(`Save API node "${saveNodeId}" not found`);
			const saveDag: DAGConfig = {
				nodes: [saveNode],
				edges: [],
				rootNodeId: saveNodeId,
			};
			const saveCtx = new NodeContext(new Map(), undefined, {
				...params,
				...dirtyFields,
			});
			await engine.execute(saveDag, "api", saveCtx);
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

	const toggleCollapsed = useCallback(
		() => setIsCollapsed((prev) => !prev),
		[],
	);

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
