import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Search, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useApiExplorer } from '../../context/api-explorer-context';

export function SpecBrowser() {
  const { builtInCollections, customCollections, builtInLoading, toggleActive, isActive } = useApiExplorer();
  const [search, setSearch] = useState('');

  const allCollections = [...builtInCollections, ...customCollections];
  const filtered = allCollections.filter(
    c => !search.trim() || c.name.toLowerCase().includes(search.toLowerCase()),
  );

  if (builtInLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Search */}
      <div className="relative px-2">
        <Search size={12} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search APIs..."
          className="h-7 pl-7 text-xs"
        />
      </div>

      {/* List */}
      <div className="space-y-0.5">
        {filtered.map(col => (
          <div
            key={col.id}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-sidebar-accent/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-sidebar-foreground truncate">{col.name}</p>
              <p className="text-[10px] text-muted-foreground/60">
                {col.serviceType} · {col.endpointCount} endpoints
              </p>
            </div>
            <Switch
              checked={isActive(col.id)}
              onCheckedChange={() => toggleActive(col.id)}
              className="shrink-0 scale-75"
            />
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">No APIs match your search</p>
        )}
      </div>
    </div>
  );
}
