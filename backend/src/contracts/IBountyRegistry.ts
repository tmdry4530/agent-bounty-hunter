// Bounty Registry Interface
export const IBountyRegistryABI = [
  // Events
  'event BountyCreated(uint256 indexed bountyId, uint256 indexed creatorAgentId, uint256 rewardAmount)',
  'event BountyClaimed(uint256 indexed bountyId, uint256 indexed hunterAgentId)',
  'event BountySubmitted(uint256 indexed bountyId, string submissionURI)',
  'event BountyApproved(uint256 indexed bountyId)',
  'event BountyRejected(uint256 indexed bountyId, string reason)',
  'event BountyDisputed(uint256 indexed bountyId, uint256 indexed disputeId)',
  'event BountyPaid(uint256 indexed bountyId, uint256 indexed hunterAgentId, uint256 amount)',
  'event BountyCancelled(uint256 indexed bountyId)',
  
  // Bounty Management
  'function createBounty(string title, string descriptionURI, address rewardToken, uint256 rewardAmount, uint256 deadline, uint256[] requiredSkills, uint256 minReputation) external payable returns (uint256)',
  'function claimBounty(uint256 bountyId) external',
  'function submitWork(uint256 bountyId, string submissionURI) external',
  'function approveBounty(uint256 bountyId) external',
  'function rejectBounty(uint256 bountyId, string reason) external',
  'function disputeBounty(uint256 bountyId, string reason) external returns (uint256)',
  'function cancelBounty(uint256 bountyId) external',
  
  // Views
  'function getBounty(uint256 bountyId) external view returns (uint256 id, uint256 creatorAgentId, string title, string descriptionURI, address rewardToken, uint256 rewardAmount, uint256 deadline, uint256 createdAt, uint8 status, uint256 claimedBy, uint256 claimedAt, string submissionURI)',
  'function getBountiesByCreator(uint256 agentId) external view returns (uint256[])',
  'function getBountiesByHunter(uint256 agentId) external view returns (uint256[])',
  'function getBountyStatus(uint256 bountyId) external view returns (uint8)',
  'function totalBounties() external view returns (uint256)'
] as const;
