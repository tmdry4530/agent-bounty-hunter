import type { Hex, Address } from 'viem';
import { signRequest, type AuthHeaders } from './auth';
import { parsePaymentBody, createPaymentHeader, shouldAutoPay, type PaymentConfig } from './payment';
import {
  SDKError,
  AuthenticationError,
  PaymentRequiredError,
  NotFoundError,
  ValidationError,
  RateLimitError,
  NetworkError,
  TimeoutError,
} from './errors';
import type {
  ClientConfig,
  RegisterAgentParams,
  AgentProfile,
  AgentResponse,
  ReputationResponse,
  CreateBountyParams,
  BountyFilters,
  Bounty,
  BountyResponse,
  BountyListResponse,
  BountyDetailResponse,
  ClaimResponse,
  SubmitWorkParams,
  SubmitResponse,
  ReviewParams,
  ReviewResponse,
  DisputeResponse,
  SearchFilters,
  SearchResponse,
  WebhookParams,
  Webhook,
  WebhookResponse,
  WebhookListResponse,
} from './types';

const DEFAULT_TIMEOUT = 30000;
const DEFAULT_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export class BountyHunterClient {
  private readonly baseUrl: string;
  private readonly privateKey?: Hex;
  private agentId?: string;
  private readonly autoPayEnabled: boolean;
  private readonly timeout: number;
  private readonly retries: number;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.privateKey = config.privateKey;
    this.agentId = config.agentId;
    this.autoPayEnabled = config.autoPayEnabled ?? false;
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
    this.retries = config.retries ?? DEFAULT_RETRIES;
  }

  /**
   * Set the agent ID for authenticated requests
   */
  setAgentId(agentId: string): void {
    this.agentId = agentId;
  }

  // ==================== AGENTS ====================

  async registerAgent(params: RegisterAgentParams): Promise<AgentResponse> {
    return this.post<AgentResponse>('/api/agents', params, { requiresAuth: true });
  }

  async getAgent(agentId: string): Promise<AgentProfile> {
    const response = await this.get<AgentResponse>(`/api/agents/${agentId}`);
    return response.agent;
  }

  async getAgentReputation(agentId: string): Promise<ReputationResponse> {
    return this.get<ReputationResponse>(`/api/agents/${agentId}/reputation`);
  }

  async getAgentBounties(agentId: string): Promise<BountyListResponse> {
    return this.get<BountyListResponse>(`/api/agents/${agentId}/bounties`);
  }

  // ==================== BOUNTIES ====================

  async listBounties(filters?: BountyFilters): Promise<BountyListResponse> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    const query = params.toString();
    return this.get<BountyListResponse>(`/api/bounties${query ? `?${query}` : ''}`);
  }

  async createBounty(params: CreateBountyParams): Promise<BountyResponse> {
    return this.post<BountyResponse>('/api/bounties', params, { requiresAuth: true });
  }

  async getBounty(bountyId: string): Promise<BountyDetailResponse> {
    return this.get<BountyDetailResponse>(`/api/bounties/${bountyId}`);
  }

  async claimBounty(bountyId: string): Promise<ClaimResponse> {
    return this.post<ClaimResponse>(`/api/bounties/${bountyId}/claim`, {}, { requiresAuth: true });
  }

  async submitWork(bountyId: string, params: SubmitWorkParams): Promise<SubmitResponse> {
    return this.post<SubmitResponse>(`/api/bounties/${bountyId}/submit`, params, { requiresAuth: true });
  }

  async reviewBounty(bountyId: string, params: ReviewParams): Promise<ReviewResponse> {
    return this.post<ReviewResponse>(`/api/bounties/${bountyId}/review`, params, { requiresAuth: true });
  }

  async disputeBounty(bountyId: string): Promise<DisputeResponse> {
    return this.post<DisputeResponse>(`/api/bounties/${bountyId}/dispute`, {}, { requiresAuth: true });
  }

  async cancelBounty(bountyId: string): Promise<BountyResponse> {
    return this.post<BountyResponse>(`/api/bounties/${bountyId}/cancel`, {}, { requiresAuth: true });
  }

  // ==================== SEARCH ====================

  async searchBounties(query: string, filters?: SearchFilters): Promise<SearchResponse<Bounty>> {
    const params = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    return this.get<SearchResponse<Bounty>>(`/api/search/bounties?${params.toString()}`);
  }

  async searchAgents(query: string, filters?: SearchFilters): Promise<SearchResponse<AgentProfile>> {
    const params = new URLSearchParams({ q: query });
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    return this.get<SearchResponse<AgentProfile>>(`/api/search/agents?${params.toString()}`);
  }

  // ==================== WEBHOOKS ====================

  async registerWebhook(agentId: string, params: WebhookParams): Promise<WebhookResponse> {
    return this.post<WebhookResponse>(`/api/agents/${agentId}/webhooks`, params, { requiresAuth: true });
  }

  async listWebhooks(agentId: string): Promise<WebhookListResponse> {
    return this.get<WebhookListResponse>(`/api/agents/${agentId}/webhooks`, { requiresAuth: true });
  }

  async deleteWebhook(agentId: string, webhookId: string): Promise<void> {
    await this.delete(`/api/agents/${agentId}/webhooks/${webhookId}`, { requiresAuth: true });
  }

  // ==================== HEALTH ====================

  async health(): Promise<{ status: string }> {
    return this.get<{ status: string }>('/health');
  }

  // ==================== PRIVATE METHODS ====================

  private async get<T>(path: string, options?: { requiresAuth?: boolean }): Promise<T> {
    return this.request<T>('GET', path, undefined, options);
  }

  private async post<T>(path: string, body: unknown, options?: { requiresAuth?: boolean }): Promise<T> {
    return this.request<T>('POST', path, body, options);
  }

  private async delete(path: string, options?: { requiresAuth?: boolean }): Promise<void> {
    await this.request<void>('DELETE', path, undefined, options);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { requiresAuth?: boolean }
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.retries; attempt++) {
      try {
        const result = await this.executeRequest<T>(method, path, body, options);
        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on auth, validation, or not found errors
        if (
          error instanceof AuthenticationError ||
          error instanceof ValidationError ||
          error instanceof NotFoundError ||
          error instanceof PaymentRequiredError
        ) {
          throw error;
        }

        // Don't retry on last attempt
        if (attempt < this.retries - 1) {
          await this.sleep(RETRY_DELAYS[attempt] || 4000);
        }
      }
    }

    throw lastError || new NetworkError('Request failed after retries');
  }

  private async executeRequest<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: { requiresAuth?: boolean }
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add auth headers if required
    if (options?.requiresAuth && this.privateKey && this.agentId) {
      const authHeaders = await signRequest({
        agentId: this.agentId,
        method,
        path,
        privateKey: this.privateKey,
      });
      Object.assign(headers, authHeaders);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle different status codes
      if (response.status === 401) {
        throw new AuthenticationError('Authentication failed');
      }

      if (response.status === 402) {
        const paymentReq = await parsePaymentBody(response);
        if (paymentReq) {
          throw new PaymentRequiredError('Payment required', paymentReq);
        }
        throw new PaymentRequiredError('Payment required', {
          amount: '0',
          token: '0x',
          recipient: '0x',
          chainId: 143,
        });
      }

      if (response.status === 404) {
        throw new NotFoundError('Resource', path);
      }

      if (response.status === 429) {
        const retryAfter = response.headers.get('retry-after');
        throw new RateLimitError('Rate limit exceeded', retryAfter ? parseInt(retryAfter) : undefined);
      }

      if (response.status >= 400 && response.status < 500) {
        const errorBody = await response.json().catch(() => ({})) as any;
        throw new ValidationError(errorBody.message || 'Request failed', errorBody);
      }

      if (response.status >= 500) {
        throw new NetworkError(`Server error: ${response.status}`);
      }

      if (response.status === 204 || method === 'DELETE') {
        return undefined as T;
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof SDKError) {
        throw error;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        throw new TimeoutError();
      }

      throw new NetworkError('Network request failed', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
