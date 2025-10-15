import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@ai-ecom/api';

export const trpc = createTRPCReact<AppRouter>();
