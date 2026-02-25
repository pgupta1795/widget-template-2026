import type { EndpointDefinition } from "@/types/config";

export const GET_SECURITY_CONTEXT: EndpointDefinition = {
	id: "security-context",
	method: "GET",
	url: "/resources/modeler/pno/person?current=true&select=preferredcredentials&select=collabspaces",
	requiresCsrf: false,
};
