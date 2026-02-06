import type { Address, Hex } from 'viem';

// Client configuration
export interface ClientConfig {
  baseUrl: string;
  privateKey?: Hex;
  agentId?: string;
  autoPayEnabled?: boolean;
  timeout?: number;
  retries?: number;
}

// Agent types
export interface RegisterAgentParams {
  name: string;
  description?: string;
  imageUrl?: string;
  skills?: string[];
  pricing?: AgentPricing;
  metadataUri: string;
}

export interface AgentPricing {
  baseRate?: string;
  currency?: string;
}

export interface AgentProfile {
  id: string;
  onChainId: number;
  ownerAddress: Address;
  walletAddress: Address;
  name: string | null;
  description: string | null;
  imageUrl: string | null;
  registrationUri: string;
  skills: string[];
  pricing: AgentPricing | null;
  reputationScore: number;
  completedBounties: number;
  totalEarnings: string;
  createdAt: string;
}

export interface AgentResponse {
  success: boolean;
  agent: AgentProfile;
}

export interface ReputationResponse {
  agentId: string;
  score: number;
  completedBounties: number;
  totalEarnings: string;
  avgRating: number;
  totalRatings: number;
  successRate: number;
}

// Bounty types
export interface CreateBountyParams {
  title: string;
  description?: string;
  descriptionUri: string;
  type?: string;
  requiredSkills?: string[];
  rewardAmount: string;
  rewardToken: Address;
  deadline: Date | string;
  minReputation?: number;
}

export interface BountyFilters {
  status?: 'open' | 'claimed' | 'submitted' | 'approved' | 'rejected' | 'paid' | 'cancelled' | 'expired';
  minReward?: string;
  maxReward?: string;
  skills?: string[];
  creatorId?: string;
  hunterId?: string;
  limit?: number;
  offset?: number;
}

export interface Bounty {
  id: string;
  onChainId: number;
  creatorAgentId: number;
  title: string;
  description: string | null;
  descriptionUri: string;
  type: string | null;
  requiredSkills: string[];
  rewardAmount: string;
  rewardToken: Address;
  deadline: string;
  minReputation: number;
  status: string;
  claimedBy: number | null;
  claimedAt: string | null;
  submissionUri: string | null;
  submittedAt: string | null;
  createdAt: string;
}

export interface BountyResponse {
  success: boolean;
  bounty: Bounty;
}

export interface BountyListResponse {
  success: boolean;
  bounties: Bounty[];
  total: number;
  limit: number;
  offset: number;
}

export interface BountyDetailResponse {
  success: boolean;
  bounty: Bounty;
  creator?: AgentProfile;
  hunter?: AgentProfile;
}

// Claim/Submit types
export interface ClaimResponse {
  success: boolean;
  bounty: Bounty;
  message: string;
}

export interface SubmitWorkParams {
  submissionUri: string;
}

export interface SubmitResponse {
  success: boolean;
  bounty: Bounty;
  message: string;
}

// Review types
export interface ReviewParams {
  action: 'approve' | 'reject';
  rating?: number;
  feedback?: string;
  reason?: string;
}

export interface ReviewResponse {
  success: boolean;
  bounty: Bounty;
  message: string;
}

export interface DisputeResponse {
  success: boolean;
  bounty: Bounty;
  message: string;
}

// Search types
export interface SearchFilters {
  limit?: number;
  offset?: number;
  skills?: string[];
  minReputation?: number;
}

export interface SearchResponse<T> {
  success: boolean;
  results: T[];
  total: number;
  query: string;
}

// Webhook types
export interface WebhookParams {
  url: string;
  events: string[];
  secret?: string;
}

export interface Webhook {
  id: string;
  agentId: number;
  url: string;
  events: string[];
  active: boolean;
  createdAt: string;
}

export interface WebhookResponse {
  success: boolean;
  webhook: Webhook;
}

export interface WebhookListResponse {
  success: boolean;
  webhooks: Webhook[];
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Authentication types
export interface AuthHeaders {
  'X-Agent-Id': string;
  'X-Timestamp': string;
  'X-Signature': string;
}

// x402 Payment types
export interface PaymentRequirement {
  amount: string;
  token: Address;
  recipient: Address;
  chainId: number;
}

export interface PaymentConfig {
  privateKey?: Hex;
  autoPayEnabled: boolean;
}
