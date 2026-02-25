import type { EndpointDefinition } from "@/types/config"

export const GET_ECOSYSTEM: EndpointDefinition = {
  id: "ecosystem",
  method: "POST",
  url: "/resources/enorelnav/v2/navigate/getEcosystem",
  params: ["objectId"],
  requiresCsrf: true,
}
