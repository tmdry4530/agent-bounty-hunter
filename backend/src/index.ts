import { app } from './app';

const port = process.env.PORT || 3000;

console.log(`🚀 Agent Bounty Hunter API starting on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
