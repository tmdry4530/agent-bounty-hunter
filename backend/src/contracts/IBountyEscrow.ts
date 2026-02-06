// Bounty Escrow Interface
export const IBountyEscrowABI = [
  // Events
  'event Deposited(uint256 indexed bountyId, address indexed token, uint256 amount, address indexed depositor)',
  'event Released(uint256 indexed bountyId, address indexed recipient, uint256 amount, uint256 fee)',
  'event Refunded(uint256 indexed bountyId, address indexed recipient, uint256 amount)',
  'event Disputed(uint256 indexed bountyId)',
  'event DisputeResolved(uint256 indexed bountyId, address indexed winner, uint256 amount, bool favoredHunter)',
  'event HunterAssigned(uint256 indexed bountyId, uint256 indexed hunterAgentId)',

  // Escrow Management
  'function deposit(uint256 bountyId, address token, uint256 amount, address depositor) external',
  'function assignHunter(uint256 bountyId, uint256 hunterAgentId) external',
  'function release(uint256 bountyId) external',
  'function refund(uint256 bountyId) external',
  'function dispute(uint256 bountyId) external',
  'function resolveDispute(uint256 bountyId, bool favorHunter) external',

  // Views
  'function getEscrow(uint256 bountyId) external view returns (tuple(address token, uint256 amount, address depositor, uint256 hunterAgentId, uint8 status, uint256 createdAt, uint256 releasedAt))',
  'function getEscrowBalance(uint256 bountyId) external view returns (address token, uint256 amount)',
  'function isLocked(uint256 bountyId) external view returns (bool)',
  'function isDisputed(uint256 bountyId) external view returns (bool)',
  'function getStatus(uint256 bountyId) external view returns (uint8)',
  'function getTotalLocked(address token) external view returns (uint256)',
  'function calculateFee(uint256 amount) external view returns (uint256)',

  // Configuration
  'function identityRegistry() external view returns (address)',
  'function bountyRegistry() external view returns (address)',
  'function disputeResolver() external view returns (address)',
  'function feeRecipient() external view returns (address)',
  'function feeRate() external view returns (uint256)'
] as const;
