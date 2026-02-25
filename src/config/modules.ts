export const MODULE_REGISTRY = {
  "platform-api": "DS/PlatformAPI/PlatformAPI",
  "waf-data": "DS/WAFData/WAFData",
  "compass-services": "DS/i3DXCompassServices/i3DXCompassServices",
  "drag-drop": "DS/DataDragAndDrop/DataDragAndDrop",
  "uwa-core": "UWA/Core",
  "intercom": "UWA/Utils/InterCom",
  "webapps-utils": "DS/WebappsUtils/WebappsUtils",
  "tag-navigator": "DS/TagNavigatorProxy/TagNavigatorProxy",
} as const

export type ModuleKey = keyof typeof MODULE_REGISTRY

export const CORE_MODULES: ModuleKey[] = [
  "platform-api",
  "waf-data",
  "compass-services",
  "webapps-utils",
]
