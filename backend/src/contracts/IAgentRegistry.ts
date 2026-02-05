// ERC-8004 Agent Registry Interface
export const IAgentRegistryABI = [
  // Events
  'event AgentRegistered(uint256 indexed agentId, address indexed wallet, address indexed owner, string registrationURI)',
  'event MetadataUpdated(uint256 indexed agentId, string key, string value)',
  'event FeedbackSubmitted(uint256 indexed fromAgentId, uint256 indexed toAgentId, uint8 rating, string comment)',
  
  // Agent Management
  'function registerAgent(string registrationURI) external returns (uint256)',
  'function updateMetadata(uint256 agentId, string key, string value) external',
  'function getAgent(uint256 agentId) external view returns (address wallet, address owner, string registrationURI, bool active)',
  'function getAgentByWallet(address wallet) external view returns (uint256)',
  'function getMetadata(uint256 agentId, string key) external view returns (string)',
  
  // Reputation
  'function submitFeedback(uint256 toAgentId, uint256 bountyId, uint8 rating, string comment) external',
  'function getReputation(uint256 agentId) external view returns (uint256 score, uint256 totalFeedbacks)',
  
  // Views
  'function totalAgents() external view returns (uint256)',
  'function isActive(uint256 agentId) external view returns (bool)'
] as const;
