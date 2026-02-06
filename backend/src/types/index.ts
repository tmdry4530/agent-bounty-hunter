// ============================================
// Authentication
// ============================================

export interface AuthHeaders {
  'x-agent-id': string;
  'x-timestamp': string;
  'x-signature': string;
}

export interface AuthenticatedRequest {
  agent?: {
    agentId: bigint;
    address: string;
    timestamp: number;
  };
  payment?: X402Payment;
}

// ============================================
// x402 Payment
// ============================================

export interface X402Payment {
  version: 'x402-v1';
  network: 'monad';
  chainId: number;
  token: string;           // Token address
  amount: string;          // Amount in wei
  sender: string;          // Payer address
  recipient: string;       // Platform address
  txHash: string;          // Transaction hash
  timestamp: number;
  signature: string;       // Signature of payment proof
  memo?: string;
}

export interface PaymentRequirement {
  amount: string;          // Amount in USDC (decimal)
  token: 'USDC';
  tokenAddress: string;
  network: 'monad';
  chainId: number;
  recipient: string;
  memo: string;
  expiresAt: number;
}

// ============================================
// Bounty Types
// ============================================

export enum BountyType {
  RESEARCH = 'research',
  CODE = 'code',
  CONTENT = 'content',
  CREATIVE = 'creative',
  INTEGRATION = 'integration',
  AGENT_TASK = 'agent-task',
  OTHER = 'other'
}

export enum BountyStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  CLAIMED = 'claimed',
  IN_PROGRESS = 'in-progress',
  SUBMITTED = 'submitted',
  UNDER_REVIEW = 'under-review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  DISPUTED = 'disputed',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

export interface Bounty {
  id: string;
  onChainId: bigint;
  creatorAgentId: bigint;
  title: string;
  description: string;
  descriptionURI?: string;
  type: BountyType;
  rewardAmount: string;
  rewardToken: string;
  rewardTokenAddress: string;
  status: BountyStatus;
  deadline: Date;
  requiredSkills: string[];
  preferredSkills?: string[];
  deliverables: string[];
  minReputation: number;
  createdAt: Date;
  claimedBy?: bigint;
  claimedAt?: Date;
  submissionURI?: string;
  tags?: string[];
  visibility?: 'public' | 'private' | 'invite';
}

export interface CreateBountyRequest {
  title: string;
  description: string;
  type: BountyType;
  rewardAmount: string;
  rewardToken: 'USDC';
  deadline: string;
  requiredSkills: string[];
  preferredSkills?: string[];
  deliverables: string[];
  minReputation?: number;
  visibility?: 'public' | 'private' | 'invite';
  tags?: string[];
}

export interface SubmitWorkRequest {
  submissionURI: string;
  notes?: string;
  deliverables: Array<{
    name: string;
    uri: string;
    type: string;
  }>;
}

export interface ReviewBountyRequest {
  action: 'approve' | 'reject';
  rating?: number;
  feedback?: string;
  reason?: string;
}

// ============================================
// Agent Types
// ============================================

export interface AgentProfile {
  agentId: string;
  name: string;
  description?: string;
  image?: string;
  wallet: string;
  owner: string;
  skills: string[];
  pricing?: {
    baseRate: string;
    currency: string;
    unit: string;
  };
  reputation: ReputationScore;
  stats: AgentStats;
  services?: Array<{
    name: string;
    endpoint: string;
  }>;
  active: boolean;
  x402Support: boolean;
}

export interface ReputationScore {
  overall: number;
  reliability: number;
  quality: number;
  speed: number;
  volume: number;
}

export interface AgentStats {
  completedBounties: number;
  totalEarnings: string;
  avgRating: number;
  memberSince: Date;
}

export interface RegisterAgentRequest {
  registrationURI: string;
  metadata: {
    skills: string[];
    pricing?: {
      baseRate: string;
      currency: string;
      unit: string;
    };
  };
}

// ============================================
// API Response Types
// ============================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================
// Error Codes
// ============================================

export enum ErrorCode {
  // Auth (1xxx)
  INVALID_SIGNATURE = 'INVALID_SIGNATURE',
  EXPIRED_TIMESTAMP = 'EXPIRED_TIMESTAMP',
  AGENT_NOT_FOUND = 'AGENT_NOT_FOUND',
  
  // Payment (2xxx)
  PAYMENT_REQUIRED = 'PAYMENT_REQUIRED',
  PAYMENT_INVALID = 'PAYMENT_INVALID',
  PAYMENT_EXPIRED = 'PAYMENT_EXPIRED',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  
  // Bounty (3xxx)
  BOUNTY_NOT_FOUND = 'BOUNTY_NOT_FOUND',
  BOUNTY_ALREADY_CLAIMED = 'BOUNTY_ALREADY_CLAIMED',
  BOUNTY_EXPIRED = 'BOUNTY_EXPIRED',
  BOUNTY_NOT_CLAIMABLE = 'BOUNTY_NOT_CLAIMABLE',
  INSUFFICIENT_REPUTATION = 'INSUFFICIENT_REPUTATION',
  SKILL_MISMATCH = 'SKILL_MISMATCH',
  
  // Agent (4xxx)
  AGENT_ALREADY_REGISTERED = 'AGENT_ALREADY_REGISTERED',
  INVALID_REGISTRATION_FILE = 'INVALID_REGISTRATION_FILE',
  AGENT_SUSPENDED = 'AGENT_SUSPENDED',
  
  // System (5xxx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}
