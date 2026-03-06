import { useMemo } from 'react';
import { buildSchemaTree, type SchemaNode } from '../openapi/schema-generator';
import type { OpenApiRequestBody } from '../openapi/types';
import type { OpenAPIV3 } from 'openapi-types';

export function useSchemaPanel(requestBody: OpenApiRequestBody | undefined): SchemaNode | null {
  return useMemo(() => {
    const schema = requestBody?.content?.['application/json']?.schema as
      | OpenAPIV3.SchemaObject
      | undefined;
    if (!schema) return null;
    return buildSchemaTree(schema, 'body', false);
  }, [requestBody]);
}
