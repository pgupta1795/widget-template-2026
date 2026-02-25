import type { EndpointDefinition } from "@/types/config";

export const GET_CSRF_TOKEN: EndpointDefinition = {
	id: "csrf-token",
	method: "GET",
	url: "/resources/v1/application/CSRF",
	requiresCsrf: false,
};
