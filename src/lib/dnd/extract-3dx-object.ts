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

function isDropItem(x: unknown): x is DropItem {
  return (
    typeof x === 'object' &&
    x !== null &&
    typeof (x as Record<string, unknown>).objectId === 'string' &&
    typeof (x as Record<string, unknown>).objectType === 'string'
  );
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

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    console.warn('[DropZone] Parsed payload is not an object:', parsed);
    return { id: null, items: [], rawData: parsed };
  }

  const dnd = parsed as Record<string, unknown>;
  if (dnd.protocol !== PROTOCOL) {
    console.warn(`[DropZone] Unexpected protocol: "${dnd.protocol}" (expected "${PROTOCOL}")`);
  }

  const data = dnd.data;
  const rawItems: unknown[] = typeof data === 'object' && data !== null && Array.isArray((data as Record<string, unknown>).items)
    ? ((data as Record<string, unknown>).items as unknown[])
    : [];
  const items: DropItem[] = rawItems.filter(isDropItem);
  if (items.length !== rawItems.length) {
    console.warn('[DropZone] Some dropped items were malformed and filtered out:', rawItems);
  }

  console.log('[DropZone] Extracted items:', items);
  return {
    id: items[0]?.objectId ?? null,
    items,
    rawData: parsed,
  };
}
