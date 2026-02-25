export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

export type EndpointDefinition = {
  id: string
  method: HttpMethod
  url: string
  payload?: Record<string, unknown>
  headers?: Record<string, string>
  responseMapping?: Record<string, string>
  defaultValues?: Record<string, unknown>
  requiresCsrf?: boolean
  params?: string[]
}

export type BadgeVariantMap = Record<string, "default" | "secondary" | "destructive" | "outline" | "info" | "success" | "warning">

export type ColumnType = "text" | "badge" | "icon" | "link" | "image" | "custom"

export type ColumnDefinition = {
  id: string
  header: string
  accessorKey: string
  type: ColumnType
  sortable?: boolean
  filterable?: boolean
  width?: number
  minWidth?: number
  resolver?: EndpointDefinition
  badgeVariants?: BadgeVariantMap
  iconMap?: Record<string, string>
  linkTemplate?: string
  cellRenderer?: string
  visible?: boolean
}

export type CommandType = "expand" | "side-panel" | "navigate" | "action" | "dialog"

export type CommandDefinition = {
  id: string
  label: string
  icon: string
  type: CommandType
  endpoint?: EndpointDefinition
  panelConfig?: PanelConfig
  dialogConfig?: FormConfig
  navigateTo?: string
  condition?: string
}

export type FieldType = "text" | "textarea" | "select" | "combobox" | "number" | "date" | "toggle" | "hidden"

export type FormFieldDefinition = {
  id: string
  label: string
  type: FieldType
  accessorKey: string
  required?: boolean
  placeholder?: string
  options?: { label: string; value: string }[]
  optionsEndpoint?: EndpointDefinition
  readOnly?: boolean
  dependsOn?: string
  colSpan?: 1 | 2
}

export type FormConfig = {
  id: string
  title: string
  fields: FormFieldDefinition[]
  submitEndpoint?: EndpointDefinition
  mode: "view" | "edit" | "create"
  columns?: 1 | 2
}

export type PanelSection = {
  label: string
  fields: string[]
}

export type PanelConfig = {
  title: string
  endpoint: EndpointDefinition
  sections: PanelSection[]
  width?: "sm" | "md" | "lg"
}

export type TableConfig = {
  columns: ColumnDefinition[]
  commands: CommandDefinition[]
  selectable?: boolean
  expandable?: boolean
  pagination?: { pageSize: number; pageSizeOptions?: number[] }
  defaultSort?: { id: string; desc: boolean }
  toolbar?: ToolbarConfig
}

export type ToolbarAction = {
  id: string
  label: string
  icon: string
  endpoint?: EndpointDefinition
  variant?: "default" | "outline" | "ghost" | "destructive"
}

export type ToolbarConfig = {
  search?: boolean
  filters?: { id: string; label: string; accessorKey: string; options: { label: string; value: string }[] }[]
  actions?: ToolbarAction[]
}

export type TabContent = {
  type: "table" | "form" | "custom"
  table?: TableConfig
  form?: FormConfig
  component?: string
}

export type TabDefinition = {
  id: string
  label: string
  icon?: string
  endpoint?: EndpointDefinition
  content: TabContent
  visible?: boolean
  adminOnly?: boolean
  badge?: string
}

export type ObjectHeaderField = {
  key: string
  label: string
  type: "text" | "badge" | "link" | "boolean"
  badgeVariants?: BadgeVariantMap
}

export type ObjectHeaderConfig = {
  endpoint: EndpointDefinition
  iconField?: string
  titleField: string
  subtitleField?: string
  stateField?: string
  stateBadgeVariants?: BadgeVariantMap
  fields: ObjectHeaderField[]
}

export type DropZoneConfig = {
  enabled: boolean
  acceptTypes?: string[]
  message?: string
  idField?: string
  typeField?: string
}

export type WidgetConfig = {
  id: string
  title: string
  description?: string
  header?: ObjectHeaderConfig
  dropZone?: DropZoneConfig
  tabs: TabDefinition[]
  modules?: string[]
  defaultTab?: string
}
