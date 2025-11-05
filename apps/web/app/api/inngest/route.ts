import { serve } from 'inngest/next';
import { inngest } from '../../../inngest/client';
import { processInboundEmail } from '../../../inngest/functions';

// Inngest API route handler
// This endpoint receives events from Inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [processInboundEmail],
});

