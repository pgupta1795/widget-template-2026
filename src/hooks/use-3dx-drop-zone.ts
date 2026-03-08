import logger from '@/lib/logger';
import {getAPIs} from '@/lib/widget/api';
import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';

const PROTOCOL = '3DXContent';

export interface DropzonePayload {
  protocol: "3DXContent";
  version: string;
  source: string;
  data: DropzoneData;
}

export interface DropzoneData {
  items: DropItem[];
}

export interface DropItem {
  envId: string;
  serviceId: string;
  contextId: string;
  objectId: string;
  objectType: string;
  displayName: string;
  i3dx: string;
  displayType: string;
}

/**
 * Parse and log a 3DXContent drop payload.
 *
 * The 3DX DataDragAndDrop library does NOT reliably pass a standard DataTransfer
 * to the drop callback. This function duck-types whatever it receives, trying
 * multiple access patterns until it finds the 3DXContent JSON string.
 *
 * 3DX drop payload shape:
 * { "protocol": "3DXContent", "data": { "items": [{ "objectId": "...", "objectType": "...", ...more }] } }
 */
export function extract3dxObject(dropArgs: string): DropItem[] {
  logger.info('[DropZone] Dropped object — raw args:', dropArgs);
  const rawString = dropArgs;
  if (!rawString) {
    logger.warn('[DropZone] No 3DXContent data found in drop payload');
    return [];
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawString);
  } catch (e) {
    logger.warn('[DropZone] dataTransfer data is not valid JSON:', rawString);
    return [];
  }

  logger.info('[DropZone] Full parsed payload:', JSON.stringify(parsed, null, 2));

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    logger.warn('[DropZone] Parsed payload is not an object:', parsed);
    return [];
  }

  const dnd = parsed as DropzonePayload;
  if (dnd.protocol !== PROTOCOL) {
    logger.warn(`[DropZone] Unexpected protocol: "${dnd.protocol}" (expected "${PROTOCOL}")`);
  }

  const data = dnd.data;
  const rawItems: DropItem[] = typeof data === 'object' && data !== null && Array.isArray(data.items)
    ? (data.items)
    : [];
  logger.info('[DropZone] Extracted items:', rawItems);
  return rawItems;
}


export interface Use3dxDropZoneOptions {
  /** Called when a 3DX object is successfully dropped. */
  onDrop: (result: DropItem[]) => void;
  onEnter?: () => void;
  onLeave?: () => void;
}

export interface Use3dxDropZoneReturn<T extends HTMLElement> {
  ref: RefObject<T | null>;
  isDragOver: boolean;
}

/**
 * Generic hook for receiving 3DX platform object drops.
 *
 * Registers the referenced element with the 3DX DataDragAndDrop platform API.
 * On drop, extracts and logs the 3DXContent payload, then calls `onDrop`.
 *
 * Works alongside @dnd-kit/core for internal widget DnD — the two systems
 * operate on separate event channels and do not interfere.
 *
 * Gracefully no-ops when running outside the 3DX platform (e.g. local dev).
 *
 * @example
 * const { ref, isDragOver } = use3dxDropZone<HTMLDivElement>({
 *   onDrop: ({ id }) => logger.info('dropped id:', id),
 * });
 * return <div ref={ref} className="relative">{isDragOver && <DropZoneOverlay />}</div>;
 */
export function use3dxDropZone<T extends HTMLElement>(
  options: Use3dxDropZoneOptions,
): Use3dxDropZoneReturn<T> {
  const ref = useRef<T>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const optionsRef = useRef(options);
  optionsRef.current = options; // keep callbacks stable without re-registering
  // Counter to debounce dragenter/dragleave over child elements (classic HTML5 DnD issue).
  const dragDepth = useRef(0);

  const register = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    let dnd: ReturnType<typeof getAPIs>['DataDragAndDrop'];
    try {
      dnd = getAPIs().DataDragAndDrop;
    } catch {
      logger.warn('[use3dxDropZone] DataDragAndDrop not available (running outside 3DX platform)');
      return;
    }

    if (!dnd) {
      logger.warn('[use3dxDropZone] DataDragAndDrop is not available on this platform');
      return;
    }

    dnd.droppable(el, {
      enter: () => {
        dragDepth.current += 1;
        if (dragDepth.current === 1) {
          setIsDragOver(true);
          optionsRef.current.onEnter?.();
        }
      },
      leave: () => {
        dragDepth.current = Math.max(0, dragDepth.current - 1);
        if (dragDepth.current === 0) {
          setIsDragOver(false);
          optionsRef.current.onLeave?.();
        }
      },
      over: () => undefined, // allow all drops
      // The 3DX DataDragAndDrop library does not pass a standard DataTransfer.
      // Cast to unknown[] to receive whatever the platform actually provides,
      // then pass the raw arguments to extract3dxObject for duck-typed extraction.
      drop: ((...args: unknown[]) => {
        logger.info('[use3dxDropZone] drop raw args:', args);
        dragDepth.current = 0;
        setIsDragOver(false);
        const result = extract3dxObject(args[0] as string);
        optionsRef.current.onDrop(result);
      }) as Parameters<typeof dnd.droppable>[1]['drop'],
    });

    return () => {
      dragDepth.current = 0;
      try {
        getAPIs().DataDragAndDrop.clean(el, 'drop');
      } catch {
        // Platform may be gone during unmount — safe to ignore
      }
    };
  }, []); // stable: no deps, uses ref + optionsRef

  useEffect(() => {
    const cleanup = register();
    return cleanup;
  }, [register]);

  return { ref, isDragOver };
}
