// src/components/data-grid/toolbar/command-menu.tsx
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import { useCallback, useState, useTransition } from 'react'
import { resolveLucideIcon } from './icon-resolver'
import type { ToolbarCommand, ToolbarContext } from './toolbar.types'

interface CommandMenuProps {
  command: ToolbarCommand
  ctx: ToolbarContext
}

export function CommandMenu({ command, ctx }: CommandMenuProps) {
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleItemClick = useCallback((item: ToolbarCommand) => {
    if (!item.handler) return
    setPendingId(item.id)
    startTransition(async () => {
      await item.handler!(ctx, item.handlerParams)
      setPendingId(null)
    })
  }, [ctx])

  const TriggerIcon =
    command.icon != null
      ? typeof command.icon === 'string'
        ? resolveLucideIcon(command.icon)
        : command.icon
      : null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={cn('h-8 gap-1.5', command.className)}
            disabled={command.disabled === true || isPending}
          >
            {TriggerIcon && <TriggerIcon className="h-3.5 w-3.5" />}
            {command.label && <span className="text-xs">{command.label}</span>}
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className={command.menuClassName}>
        <DropdownMenuGroup>
          {(command.commands ?? []).map((item) => {
            const ItemIcon =
              item.icon != null
                ? typeof item.icon === 'string'
                  ? resolveLucideIcon(item.icon)
                  : item.icon
                : null
            const isItemPending = pendingId === item.id
            return (
              <DropdownMenuItem
                key={item.id}
                disabled={item.disabled === true || isItemPending}
                onClick={() => handleItemClick(item)}
                className={item.className}
              >
                {ItemIcon && <ItemIcon className="mr-2 h-3.5 w-3.5" />}
                {item.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
