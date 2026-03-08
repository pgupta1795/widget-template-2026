import { getAPIs } from '@/lib/widget/api';
import { extract3dxObject, type ExtractResult } from '@/lib/dnd/extract-3dx-object';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

export interface Use3dxDropZoneOptions {
  /** Called when a 3DX object is successfully dropped. */
  onDrop: (result: ExtractResult) => void;
  /** Called when drag enters the zone. */
  onEnter?: () => void;
  /** Called when drag leaves the zone. */
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
 *   onDrop: ({ id }) => console.log('dropped id:', id),
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

  const register = useCallback(() => {
    const el = ref.current;
    if (!el) return;

    let dnd: ReturnType<typeof getAPIs>['DataDragAndDrop'];
    try {
      dnd = getAPIs().DataDragAndDrop;
    } catch {
      console.warn('[use3dxDropZone] DataDragAndDrop not available (running outside 3DX platform)');
      return;
    }

    if (!dnd) {
      console.warn('[use3dxDropZone] DataDragAndDrop is not available on this platform');
      return;
    }

    dnd.droppable(el, {
      enter: () => {
        setIsDragOver(true);
        optionsRef.current.onEnter?.();
      },
      leave: () => {
        setIsDragOver(false);
        optionsRef.current.onLeave?.();
      },
      over: () => undefined, // allow all drops
      drop: (dataTransfer) => {
        setIsDragOver(false);
        const result = extract3dxObject(dataTransfer);
        optionsRef.current.onDrop(result);
      },
    });

    return () => {
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
