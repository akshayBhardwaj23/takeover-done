import { Inngest } from 'inngest';

// Create Inngest client
// Get INNGEST_EVENT_KEY from Inngest dashboard
export const inngest = new Inngest({
  id: 'ai-ecom-tool',
  eventKey: process.env.INNGEST_EVENT_KEY,
});

