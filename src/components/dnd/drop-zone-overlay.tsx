import { Download } from 'lucide-react';

export function DropZoneOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed border-primary bg-background/80 backdrop-blur-[1px] pointer-events-none">
      <Download className="h-8 w-8 text-primary" />
      <span className="text-sm font-medium text-primary">Drop here</span>
    </div>
  );
}
