import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { type KeyValue } from '@/lib/types/api';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export function KeyValueEditor({ items, onChange, keyPlaceholder = 'Key', valuePlaceholder = 'Value' }: Props) {
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
      <div className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">
        <span />
        <span>{keyPlaceholder}</span>
        <span>{valuePlaceholder}</span>
        <span />
      </div>
      {items.map(item => (
        <div key={item.id} className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 items-center">
          <Checkbox
            checked={item.enabled}
            onCheckedChange={(checked) => update(item.id, 'enabled', checked === true)}
            className="flex self-center mx-auto"
          />
          <Input
            placeholder={keyPlaceholder}
            value={item.key}
            onChange={e => update(item.id, 'key', e.target.value)}
            className="h-8 font-mono bg-card"
          />
          <Input
            placeholder={valuePlaceholder}
            value={item.value}
            onChange={e => update(item.id, 'value', e.target.value)}
            className="h-8 font-mono bg-card"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => remove(item.id)}
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
          >
            <Trash2 size={14} />
          </Button>
        </div>
      ))}
      <Button
        variant="ghost"
        size="sm"
        onClick={add}
        className="flex h-8 px-2 items-center gap-1.5 text-xs text-muted-foreground hover:text-primary mt-2 transition-colors"
      >
        <Plus size={14} /> Add row
      </Button>
    </div>
  );
}
