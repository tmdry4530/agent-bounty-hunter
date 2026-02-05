// Bounty Escrow Interface
export const IBountyEscrowABI = [
  // Events
  'event Deposited(uint256 indexed bountyId, address token, uint256 amount)',
  'event Released(uint256 indexed bountyId, address recipient, uint256 amount)',
  'event Refunded(uint256 indexed bountyId, address recipient, uint256 amount)',
  'event Disputed(uint256 indexed bountyId, uint256 disputeId)',
  
  // Escrow Management
  'function deposit(uint256 bountyId, address token, uint256 amount) external',
  'function release(uint256 bountyId) external',
  'function refund(uint256 bountyId) external',
  'function dispute(uint256 bountyId) external',
  
  // Views
  'function getEscrowBalance(uint256 bountyId) external view returns (address token, uint256 amount)',
  'function isLocked(uint256 bountyId) external view returns (bool)'
] as const;
