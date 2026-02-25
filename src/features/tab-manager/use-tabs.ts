import { useCallback, useMemo, useState } from "react"
import type { TabDefinition } from "@/types/config"
import { getWidget } from "@/lib/widget/api"
import { logger } from "@/lib/logger"

type TabPreferences = {
  order: string[]
  hidden: string[]
}

const PREF_KEY = "widget_tab_preferences"

function loadPreferences(): TabPreferences | null {
  try {
    const widget = getWidget()
    const raw = widget.getValue(PREF_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function savePreferences(prefs: TabPreferences) {
  try {
    const widget = getWidget()
    widget.setValue(PREF_KEY, JSON.stringify(prefs))
  } catch (err) {
    logger.error("Failed to save tab preferences", err)
  }
}

export function useTabs(configTabs: TabDefinition[], defaultTab?: string) {
  const [preferences, setPreferences] = useState<TabPreferences>(() => {
    return loadPreferences() ?? { order: [], hidden: [] }
  })

  const visibleTabs = useMemo(() => {
    const ordered = [...configTabs].sort((a, b) => {
      const aIdx = preferences.order.indexOf(a.id)
      const bIdx = preferences.order.indexOf(b.id)
      if (aIdx === -1 && bIdx === -1) return 0
      if (aIdx === -1) return 1
      if (bIdx === -1) return -1
      return aIdx - bIdx
    })

    return ordered.filter(
      (tab) => tab.visible !== false && !preferences.hidden.includes(tab.id),
    )
  }, [configTabs, preferences])

  const allTabs = useMemo(() => {
    return configTabs.map((tab) => ({
      ...tab,
      isHidden: preferences.hidden.includes(tab.id),
    }))
  }, [configTabs, preferences])

  const [activeTab, setActiveTab] = useState(
    defaultTab ?? visibleTabs[0]?.id ?? "",
  )

  const toggleTab = useCallback(
    (tabId: string) => {
      setPreferences((prev) => {
        const hidden = prev.hidden.includes(tabId)
          ? prev.hidden.filter((id) => id !== tabId)
          : [...prev.hidden, tabId]
        const next = { ...prev, hidden }
        savePreferences(next)
        return next
      })
    },
    [],
  )

  const reorderTabs = useCallback(
    (order: string[]) => {
      setPreferences((prev) => {
        const next = { ...prev, order }
        savePreferences(next)
        return next
      })
    },
    [],
  )

  return {
    visibleTabs,
    allTabs,
    activeTab,
    setActiveTab,
    toggleTab,
    reorderTabs,
  }
}
