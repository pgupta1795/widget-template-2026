import type { OpenAPIV3 } from 'openapi-types';

export type ServiceType = '3DSpace' | '3DSwym' | '3DPassport' | '3DCompass';
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface OpenApiParameter {
  name: string;
  in: 'path' | 'query' | 'header';
  required: boolean;
  description: string;
  schema: OpenAPIV3.SchemaObject;
  /** Populated when schema.enum is set — used to render a dropdown */
  enum?: string[];
}

export interface OpenApiRequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema?: OpenAPIV3.SchemaObject }>;
}

export interface ParsedEndpoint {
  operationId: string;
  method: HttpMethod;
  /** Relative path with template variables e.g. /resources/v1/modeler/documents/{docId} */
  path: string;
  summary: string;
  description: string;
  pathParams: OpenApiParameter[];
  queryParams: OpenApiParameter[];
  headers: OpenApiParameter[];
  requestBody?: OpenApiRequestBody;
  /** Pre-generated JSON example string from schema, or empty string */
  exampleBody: string;
  tags: string[];
}

export interface ParsedTag {
  name: string;
  endpoints: ParsedEndpoint[];
}

export interface ParsedCollection {
  /** Derived from filename e.g. "dsdoc_v1" */
  id: string;
  /** spec.info.title e.g. "Document REST Services" */
  name: string;
  serviceType: ServiceType;
  tags: ParsedTag[];
  /** Total endpoint count across all tags */
  endpointCount: number;
  /** Original filename */
  filename: string;
}

export class OpenApiParseError extends Error {
  constructor(public readonly filename: string, reason: string) {
    super(`[${filename}] ${reason}`);
    this.name = 'OpenApiParseError';
  }
}

// Re-export OpenAPIV3 for convenience in other modules
export type { OpenAPIV3 };
