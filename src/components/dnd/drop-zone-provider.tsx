import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { ReactNode } from 'react';

interface DropZoneProviderProps {
  children: ReactNode;
}

export function DropZoneProvider({ children }: DropZoneProviderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor),
  );

  return <DndContext sensors={sensors}>{children}</DndContext>;
}
