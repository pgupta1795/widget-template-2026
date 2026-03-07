import { createFileRoute } from '@tanstack/react-router';
import { Xen } from '@/features/xen';

export const Route = createFileRoute('/xen')({ component: Xen });
