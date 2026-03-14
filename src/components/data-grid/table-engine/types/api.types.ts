// src/components/data-grid/table-engine/types/api.types.ts
import type { JsonValue } from "./dag.types";

export interface AuthRequestOptions {
	url: string;
	method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
	headers?: Record<string, string>;
	queryParams?: Record<string, string>;
	body?: JsonValue;
	formData?: FormData;
	responseType?: "json" | "text" | "blob";
}
