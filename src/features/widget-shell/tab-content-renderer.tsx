import { DataTable } from "@/features/data-table/data-table"
import { DynamicForm } from "@/features/dynamic-form/dynamic-form"
import { useTableData } from "@/features/data-table/use-table-data"
import type { TabDefinition, CommandDefinition } from "@/types/config"

type TabContentRendererProps = {
  tab: TabDefinition
  params: Record<string, string>
  onCommand: (command: CommandDefinition, row: Record<string, unknown>) => void
}

export function TabContentRenderer({ tab, params, onCommand }: TabContentRendererProps) {
  if (tab.content.type === "table" && tab.content.table) {
    return (
      <TableTabContent
        tab={tab}
        params={params}
        onCommand={onCommand}
      />
    )
  }

  if (tab.content.type === "form" && tab.content.form) {
    return <DynamicForm config={tab.content.form} />
  }

  return (
    <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
      Custom component: {tab.content.component ?? "Not configured"}
    </div>
  )
}

function TableTabContent({
  tab,
  params,
  onCommand,
}: TabContentRendererProps) {
  const { data, isLoading } = useTableData(tab.endpoint, params)

  return (
    <DataTable
      config={tab.content.table!}
      data={data}
      isLoading={isLoading}
      onCommand={onCommand}
    />
  )
}
