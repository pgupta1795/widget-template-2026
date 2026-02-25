import type { EndpointDefinition } from "@/types/config"

export const GET_WIDGET_PREFERENCES: EndpointDefinition = {
  id: "widget-preferences",
  method: "GET",
  url: "/resources/AppsMngt/user/preference",
  requiresCsrf: false,
}

export const SET_WIDGET_PREFERENCES: EndpointDefinition = {
  id: "widget-preferences-set",
  method: "PUT",
  url: "/resources/AppsMngt/user/preference",
  requiresCsrf: true,
}
