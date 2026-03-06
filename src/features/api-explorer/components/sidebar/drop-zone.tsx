import { parseSpec } from '../../openapi/parser';
import { useApiExplorer } from '../../context/api-explorer-context';
import { FileJson, Upload } from 'lucide-react';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import yaml from 'js-yaml';

export function DropZone() {
  const { addCustomCollection } = useApiExplorer();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === e.target) setIsDragging(false);
  }, []);

  const processFile = useCallback((content: string, filename: string) => {
    let raw: unknown;
    try {
      if (filename.endsWith('.yaml') || filename.endsWith('.yml')) {
        raw = yaml.load(content);
      } else {
        raw = JSON.parse(content);
      }
    } catch {
      toast.error(`${filename}: invalid JSON/YAML`);
      return;
    }

    try {
      const collection = parseSpec(raw, filename);
      addCustomCollection(collection);
      toast.success(`Imported ${collection.name} (${collection.endpointCount} endpoints)`);
    } catch (err: any) {
      toast.error(`${filename}: ${err.message}`);
    }
  }, [addCustomCollection]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    Array.from(e.dataTransfer.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => processFile(ev.target?.result as string, file.name);
      reader.readAsText(file);
    });
  }, [processFile]);

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ pointerEvents: isDragging ? 'auto' : 'none' }}
      />
      {isDragging && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center pointer-events-none">
          <div className="border-2 border-dashed border-primary rounded-2xl p-16 flex flex-col items-center gap-4 bg-card/50">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload size={28} className="text-primary" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-foreground">Drop OpenAPI spec file</p>
              <p className="text-sm text-muted-foreground mt-1">Supports JSON and YAML formats</p>
            </div>
            <div className="flex gap-2 mt-2">
              {['.json', '.yaml', '.yml'].map(ext => (
                <span key={ext} className="flex items-center gap-1 px-2 py-1 bg-input rounded text-xs text-muted-foreground">
                  <FileJson size={12} /> {ext}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
