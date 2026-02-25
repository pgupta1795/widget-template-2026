import {createContext,useContext} from "react"
import type {DSPlatformAPIs,UWA,Widget} from "./types"

type WidgetContextValue = {
  widget: Widget
  uwa: UWA
  apis: DSPlatformAPIs
}

type WidgetProviderProps = {
  value: WidgetContextValue
  children: React.ReactNode
}

const WidgetContext = createContext<WidgetContextValue | null>(null)

export function WidgetProvider({value,children}:WidgetProviderProps) {
  return (
    <WidgetContext.Provider value={value}>{children}</WidgetContext.Provider>
  )
}

export function useWidget(): WidgetContextValue {
  const ctx = useContext(WidgetContext)
  if (!ctx) throw new Error("useWidget must be used within a WidgetProvider")
  return ctx
}
