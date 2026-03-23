import { DetailPanel } from "@/components/form/DetailPanel";
import { HeaderForm } from "@/components/form/HeaderForm";
import { LayoutEngine } from "@/components/layout/LayoutEngine";
import { TabContainer } from "@/components/tabs/TabContainer";
import { cn } from "@/lib/utils";
import type { LayoutChildConfig, LayoutConfig, TabConfig, ViewConfig } from "@/types";
import { useState } from "react";

interface ViewRendererProps {
	config: ViewConfig;
	data?: Record<string, unknown> | null;
	className?: string;
	tableRenderer?: (tableId: string, tableConfig: unknown) => React.ReactNode;
}

/**
 * ViewRenderer is the top-level component that takes a ViewConfig and renders
 * the complete view by composing layout, forms, tabs, and tables together.
 */
export function ViewRenderer({ config, data, className, tableRenderer }: ViewRendererProps) {
	const [detailPanelOpen, setDetailPanelOpen] = useState(true);

	const renderTabContent = (tab: TabConfig): React.ReactNode => {
		switch (tab.content.type) {
			case "table":
				if (tableRenderer && tab.content.tableId) {
					const tableConfig = config.tables[tab.content.tableId];
					return tableRenderer(tab.content.tableId, tableConfig);
				}
				return (
					<div className="flex h-full flex-col p-0">
						<div className="flex min-h-0 flex-1 flex-col">
							<div className="flex min-h-[200px] flex-1 items-center justify-center text-xs text-muted-foreground">
								<div className="text-center">
									<p className="font-medium">Table: {tab.content.tableId}</p>
									<p className="mt-1 text-muted-foreground/60">
										Connect a DataGrid with tableId &quot;{tab.content.tableId}&quot;
									</p>
								</div>
							</div>
						</div>
					</div>
				);
			case "form":
				if (tab.content.formId && config.forms[tab.content.formId]) {
					return (
						<div className="p-3">
							<HeaderForm
								config={config.forms[tab.content.formId]}
								data={data as Record<string, unknown> | null}
							/>
						</div>
					);
				}
				return null;
			case "tabs":
				if (tab.content.tabs) {
					return (
						<TabContainer
							tabs={tab.content.tabs}
							renderContent={renderTabContent}
						/>
					);
				}
				return null;
			case "layout":
				if (tab.content.layoutId && config.layouts?.[tab.content.layoutId]) {
					return (
						<LayoutEngine
							config={config.layouts[tab.content.layoutId]}
							renderChild={renderChild}
						/>
					);
				}
				return null;
			default:
				return (
					<div className="p-3 text-xs text-muted-foreground">
						Custom content for tab: {tab.id}
					</div>
				);
		}
	};

	const renderChild = (child: LayoutChildConfig, _index: number): React.ReactNode => {
		switch (child.type) {
			case "header-form": {
				const formConfig = config.forms[child.configId];
				if (!formConfig) return null;
				return <HeaderForm config={formConfig} data={data as Record<string, unknown> | null} />;
			}

			case "tabs": {
				const tabConfigs = config.tabs[child.configId];
				if (!tabConfigs) return null;
				return (
					<TabContainer
						tabs={tabConfigs}
						renderContent={renderTabContent}
					/>
				);
			}

			case "table":
				if (tableRenderer) {
					const tableConfig = config.tables[child.configId];
					return tableRenderer(child.configId, tableConfig);
				}
				return (
					<div className="flex h-full items-center justify-center text-xs text-muted-foreground">
						<div className="text-center">
							<p className="font-medium">Table: {child.configId}</p>
							<p className="mt-1 text-muted-foreground/60">
								Connect a DataGrid with tableId &quot;{child.configId}&quot;
							</p>
						</div>
					</div>
				);

			case "detail-panel": {
				const formConfig = config.forms[child.configId];
				if (!formConfig) return null;
				return (
					<DetailPanel
						config={formConfig}
						data={data as Record<string, unknown> | null}
						isOpen={detailPanelOpen}
						onClose={() => setDetailPanelOpen(false)}
					/>
				);
			}

			case "layout": {
				const nestedLayout = config.layouts?.[child.configId];
				if (!nestedLayout) return null;
				return (
					<LayoutEngine config={nestedLayout} renderChild={renderChild} />
				);
			}

			default:
				return null;
		}
	};

	// For sidebar layout, if the detail panel is closed we need to handle it
	const effectiveLayout: LayoutConfig = { ...config.layout };
	if (config.layout.type === "sidebar" && !detailPanelOpen) {
		effectiveLayout.children = [config.layout.children[0]];
	}

	return (
		<div className={cn("flex h-full w-full flex-col overflow-hidden bg-background", className)}>
			<LayoutEngine config={effectiveLayout} renderChild={renderChild} />
		</div>
	);
}
