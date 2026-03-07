import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import type { KeyValue } from '../../context/api-explorer-context';
import type { OpenApiParameter } from '../../openapi/types';

interface Props {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  paramHints?: OpenApiParameter[];
  label?: string;
}

export function ParamsEditor({ items, onChange, paramHints = [], label = 'Param' }: Props) {
  const update = (id: string, field: keyof KeyValue, value: any) => {
    onChange(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const add = () => {
    onChange([...items, { id: crypto.randomUUID(), key: '', value: '', enabled: true }]);
  };

  const remove = (id: string) => {
    const filtered = items.filter(item => item.id !== id);
    onChange(filtered.length === 0 ? [{ id: crypto.randomUUID(), key: '', value: '', enabled: true }] : filtered);
  };

  return (
    <div className="space-y-1.5 p-3">
      {/* Column headers */}
      <div className="grid grid-cols-[20px_1fr_1fr_28px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-0.5">
        <span />
        <span>{label}</span>
        <span>Value</span>
        <span />
      </div>

      {items.map(item => {
        const hint = paramHints.find(h => h.name === item.key);
        const hasEnum = hint?.enum && hint.enum.length > 0;

        return (
          <div key={item.id} className="grid grid-cols-[20px_1fr_1fr_28px] gap-2 items-center">
            <Checkbox
              checked={item.enabled}
              onCheckedChange={(checked) => update(item.id, 'enabled', checked === true)}
              className="flex self-center mx-auto"
            />
            <Input
              placeholder="key"
              value={item.key}
              onChange={e => update(item.id, 'key', e.target.value)}
              className="h-8 font-mono bg-card text-xs"
              title={item.description}
            />
            {hasEnum ? (
              /* Use a native select for full-width reliability inside grid */
              <Select
                value={item.value || hint!.enum![0]}
                onValueChange={val => update(item.id, 'value', val)}
              >
                <SelectTrigger className="h-8 font-mono bg-card text-xs w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="w-[var(--anchor-width)]">
                  {hint!.enum!.map(opt => (
                    <SelectItem key={opt} value={opt} className="font-mono text-xs">{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                placeholder="value"
                value={item.value}
                onChange={e => update(item.id, 'value', e.target.value)}
                className="h-8 font-mono bg-card text-xs"
              />
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(item.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={13} />
            </Button>
          </div>
        );
      })}

      <Button
        variant="ghost"
        size="sm"
        onClick={add}
        className="flex h-7 px-2 items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mt-1 transition-colors"
      >
        <Plus size={13} /> Add row
      </Button>
    </div>
  );
}
