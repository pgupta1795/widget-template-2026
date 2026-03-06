import { useApp } from '@/app/context';
import { FileJson, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

export function DropZone() {
  const { importApiSpec } = useApp();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          importApiSpec(event.target?.result as string, file.name);
          toast.success(`Imported ${file.name}`);
        } catch (err: any) {
          toast.error(err.message || 'Failed to parse file');
        }
      };
      reader.readAsText(file);
    });
  }, [importApiSpec]);

  return (
    <>
      {/* Invisible drag target over the entire app */}
      <div
        className="fixed inset-0 z-40"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ pointerEvents: isDragging ? 'auto' : 'none' }}
      />

      {/* Visual overlay when dragging */}
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-primary rounded-2xl p-16 flex flex-col items-center gap-4 bg-card/50">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">Drop OpenAPI spec file</p>
              <p className="text-sm text-muted-foreground mt-1">Supports JSON, YAML, Swagger formats</p>
            </div>
            <div className="flex gap-2 mt-2">
              <span className="flex items-center gap-1 px-2 py-1 bg-input rounded text-xs text-muted-foreground">
                <FileJson size={12} /> .json
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-input rounded text-xs text-muted-foreground">
                <FileJson size={12} /> .yaml
              </span>
              <span className="flex items-center gap-1 px-2 py-1 bg-input rounded text-xs text-muted-foreground">
                <FileJson size={12} /> .yml
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
