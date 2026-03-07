import { Xen } from '@/features/xen';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/xen')({ component: Xen });
