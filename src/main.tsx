import {RouterProvider} from "@tanstack/react-router"
import ReactDOM from "react-dom/client"
import "./index.css"
import {logger} from "./lib/logger"
import {init} from "./lib/widget/api"
import {WidgetProvider} from "./lib/widget/context"
import type {DSPlatformAPIs} from "./lib/widget/types"
import {getRouter} from "./router"

const waitFor = (predicate: () => boolean, timeout: number) => {
  return new Promise<boolean>((resolve, reject) => {
    const check = () => {
      if (!predicate()) return
      clearInterval(interval)
      resolve(true)
    }
    const interval = setInterval(check, 100)
    check()
    if (!timeout) return
    setTimeout(() => {
      clearInterval(interval)
      reject()
    }, timeout)
  })
}

const rootId = "root"

const start = () => {
  logger.info("Starting widget application...")
  let rootEl = document.getElementById(rootId)
  if (!rootEl) {
    rootEl = document.createElement("div")
    rootEl.id = rootId
    document.body.innerHTML = ""
    document.body.appendChild(rootEl)
  }

  window.requirejs(
    [
      "DS/PlatformAPI/PlatformAPI",
      "DS/WAFData/WAFData",
      "DS/i3DXCompassServices/i3DXCompassServices",
      "DS/DataDragAndDrop/DataDragAndDrop",
      "UWA/Core",
      "UWA/Utils/InterCom",
      "DS/WebappsUtils/WebappsUtils",
    ],
    (...modules: unknown[]) => {
      const [
        PlatformAPI,
        WAFData,
        i3DXCompassServices,
        DataDragAndDrop,
        UWA_Core,
        UWA_Utils_InterCom,
        WebappsUtils,
      ] = modules

      const apis: DSPlatformAPIs = {
        PlatformAPI: PlatformAPI as DSPlatformAPIs["PlatformAPI"],
        WAFData: WAFData as DSPlatformAPIs["WAFData"],
        i3DXCompassServices: i3DXCompassServices as DSPlatformAPIs["i3DXCompassServices"],
        DataDragAndDrop: DataDragAndDrop as DSPlatformAPIs["DataDragAndDrop"],
        UWA_Core,
        UWA_Utils_InterCom: UWA_Utils_InterCom as DSPlatformAPIs["UWA_Utils_InterCom"],
        WebappsUtils: WebappsUtils as DSPlatformAPIs["WebappsUtils"],
      }

      init(apis, window.widget, window.UWA)
      const widgetContext = {
        widget: window.widget,
        uwa: window.UWA,
        apis,
      }
      const router = getRouter()
      ReactDOM.createRoot(rootEl).render(
        <WidgetProvider value={widgetContext}>
          <RouterProvider router={router} />
        </WidgetProvider>,
      )
      logger.info("Widget application rendered.")
    },
  )
}

waitFor(() => window.widget != null, 1000)
  .then(() => {
    logger.debug("Widget object detected.")
    window.widget.addEvent("onLoad", () => {
      logger.info("Widget onLoad event triggered.")
      window.widget.setTitle(window.widget.getValue("Title"))
      start()
    })

    window.widget.addEvent("onRefresh", () => {
      logger.info("Widget onRefresh event triggered. Reloading...")
      window.location.reload()
    })
  })
  .catch(() => {
    logger.error("Widget not available after 10s timeout.")
  })
