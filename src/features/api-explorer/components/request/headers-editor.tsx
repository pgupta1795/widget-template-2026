import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Lock, Plus, Trash2 } from 'lucide-react';
import type { KeyValue } from '../../context/api-explorer-context';

interface Props {
  items: KeyValue[];
  onChange: (items: KeyValue[]) => void;
}

export function HeadersEditor({ items, onChange }: Props) {
  const update = (id: string, field: keyof KeyValue, value: any) => {
    onChange(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const add = () => {
    onChange([...items, { id: crypto.randomUUID(), key: '', value: '', enabled: true }]);
  };

  const remove = (id: string) => {
    // Don't allow removing read-only rows
    const item = items.find(i => i.id === id);
    if (item?.readOnly) return;
    const filtered = items.filter(item => item.id !== id);
    onChange(filtered);
  };

  return (
    <div className="space-y-1.5 p-3">
      <div className="grid grid-cols-[24px_1fr_1fr_28px] gap-2 text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-0.5">
        <span />
        <span>Header</span>
        <span>Value</span>
        <span />
      </div>
      {items.map(item => (
        <div
          key={item.id}
          className={`grid grid-cols-[24px_1fr_1fr_28px] gap-2 items-center ${
            item.readOnly ? 'opacity-60' : ''
          }`}
        >
          {item.readOnly ? (
            <Lock size={12} className="mx-auto text-muted-foreground" />
          ) : (
            <Checkbox
              checked={item.enabled}
              onCheckedChange={(checked) => update(item.id, 'enabled', checked === true)}
              className="flex self-center mx-auto"
            />
          )}
          <Input
            value={item.key}
            readOnly={item.readOnly}
            className={`h-8 font-mono text-xs ${item.readOnly ? 'bg-muted/30 cursor-not-allowed' : 'bg-card'}`}
            title={item.description}
          />
          <Input
            value={item.readOnly ? 'auto-managed' : item.value}
            readOnly={item.readOnly}
            placeholder={item.readOnly ? undefined : 'value'}
            onChange={e => !item.readOnly && update(item.id, 'value', e.target.value)}
            className={`h-8 font-mono text-xs ${
              item.readOnly ? 'bg-muted/30 cursor-not-allowed text-muted-foreground italic' : 'bg-card'
            }`}
          />
          {item.readOnly ? (
            <span />
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(item.id)}
              className="h-8 w-8 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={14} />
            </Button>
          )}
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
