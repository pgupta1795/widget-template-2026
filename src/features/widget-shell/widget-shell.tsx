import { useState, useCallback } from "react"
import type { WidgetConfig, CommandDefinition, PanelConfig } from "@/types/config"
import { DropZone } from "@/features/drop-zone/drop-zone"
import { ObjectHeader } from "@/features/object-header/object-header"
import { TabManager } from "@/features/tab-manager/tab-manager"
import { SidePanel } from "@/features/side-panel/side-panel"
import { TabContentRenderer } from "./tab-content-renderer"
import type { DroppedObject } from "@/features/drop-zone/use-object-drop"

type WidgetShellProps = {
  config: WidgetConfig
}

export function WidgetShell({ config }: WidgetShellProps) {
  const [objectId, setObjectId] = useState<string | null>(null)
  const [panelConfig, setPanelConfig] = useState<PanelConfig | null>(null)
  const [panelObjectId, setPanelObjectId] = useState<string | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const handleDrop = useCallback(
    (objects: DroppedObject[]) => {
      const first = objects[0]
      if (first) {
        const id = config.dropZone?.idField
          ? (first[config.dropZone.idField] as string)
          : first.objectId
        setObjectId(id)
      }
    },
    [config.dropZone?.idField],
  )

  const handleCommand = useCallback(
    (command: CommandDefinition, row: Record<string, unknown>) => {
      switch (command.type) {
        case "side-panel":
          if (command.panelConfig) {
            setPanelConfig(command.panelConfig)
            setPanelObjectId((row.id as string) ?? (row.physicalId as string) ?? "")
            setPanelOpen(true)
          }
          break
        case "navigate":
          break
        case "expand":
          break
        case "dialog":
          break
        case "action":
          break
      }
    },
    [],
  )

  const params = objectId ? { physicalId: objectId, objectId, expandLevel: "1" } : {}

  if (!objectId && config.dropZone?.enabled) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <DropZone config={config.dropZone} onDrop={handleDrop} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {config.header && objectId && (
        <ObjectHeader config={config.header} objectId={objectId} />
      )}

      {config.dropZone?.enabled && (
        <DropZone config={config.dropZone} onDrop={handleDrop}>
          <TabManager
            tabs={config.tabs}
            defaultTab={config.defaultTab}
            renderTabContent={(tab) => (
              <TabContentRenderer
                tab={tab}
                params={params}
                onCommand={handleCommand}
              />
            )}
          />
        </DropZone>
      )}

      {!config.dropZone?.enabled && (
        <TabManager
          tabs={config.tabs}
          defaultTab={config.defaultTab}
          renderTabContent={(tab) => (
            <TabContentRenderer
              tab={tab}
              params={params}
              onCommand={handleCommand}
            />
          )}
        />
      )}

      {panelConfig && (
        <SidePanel
          config={panelConfig}
          objectId={panelObjectId}
          open={panelOpen}
          onOpenChange={setPanelOpen}
        />
      )}
    </div>
  )
}
