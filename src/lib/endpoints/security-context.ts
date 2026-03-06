export const GET_SECURITY_CONTEXT = {
	id: "security-context",
	method: "GET",
	url: "/resources/modeler/pno/person?current=true&select=preferredcredentials&select=collabspaces",
	requiresCsrf: false,
};
