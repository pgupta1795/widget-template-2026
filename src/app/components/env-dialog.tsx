import { useApp } from '@/app/context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { type EnvVariable } from '@/lib/types/api';
import { Link, Plus, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export function EnvironmentDialog() {
  const { envVars, setEnvVars, importFromUrl } = useApp();
  const [importUrl, setImportUrl] = useState('');
  const [importing, setImporting] = useState(false);

  const addVar = () => {
    setEnvVars([...envVars, { id: crypto.randomUUID(), key: '', value: '' }]);
  };

  const updateVar = (id: string, field: keyof EnvVariable, value: string) => {
    setEnvVars(envVars.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const removeVar = (id: string) => {
    setEnvVars(envVars.filter(v => v.id !== id));
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) return;
    setImporting(true);
    try {
      await importFromUrl(importUrl.trim());
      toast.success('API spec imported');
      setImportUrl('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to import');
    }
    setImporting(false);
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button
          variant="ghost"
          className="flex h-8 items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          title="Environment & Settings"
        >
          <Settings size={14} />
          Environment
        </Button>}>
        
      </DialogTrigger>
      <DialogContent className="bg-card border-border max-w-lg">
        <DialogHeader>
          <DialogTitle>Environment Variables</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Define variables to use in requests as <code className="text-primary font-mono">{'{{VARIABLE_NAME}}'}</code>
          </p>

          <div className="space-y-2">
            {envVars.map(v => (
              <div key={v.id} className="flex gap-2 items-center">
                <Input
                  value={v.key}
                  onChange={e => updateVar(v.id, 'key', e.target.value)}
                  placeholder="VARIABLE_NAME"
                  className="flex-1 h-8 font-mono bg-card"
                />
                <Input
                  value={v.value}
                  onChange={e => updateVar(v.id, 'value', e.target.value)}
                  placeholder="value"
                  type="password"
                  className="flex-1 h-8 font-mono bg-card"
                />
                <Button variant="ghost" size="icon" onClick={() => removeVar(v.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 size={14} />
                </Button>
              </div>
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={addVar}
            className="flex h-8 px-2 items-center gap-1.5 text-xs text-primary hover:text-primary/80 hover:bg-primary/10 transition-colors"
          >
            <Plus size={14} /> Add variable
          </Button>

          {/* Import from URL section */}
          <div className="border-t border-border pt-4 mt-4">
            <h4 className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
              <Link size={14} /> Import API from URL
            </h4>
            <div className="flex gap-2">
              <Input
                value={importUrl}
                onChange={e => setImportUrl(e.target.value)}
                placeholder="https://api.example.com/openapi.json"
                className="flex-1 font-mono h-9 bg-card"
              />
              <Button
                onClick={handleImportUrl}
                disabled={importing || !importUrl.trim()}
                className="h-9 px-4"
              >
                {importing ? 'Importing...' : 'Import'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
