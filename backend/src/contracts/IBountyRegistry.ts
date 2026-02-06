// Bounty Registry Interface
export const IBountyRegistryABI = [
  // Events
  'event BountyCreated(uint256 indexed bountyId, uint256 indexed creatorAgentId, string title, uint256 rewardAmount, uint256 deadline)',
  'event BountyClaimed(uint256 indexed bountyId, uint256 indexed hunterAgentId, uint256 claimedAt)',
  'event BountySubmitted(uint256 indexed bountyId, uint256 indexed hunterAgentId, string submissionURI, uint256 submittedAt)',
  'event BountyApproved(uint256 indexed bountyId, uint256 indexed hunterAgentId, uint8 rating)',
  'event BountyRejected(uint256 indexed bountyId, uint256 indexed hunterAgentId, string reason)',
  'event BountyDisputed(uint256 indexed bountyId, uint256 indexed hunterAgentId)',
  'event BountyPaid(uint256 indexed bountyId, uint256 indexed hunterAgentId, uint256 amount)',
  'event BountyCancelled(uint256 indexed bountyId, uint256 indexed creatorAgentId)',
  'event BountyExpired(uint256 indexed bountyId)',
  'event BountyStatusChanged(uint256 indexed bountyId, uint8 oldStatus, uint8 newStatus)',

  // Bounty Management
  'function createBounty(tuple(string title, string descriptionURI, address rewardToken, uint256 rewardAmount, uint256 deadline, uint256 minReputation, string[] requiredSkills) params) external returns (uint256)',
  'function claimBounty(uint256 bountyId) external',
  'function submitWork(uint256 bountyId, string submissionURI) external',
  'function approveBounty(uint256 bountyId, uint8 rating, string feedbackURI) external',
  'function rejectBounty(uint256 bountyId, string reason) external',
  'function disputeBounty(uint256 bountyId) external',
  'function cancelBounty(uint256 bountyId) external',
  'function expireBounty(uint256 bountyId) external',

  // Views
  'function getBounty(uint256 bountyId) external view returns (tuple(uint256 id, uint256 creatorAgentId, string title, string descriptionURI, address rewardToken, uint256 rewardAmount, uint256 deadline, uint256 minReputation, uint256 createdAt, uint8 status, uint256 claimedBy, uint256 claimedAt, string submissionURI, uint256 submittedAt))',
  'function getBountySkills(uint256 bountyId) external view returns (string[])',
  'function getBountiesByCreator(uint256 agentId) external view returns (uint256[])',
  'function getBountiesByHunter(uint256 agentId) external view returns (uint256[])',
  'function getActiveBounties() external view returns (uint256[])',
  'function getActiveBountiesCount() external view returns (uint256)',
  'function totalBounties() external view returns (uint256)',
  'function isBountyActive(uint256 bountyId) external view returns (bool)',

  // Contract References
  'function identityRegistry() external view returns (address)',
  'function reputationRegistry() external view returns (address)',
  'function escrow() external view returns (address)'
] as const;
