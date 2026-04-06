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
