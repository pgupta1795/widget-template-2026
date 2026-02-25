import type { EndpointDefinition } from "@/types/config"
import { executeEndpoint } from "./request"

export type MutationParams = {
  params?: Record<string, string>
  body?: Record<string, unknown>
}

export function createMutationFn(endpoint: EndpointDefinition) {
  return async (variables: MutationParams) => {
    return executeEndpoint(endpoint, {
      params: variables.params,
      body: variables.body,
    })
  }
}
