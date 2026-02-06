import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { secureHeaders } from 'hono/secure-headers';

import { healthRoutes } from './routes/health';
import { agentRoutes } from './routes/agents';
import { bountyRoutes } from './routes/bounties';
import { searchRoutes } from './routes/search';
import { webhookRoutes } from './routes/webhooks';

const app = new Hono();

// Global middleware
app.use('*', logger());
app.use('*', cors());
app.use('*', secureHeaders());

// Routes
app.route('/health', healthRoutes);
app.route('/api/v1/agents', agentRoutes);
app.route('/api/v1/bounties', bountyRoutes);
app.route('/api/v1/search', searchRoutes);
app.route('/api/v1/webhooks', webhookRoutes);

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

export { app };
