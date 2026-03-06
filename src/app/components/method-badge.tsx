import {type HttpMethod} from '@/lib/types/api';
import {cn} from '@/lib/utils';

const methodStyles: Record<HttpMethod, string> = {
  GET: 'text-method-get',
  POST: 'text-method-post',
  PUT: 'text-method-put',
  PATCH: 'text-method-patch',
  DELETE: 'text-method-delete',
};

const methodBg: Record<HttpMethod, string> = {
  GET: 'bg-method-get/15 text-method-get',
  POST: 'bg-method-post/15 text-method-post',
  PUT: 'bg-method-put/15 text-method-put',
  PATCH: 'bg-method-patch/15 text-method-patch',
  DELETE: 'bg-method-delete/15 text-method-delete',
};

export function MethodBadge({
  method,
  variant = 'text',
  className,
}: {
  method: HttpMethod;
  variant?: 'text' | 'badge';
  className?: string;
}) {
  if (variant === 'badge') {
    return (
      <span className={cn('px-2 py-0.5 rounded text-[10px] font-bold font-mono', methodBg[method], className)}>
        {method}
      </span>
    );
  }
  return (
    <span className={cn('font-mono font-bold text-xs', methodStyles[method], className)}>
      {method}
    </span>
  );
}
