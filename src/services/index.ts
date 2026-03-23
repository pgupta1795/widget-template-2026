// src/services/index.ts

export type { HttpClient } from "./http/client";
export { createHttpClient, httpClient } from "./http/client";
export type { HttpMethod, RequestOptions, ServiceResponse } from "./types";
export { ServiceError } from "./types";
