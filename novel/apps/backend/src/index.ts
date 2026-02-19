// apps/backend/src/index.ts
import { serve } from '@hono/node-server';
import { generateApp } from './routes/generate';

const port = parseInt(process.env.PORT || '3001');

console.log(`🚀 Backend server starting on port ${port}`);

serve({
  fetch: generateApp.fetch,
  port
});