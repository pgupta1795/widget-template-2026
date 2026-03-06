import type {HttpMethod,ImportedApi,ParsedEndpoint} from '@/lib/types/api';
import yaml from 'js-yaml';

export function parseOpenApiSpec(content: string, filename: string): ImportedApi {
  let spec: any;

  try {
    if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
      spec = yaml.load(content);
    } else {
      spec = JSON.parse(content);
    }
  } catch {
    throw new Error('Failed to parse file. Ensure it is valid JSON or YAML.');
  }

  if (!spec.paths && !spec.openapi && !spec.swagger) {
    throw new Error('File does not appear to be an OpenAPI/Swagger specification.');
  }

  const title = spec.info?.title || filename.replace(/\.(json|yaml|yml)$/, '');
  const baseUrl = spec.servers?.[0]?.url || (spec.host ? `https://${spec.host}${spec.basePath || ''}` : '');

  const endpoints: ParsedEndpoint[] = [];
  const validMethods = ['get', 'post', 'put', 'patch', 'delete'];

  if (spec.paths) {
    for (const [path, pathItem] of Object.entries(spec.paths as Record<string, any>)) {
      for (const method of validMethods) {
        if (pathItem[method]) {
          const op = pathItem[method];
          let exampleBody = '';

          if (op.requestBody) {
            const jsonContent = op.requestBody.content?.['application/json'];
            if (jsonContent?.example) {
              exampleBody = JSON.stringify(jsonContent.example, null, 2);
            } else if (jsonContent?.schema) {
              const example = generateExample(jsonContent.schema, spec.components);
              exampleBody = JSON.stringify(example, null, 2);
            }
          }

          endpoints.push({
            path,
            method: method.toUpperCase() as HttpMethod,
            summary: op.summary || '',
            description: op.description || '',
            parameters: [...(pathItem.parameters || []), ...(op.parameters || [])],
            requestBody: op.requestBody,
            exampleBody,
          });
        }
      }
    }
  }

  return { id: crypto.randomUUID(), name: title, baseUrl, endpoints };
}

function generateExample(schema: any, components?: any, depth = 0): any {
  if (depth > 5 || !schema) return {};

  if (schema.$ref) {
    const refName = schema.$ref.split('/').pop();
    const resolved = components?.schemas?.[refName];
    return resolved ? generateExample(resolved, components, depth + 1) : {};
  }

  if (schema.example !== undefined) return schema.example;
  if (schema.default !== undefined) return schema.default;

  if (schema.allOf) {
    return schema.allOf.reduce((acc: any, s: any) => ({
      ...acc, ...generateExample(s, components, depth + 1),
    }), {});
  }

  if (schema.oneOf || schema.anyOf) {
    return generateExample((schema.oneOf || schema.anyOf)[0], components, depth + 1);
  }

  switch (schema.type) {
    case 'string':
      if (schema.enum) return schema.enum[0];
      if (schema.format === 'date-time') return '2024-01-01T00:00:00Z';
      if (schema.format === 'email') return 'user@example.com';
      if (schema.format === 'uri') return 'https://example.com';
      return 'string';
    case 'number':
    case 'integer':
      return schema.minimum ?? 0;
    case 'boolean':
      return true;
    case 'array':
      return schema.items ? [generateExample(schema.items, components, depth + 1)] : [];
    case 'object': {
      const obj: Record<string, any> = {};
      if (schema.properties) {
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExample(prop as any, components, depth + 1);
        }
      }
      return obj;
    }
    default:
      if (schema.properties) {
        const obj: Record<string, any> = {};
        for (const [key, prop] of Object.entries(schema.properties)) {
          obj[key] = generateExample(prop as any, components, depth + 1);
        }
        return obj;
      }
      return {};
  }
}
