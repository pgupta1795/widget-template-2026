// src/components/data-grid/toolbar/command-button.tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCallback, useTransition } from 'react'
import { resolveLucideIcon } from './icon-resolver'
import type { CommandToolbarCommand, ToolbarContext } from './toolbar.types'

interface CommandButtonProps {
  command: CommandToolbarCommand
  ctx: ToolbarContext
}

export function CommandButton({ command, ctx }: CommandButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleClick = useCallback(() => {
    startTransition(async () => {
      try {
        if (command.handler) {
          // Execute custom handler (takes precedence)
          await command.handler(ctx, command.handlerParams)
        } else if (command.action) {
          // Execute DAG API node (fallback)
          await ctx.executeApiNode(command.action)
        }
        // else: no-op (no handler or action defined)
      } catch (error) {
        // Log error to console — let caller handle toast/UI feedback
        console.error('Command execution failed:', error)
      }
    })
  }, [command.handler, command.handlerParams, command.action, ctx])

  const Icon =
    command.icon != null
      ? typeof command.icon === 'string'
        ? resolveLucideIcon(command.icon)
        : command.icon
      : null

  return (
    <Button
      variant="ghost"
      size="sm"
      className={cn('h-8 gap-1.5', command.className)}
      onClick={handleClick}
      disabled={command.disabled === true || isPending}
    >
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {command.label && <span className="text-xs">{command.label}</span>}
    </Button>
  )
}
