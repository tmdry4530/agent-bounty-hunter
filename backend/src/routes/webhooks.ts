import { Hono } from 'hono';
import { z } from 'zod';
import { ErrorCode, ApiResponse } from '../types';
import { authenticate } from '../middleware/auth';

export const webhookRoutes = new Hono();

// Webhook validation schema
const WebhookSchema = z.object({
  url: z.string().url('Invalid webhook URL'),
  events: z.array(z.enum([
    'bounty.created',
    'bounty.claimed',
    'bounty.submitted',
    'bounty.approved',
    'bounty.rejected',
    'bounty.cancelled',
    'bounty.expired',
    'agent.registered',
    'agent.updated',
    'reputation.updated'
  ])).min(1, 'At least one event type required'),
  secret: z.string().min(16, 'Secret must be at least 16 characters').optional(),
  active: z.boolean().optional().default(true),
  description: z.string().max(500).optional()
});

const UpdateWebhookSchema = WebhookSchema.partial();

// In-memory store for MVP (replace with database later)
const webhooks: Map<string, any> = new Map();
let webhookIdCounter = 1;

/**
 * GET /api/webhooks
 * List webhooks for authenticated agent
 */
webhookRoutes.get('/', authenticate, async (c) => {
  try {
    const agentId = c.get('agentId').toString();

    // Filter webhooks by agent
    const agentWebhooks = Array.from(webhooks.values())
      .filter(webhook => webhook.agentId === agentId);

    return c.json({
      success: true,
      data: {
        webhooks: agentWebhooks,
        total: agentWebhooks.length
      }
    } as ApiResponse);
  } catch (error) {
    console.error('List webhooks error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to list webhooks'
      }
    } as ApiResponse, 500);
  }
});

/**
 * POST /api/webhooks
 * Create webhook
 */
webhookRoutes.post('/', authenticate, async (c) => {
  try {
    const body = await c.req.json();
    const validationResult = WebhookSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid webhook data',
          details: validationResult.error.errors
        }
      } as ApiResponse, 400);
    }

    const webhookData = validationResult.data;
    const agentId = c.get('agentId').toString();

    // Create webhook
    const webhookId = `wh_${webhookIdCounter++}`;
    const webhook = {
      id: webhookId,
      agentId,
      url: webhookData.url,
      events: webhookData.events,
      secret: webhookData.secret || generateSecret(),
      active: webhookData.active ?? true,
      description: webhookData.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stats: {
        totalDeliveries: 0,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        lastDeliveryAt: null
      }
    };

    webhooks.set(webhookId, webhook);

    return c.json({
      success: true,
      data: webhook
    } as ApiResponse, 201);
  } catch (error) {
    console.error('Create webhook error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to create webhook'
      }
    } as ApiResponse, 500);
  }
});

/**
 * GET /api/webhooks/:id
 * Get webhook by ID
 */
webhookRoutes.get('/:id', authenticate, async (c) => {
  try {
    const webhookId = c.req.param('id');
    const webhook = webhooks.get(webhookId);

    if (!webhook) {
      return c.json({
        success: false,
        error: {
          code: 'WEBHOOK_NOT_FOUND',
          message: 'Webhook not found'
        }
      } as ApiResponse, 404);
    }

    // Verify ownership
    const agentId = c.get('agentId').toString();
    if (webhook.agentId !== agentId) {
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INVALID_SIGNATURE,
          message: 'Cannot access another agent\'s webhook'
        }
      } as ApiResponse, 403);
    }

    return c.json({
      success: true,
      data: webhook
    } as ApiResponse);
  } catch (error) {
    console.error('Get webhook error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to get webhook'
      }
    } as ApiResponse, 500);
  }
});

/**
 * PUT /api/webhooks/:id
 * Update webhook
 */
webhookRoutes.put('/:id', authenticate, async (c) => {
  try {
    const webhookId = c.req.param('id');
    const webhook = webhooks.get(webhookId);

    if (!webhook) {
      return c.json({
        success: false,
        error: {
          code: 'WEBHOOK_NOT_FOUND',
          message: 'Webhook not found'
        }
      } as ApiResponse, 404);
    }

    // Verify ownership
    const agentId = c.get('agentId').toString();
    if (webhook.agentId !== agentId) {
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INVALID_SIGNATURE,
          message: 'Cannot update another agent\'s webhook'
        }
      } as ApiResponse, 403);
    }

    const body = await c.req.json();
    const validationResult = UpdateWebhookSchema.safeParse(body);

    if (!validationResult.success) {
      return c.json({
        success: false,
        error: {
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Invalid webhook data',
          details: validationResult.error.errors
        }
      } as ApiResponse, 400);
    }

    const updateData = validationResult.data;

    // Update webhook
    const updatedWebhook = {
      ...webhook,
      ...updateData,
      updatedAt: new Date().toISOString()
    };

    webhooks.set(webhookId, updatedWebhook);

    return c.json({
      success: true,
      data: updatedWebhook
    } as ApiResponse);
  } catch (error) {
    console.error('Update webhook error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to update webhook'
      }
    } as ApiResponse, 500);
  }
});

/**
 * DELETE /api/webhooks/:id
 * Delete webhook
 */
webhookRoutes.delete('/:id', authenticate, async (c) => {
  try {
    const webhookId = c.req.param('id');
    const webhook = webhooks.get(webhookId);

    if (!webhook) {
      return c.json({
        success: false,
        error: {
          code: 'WEBHOOK_NOT_FOUND',
          message: 'Webhook not found'
        }
      } as ApiResponse, 404);
    }

    // Verify ownership
    const agentId = c.get('agentId').toString();
    if (webhook.agentId !== agentId) {
      return c.json({
        success: false,
        error: {
          code: ErrorCode.INVALID_SIGNATURE,
          message: 'Cannot delete another agent\'s webhook'
        }
      } as ApiResponse, 403);
    }

    webhooks.delete(webhookId);

    return c.json({
      success: true,
      data: {
        id: webhookId,
        deleted: true
      }
    } as ApiResponse);
  } catch (error) {
    console.error('Delete webhook error:', error);
    return c.json({
      success: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Failed to delete webhook'
      }
    } as ApiResponse, 500);
  }
});

// Helper function to generate webhook secret
function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let secret = '';
  for (let i = 0; i < 32; i++) {
    secret += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return secret;
}
