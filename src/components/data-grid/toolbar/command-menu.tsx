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
import type { CommandToolbarCommand, MenuToolbarCommand, ToolbarContext } from './toolbar.types'

interface CommandMenuProps {
  command: MenuToolbarCommand
  ctx: ToolbarContext
}

export function CommandMenu({ command, ctx }: CommandMenuProps) {
  const [isPending, startTransition] = useTransition()
  const [pendingId, setPendingId] = useState<string | null>(null)

  const handleMenuItemClick = useCallback((subCommand: CommandToolbarCommand) => {
    setPendingId(subCommand.id)
    startTransition(async () => {
      try {
        if (subCommand.handler) {
          // Execute custom handler (takes precedence)
          await subCommand.handler(ctx, subCommand.handlerParams)
        } else if (subCommand.action) {
          // Execute DAG API node (fallback)
          await ctx.executeApiNode(subCommand.action)
        }
        // else: no-op (no handler or action defined)
      } catch (error) {
        // Log error to console — let caller handle toast/UI feedback
        console.error(`Error executing menu item: ${subCommand.id}`, error)
      }
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
          {command.commands.map((subCommand) => {
            const ItemIcon =
              subCommand.icon != null
                ? typeof subCommand.icon === 'string'
                  ? resolveLucideIcon(subCommand.icon)
                  : subCommand.icon
                : null
            const isItemPending = pendingId === subCommand.id
            return (
              <DropdownMenuItem
                key={subCommand.id}
                disabled={subCommand.disabled === true || isItemPending}
                onClick={() => handleMenuItemClick(subCommand)}
                className={subCommand.className}
              >
                {ItemIcon && <ItemIcon className="mr-2 h-3.5 w-3.5" />}
                {subCommand.label}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
