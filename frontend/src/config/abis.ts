export const agentIdentityRegistryAbi = [
  'function register(string agentURI) payable returns (uint256)',
  'function totalAgents() view returns (uint256)',
  'function tokenURI(uint256 agentId) view returns (string)',
  'function getAgentWallet(uint256 agentId) view returns (address)',
  'function getMetadata(uint256 agentId, string key) view returns (bytes)',
  'function setMetadata(uint256 agentId, string key, bytes value)',
  'function registrationFee() view returns (uint256)',
  'function balanceOf(address owner) view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) view returns (uint256)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
] as const;

export const bountyRegistryAbi = [
  'function createBounty((string title, string descriptionURI, address rewardToken, uint256 rewardAmount, uint256 deadline, uint256 minReputation, string[] requiredSkills) params) returns (uint256)',
  'function claimBounty(uint256 bountyId)',
  'function submitWork(uint256 bountyId, string submissionURI)',
  'function approveBounty(uint256 bountyId, uint8 rating, string feedbackURI)',
  'function rejectBounty(uint256 bountyId, string reason)',
  'function cancelBounty(uint256 bountyId)',
  'function getBounty(uint256 bountyId) view returns ((uint256 id, uint256 creatorAgentId, string title, string descriptionURI, address rewardToken, uint256 rewardAmount, uint256 deadline, uint256 minReputation, uint256 createdAt, uint8 status, uint256 claimedBy, uint256 claimedAt, string submissionURI, uint256 submittedAt))',
  'function getBountySkills(uint256 bountyId) view returns (string[])',
  'function totalBounties() view returns (uint256)',
  'function getActiveBounties() view returns (uint256[])',
  'function getActiveBountiesCount() view returns (uint256)',
  'function getBountiesByCreator(uint256 agentId) view returns (uint256[])',
  'function getBountiesByHunter(uint256 agentId) view returns (uint256[])',
  'event BountyCreated(uint256 indexed bountyId, uint256 indexed creatorAgentId, string title, uint256 rewardAmount, uint256 deadline)',
  'event BountyClaimed(uint256 indexed bountyId, uint256 indexed hunterAgentId, uint256 claimedAt)',
  'event BountyApproved(uint256 indexed bountyId, uint256 indexed hunterAgentId, uint8 rating)',
  'event BountyPaid(uint256 indexed bountyId, uint256 indexed hunterAgentId, uint256 amount)',
] as const;

export const reputationRegistryAbi = [
  'function getReputation(uint256 agentId) view returns ((uint256 score, uint256 completedBounties, uint256 totalEarnings, uint256 avgRating, uint256 totalRatings, uint256 successRate, uint256 totalAttempts))',
  'function getReputationScore(uint256 agentId) view returns (uint256)',
  'function getReviews(uint256 agentId) view returns ((uint256 bountyId, address reviewer, uint8 rating, string feedback, uint256 timestamp)[])',
  'function meetsRequirement(uint256 agentId, uint256 minReputation) view returns (bool)',
  'event ReputationUpdated(uint256 indexed agentId, uint256 newScore)',
] as const;

export const bountyEscrowAbi = [
  'function getEscrow(uint256 bountyId) view returns ((address token, uint256 amount, address depositor, uint256 hunterAgentId, uint8 status, uint256 createdAt, uint256 releasedAt))',
  'function isLocked(uint256 bountyId) view returns (bool)',
  'function getTotalLocked(address token) view returns (uint256)',
  'function calculateFee(uint256 amount) view returns (uint256)',
  'event Released(uint256 indexed bountyId, address indexed recipient, uint256 amount, uint256 fee)',
] as const;
