// src/components/data-grid/toolbar/command-button.tsx
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useCallback, useTransition } from 'react'
import { resolveLucideIcon } from './icon-resolver'
import type { ToolbarCommand, ToolbarContext } from './toolbar.types'

interface CommandButtonProps {
  command: ToolbarCommand
  ctx: ToolbarContext
}

export function CommandButton({ command, ctx }: CommandButtonProps) {
  const [isPending, startTransition] = useTransition()

  const handleClick = useCallback(() => {
    if (!command.handler) return
    startTransition(async () => {
      await command.handler!(ctx, command.handlerParams)
    })
  }, [command.handler, command.handlerParams, ctx])

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
