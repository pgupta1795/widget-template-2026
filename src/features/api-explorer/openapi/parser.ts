import type { OpenAPIV3 } from 'openapi-types';
import { generateExample } from './schema-generator';
import {
  OpenApiParseError,
} from './types';
import type {
  HttpMethod,
  OpenApiParameter,
  OpenApiRequestBody,
  ParsedCollection,
  ParsedEndpoint,
  ParsedTag,
  ServiceType,
} from './types';

const VALID_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const DEFAULT_SERVICE_TYPE: ServiceType = '3DSpace';

/** Resolves a $ref string like "#/components/parameters/SecurityContext" from the spec */
function resolveRef<T>(ref: string, spec: OpenAPIV3.Document): T | undefined {
  const parts = ref.replace(/^#\//, '').split('/');
  let current: unknown = spec;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current as T | undefined;
}

/** Fully dereferences a parameter — follows $ref if present */
function resolveParameter(
  param: OpenAPIV3.ReferenceObject | OpenAPIV3.ParameterObject,
  spec: OpenAPIV3.Document,
): OpenAPIV3.ParameterObject | undefined {
  if ('$ref' in param) {
    return resolveRef<OpenAPIV3.ParameterObject>(param.$ref, spec);
  }
  return param;
}

/** Fully dereferences a schema — follows $ref if present */
function resolveSchema(
  schema: OpenAPIV3.ReferenceObject | OpenAPIV3.SchemaObject | undefined,
  spec: OpenAPIV3.Document,
  depth = 0,
): OpenAPIV3.SchemaObject {
  if (!schema) return {};
  if (depth > 5) return {};
  if ('$ref' in schema) {
    const resolved = resolveRef<OpenAPIV3.SchemaObject>(schema.$ref, spec);
    return resolved ? resolveSchema(resolved, spec, depth + 1) : {};
  }
  return schema;
}

function mapParameter(
  raw: OpenAPIV3.ParameterObject,
  spec: OpenAPIV3.Document,
): OpenApiParameter {
  const schema = resolveSchema(raw.schema, spec);
  return {
    name: raw.name,
    in: raw.in as 'path' | 'query' | 'header',
    required: raw.required ?? false,
    description: raw.description ?? '',
    schema,
    enum: schema.enum as string[] | undefined,
  };
}

function buildExampleBody(
  requestBody: OpenAPIV3.RequestBodyObject | undefined,
  spec: OpenAPIV3.Document,
): string {
  if (!requestBody) return '';
  const jsonContent = requestBody.content?.['application/json'];
  if (!jsonContent) return '';

  if (jsonContent.example !== undefined) {
    return JSON.stringify(jsonContent.example, null, 2);
  }

  if (jsonContent.schema) {
    const resolved = resolveSchema(jsonContent.schema, spec);
    return JSON.stringify(generateExample(resolved), null, 2);
  }

  return '';
}

function resolveRequestBody(
  raw: OpenAPIV3.ReferenceObject | OpenAPIV3.RequestBodyObject | undefined,
  spec: OpenAPIV3.Document,
): OpenApiRequestBody | undefined {
  if (!raw) return undefined;
  const resolved = ('$ref' in raw)
    ? resolveRef<OpenAPIV3.RequestBodyObject>(raw.$ref, spec)
    : raw;
  if (!resolved) return undefined;

  // Resolve schema refs inside content
  const content: OpenApiRequestBody['content'] = {};
  for (const [mime, mediaType] of Object.entries(resolved.content ?? {})) {
    content[mime] = {
      schema: mediaType.schema ? resolveSchema(mediaType.schema, spec) : undefined,
    };
  }

  return { description: resolved.description, required: resolved.required, content };
}

function extractServiceType(spec: OpenAPIV3.Document): ServiceType {
  const services: string[] = (spec.info as any)?.['x-ds-service'] ?? [];
  const first = services[0];
  if (first === '3DSpace' || first === '3DSwym' || first === '3DPassport' || first === '3DCompass') {
    return first;
  }
  return DEFAULT_SERVICE_TYPE;
}

function idFromFilename(filename: string): string {
  return filename.replace(/\.(json|yaml|yml)$/, '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

export function parseSpec(raw: unknown, filename: string): ParsedCollection {
  const spec = raw as OpenAPIV3.Document;

  if (!spec || typeof spec !== 'object') {
    throw new OpenApiParseError(filename, 'Not a valid object');
  }
  if (!spec.paths) {
    throw new OpenApiParseError(filename, 'Missing "paths" — not an OpenAPI spec');
  }

  const serviceType = extractServiceType(spec);
  const title = spec.info?.title ?? filename.replace(/\.(json|yaml|yml)$/, '');
  const tagMap = new Map<string, ParsedEndpoint[]>();

  for (const [path, pathItem] of Object.entries(spec.paths ?? {})) {
    if (!pathItem) continue;

    // Path-level parameters (shared across all methods)
    const sharedParams = (pathItem.parameters ?? [])
      .map(p => resolveParameter(p, spec))
      .filter((p): p is OpenAPIV3.ParameterObject => !!p)
      .map(p => mapParameter(p, spec));

    for (const method of VALID_METHODS) {
      const op = (pathItem as any)[method.toLowerCase()] as OpenAPIV3.OperationObject | undefined;
      if (!op) continue;

      // Merge path-level + operation-level params, operation overrides by name
      const opParams = (op.parameters ?? [])
        .map(p => resolveParameter(p, spec))
        .filter((p): p is OpenAPIV3.ParameterObject => !!p)
        .map(p => mapParameter(p, spec));

      const allParamsMap = new Map<string, OpenApiParameter>();
      for (const p of [...sharedParams, ...opParams]) {
        allParamsMap.set(`${p.in}:${p.name}`, p);
      }
      const allParams = Array.from(allParamsMap.values());

      const pathParams = allParams.filter(p => p.in === 'path');
      const queryParams = allParams.filter(p => p.in === 'query');
      const headers = allParams.filter(p => p.in === 'header');

      const requestBody = resolveRequestBody(op.requestBody, spec);
      const exampleBody = buildExampleBody(
        ('$ref' in (op.requestBody ?? {}))
          ? resolveRef((op.requestBody as any).$ref, spec)
          : op.requestBody as OpenAPIV3.RequestBodyObject | undefined,
        spec,
      );

      const tags = op.tags?.length ? op.tags : ['General'];

      const endpoint: ParsedEndpoint = {
        operationId: op.operationId ?? `${method.toLowerCase()}_${path.replace(/\//g, '_')}`,
        method,
        path,
        summary: op.summary ?? '',
        description: op.description ?? '',
        pathParams,
        queryParams,
        headers,
        requestBody,
        exampleBody,
        tags,
      };

      for (const tag of tags) {
        if (!tagMap.has(tag)) tagMap.set(tag, []);
        tagMap.get(tag)!.push(endpoint);
      }
    }
  }

  const parsedTags: ParsedTag[] = Array.from(tagMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, endpoints]) => ({ name, endpoints }));

  const endpointCount = parsedTags.reduce((sum, t) => sum + t.endpoints.length, 0);

  return {
    id: idFromFilename(filename),
    name: title,
    serviceType,
    tags: parsedTags,
    endpointCount,
    filename,
  };
}
