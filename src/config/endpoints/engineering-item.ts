import type { EndpointDefinition } from "@/types/config"

export const GET_ENGINEERING_ITEM: EndpointDefinition = {
  id: "engineering-item",
  method: "GET",
  url: "/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}",
  params: ["objectId"],
  requiresCsrf: true,
}

export const UPDATE_ENGINEERING_ITEM: EndpointDefinition = {
  id: "engineering-item-update",
  method: "PATCH",
  url: "/resources/v1/modeler/dseng/dseng:EngItem/{{objectId}}",
  params: ["objectId"],
  requiresCsrf: true,
}

export const CREATE_ENGINEERING_ITEM: EndpointDefinition = {
  id: "engineering-item-create",
  method: "POST",
  url: "/resources/v1/modeler/dseng/dseng:EngItem",
  requiresCsrf: true,
}
