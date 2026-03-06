import type { OpenAPIV3 } from 'openapi-types';

type Schema = OpenAPIV3.SchemaObject | OpenAPIV3.ReferenceObject;

/**
 * Generates a representative example JSON value from an OpenAPI schema.
 * All $refs must be resolved before calling this function.
 */
export function generateExample(schema: Schema, depth = 0): unknown {
  if (depth > 6 || !schema) return {};

  // $refs should be resolved upstream — skip unresolved ones
  if ('$ref' in schema) return {};

  const s = schema as OpenAPIV3.SchemaObject;

  if (s.example !== undefined) return s.example;
  if (s.default !== undefined) return s.default;

  if (s.allOf) {
    return s.allOf.reduce<Record<string, unknown>>(
      (acc, sub) => ({ ...acc, ...(generateExample(sub, depth + 1) as object) }),
      {},
    );
  }

  if (s.oneOf?.length) return generateExample(s.oneOf[0], depth + 1);
  if (s.anyOf?.length) return generateExample(s.anyOf[0], depth + 1);

  switch (s.type) {
    case 'string':
      if (s.enum?.length) return s.enum[0];
      if (s.format === 'date-time') return '2024-01-01T00:00:00Z';
      if (s.format === 'email') return 'user@example.com';
      if (s.format === 'uri') return 'https://example.com';
      if (s.format === 'uuid') return '00000000-0000-0000-0000-000000000000';
      return 'string';
    case 'number':
    case 'integer':
      return s.minimum ?? 0;
    case 'boolean':
      return true;
    case 'array':
      return s.items ? [generateExample(s.items, depth + 1)] : [];
    case 'object': {
      if (!s.properties) return {};
      const obj: Record<string, unknown> = {};
      for (const [key, prop] of Object.entries(s.properties)) {
        obj[key] = generateExample(prop, depth + 1);
      }
      return obj;
    }
    default:
      if (s.properties) {
        const obj: Record<string, unknown> = {};
        for (const [key, prop] of Object.entries(s.properties)) {
          obj[key] = generateExample(prop, depth + 1);
        }
        return obj;
      }
      return {};
  }
}

/** Builds SchemaNode tree used by the schema side panel */
export interface SchemaNode {
  name: string;
  type: string;
  description: string;
  required: boolean;
  children?: SchemaNode[];
  enum?: string[];
}

export function buildSchemaTree(
  schema: OpenAPIV3.SchemaObject,
  name = 'root',
  required = false,
  depth = 0,
): SchemaNode {
  if (depth > 6) return { name, type: '...', description: '', required };

  const s = schema as any;
  const type = schema.type ?? (schema.properties ? 'object' : s.items ? 'array' : 'unknown');
  const node: SchemaNode = {
    name,
    type: schema.enum ? `enum(${schema.enum.join('|')})` : String(type),
    description: schema.description ?? '',
    required,
    enum: schema.enum as string[] | undefined,
  };

  if (schema.properties) {
    const requiredFields = new Set(schema.required ?? []);
    node.children = Object.entries(schema.properties).map(([key, prop]) => {
      if ('$ref' in prop) return { name: key, type: '$ref', description: '', required: false };
      return buildSchemaTree(prop as OpenAPIV3.SchemaObject, key, requiredFields.has(key), depth + 1);
    });
  } else if (s.items && !('$ref' in s.items)) {
    node.children = [buildSchemaTree(s.items as OpenAPIV3.SchemaObject, '[item]', false, depth + 1)];
  }

  return node;
}
