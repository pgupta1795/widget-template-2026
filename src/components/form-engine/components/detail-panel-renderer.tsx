// src/components/form-engine/components/detail-panel-renderer.tsx
import { Pencil, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSectionRenderer } from "./form-section-renderer";
import type {
	DetailPanelNodeOutput,
	FormSectionData,
} from "../types/form.types";
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
	const toolbar = detailConfig?.config.toolbar ?? {
		showSave: true,
		showEdit: true,
	};

	return (
		<div className="flex h-full flex-col bg-background/80 backdrop-blur-md">
			{/* Toolbar */}
			<div className="flex items-center justify-between border-b px-3 py-2">
				<span className="text-sm font-medium">Details</span>
				<div className="flex items-center gap-1">
					{toolbar.showEdit && !isEditing && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={onToggleEdit}
						>
							<Pencil size={14} />
						</Button>
					)}
					{isEditing && (
						<>
							<Button
								variant="ghost"
								size="icon"
								className="h-7 w-7"
								onClick={onToggleEdit}
							>
								<X size={14} />
							</Button>
							{toolbar.showSave && (
								<Button
									size="sm"
									className="h-7 px-2 text-xs"
									onClick={onSave}
									disabled={isSaving}
								>
									<Save size={12} className="mr-1" />
									{isSaving ? "Saving…" : "Save"}
								</Button>
							)}
						</>
					)}
					{toolbar.showClose && onClose && (
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={onClose}
						>
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
