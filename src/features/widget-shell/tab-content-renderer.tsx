import { DataTable } from "@/features/data-table/data-table";
import { useTableData } from "@/features/data-table/use-table-data";
import { DynamicForm } from "@/features/dynamic-form/dynamic-form";
import type {
	CommandDefinition,
	EndpointDefinition,
	TabDefinition,
	TableConfig,
} from "@/types/config";

type TabContentRendererProps = {
	tab: TabDefinition;
	params: Record<string, string>;
	onCommand: (command: CommandDefinition, row: Record<string, unknown>) => void;
};

type TableTabContentProps = {
	tableConfig: TableConfig;
	endpoint: EndpointDefinition | undefined;
	params: Record<string, string>;
	onCommand: (command: CommandDefinition, row: Record<string, unknown>) => void;
};

export function TabContentRenderer({
	tab,
	params,
	onCommand,
}: TabContentRendererProps) {
	if (tab.content.type === "table" && tab.content.table) {
		return (
			<TableTabContent
				tableConfig={tab.content.table}
				endpoint={tab.endpoint}
				params={params}
				onCommand={onCommand}
			/>
		);
	}

	if (tab.content.type === "form" && tab.content.form) {
		return <DynamicForm config={tab.content.form} />;
	}

	return (
		<div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
			Custom component: {tab.content.component ?? "Not configured"}
		</div>
	);
}

function TableTabContent({
	tableConfig,
	endpoint,
	params,
	onCommand,
}: TableTabContentProps) {
	const { data, isLoading, refetch } = useTableData(endpoint, params);

	return (
		<DataTable
			config={tableConfig}
			data={data}
			isLoading={isLoading}
			onCommand={onCommand}
			className="h-full"
			onToolbarAction={(actionId) => {
				if (actionId === "refresh") {
					refetch();
				}
			}}
		/>
	);
}
