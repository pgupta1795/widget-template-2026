const PROTOCOL = '3DXContent';

export interface DropItem {
  objectId: string;
  objectType: string;
  [key: string]: unknown;
}

export interface ExtractResult {
  /** Primary objectId (first item). Null if extraction failed. */
  id: string | null;
  /** All dropped items */
  items: DropItem[];
  /** Full parsed payload for logging/debugging */
  rawData: unknown;
}

/**
 * Parse and log a 3DXContent dataTransfer payload.
 * Tries every dataTransfer type, logs all content, returns structured result.
 *
 * 3DX drop payload shape:
 * { "protocol": "3DXContent", "data": { "items": [{ "objectId": "...", "objectType": "...", ...more }] } }
 */
export function extract3dxObject(dataTransfer: DataTransfer | null): ExtractResult {
  if (!dataTransfer) {
    console.warn('[DropZone] dataTransfer is null');
    return { id: null, items: [], rawData: null };
  }

  // Log all available types
  console.group('[DropZone] Dropped object — dataTransfer inspection');
  console.log('Available types:', [...dataTransfer.types]);
  let rawString: string | null = null;
  for (const type of dataTransfer.types) {
    try {
      const data = dataTransfer.getData(type);
      console.log(`  [${type}]:`, data);
      if (!rawString && data) rawString = data;
    } catch (e) {
      console.warn(`  [${type}]: failed to read —`, e);
    }
  }
  console.groupEnd();

  if (!rawString) {
    console.warn('[DropZone] No data extracted from dataTransfer');
    return { id: null, items: [], rawData: null };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawString);
  } catch {
    console.warn('[DropZone] dataTransfer data is not valid JSON:', rawString);
    return { id: null, items: [], rawData: rawString };
  }

  console.log('[DropZone] Full parsed payload:', JSON.stringify(parsed, null, 2));

  const dnd = parsed as Record<string, unknown>;
  if (dnd.protocol !== PROTOCOL) {
    console.warn(`[DropZone] Unexpected protocol: "${dnd.protocol}" (expected "${PROTOCOL}")`);
  }

  const data = dnd.data as Record<string, unknown> | undefined;
  const items: DropItem[] = Array.isArray(data?.items) ? (data.items as DropItem[]) : [];

  console.log('[DropZone] Extracted items:', items);
  return {
    id: items[0]?.objectId ?? null,
    items,
    rawData: parsed,
  };
}
