// AgentIdentityRegistry Interface (ERC-721 based)
export const IAgentRegistryABI = [
  // Events
  'event Registered(uint256 indexed agentId, string agentURI, address indexed owner)',
  'event MetadataSet(uint256 indexed agentId, string key, bytes value)',
  'event AgentWalletSet(uint256 indexed agentId, address wallet)',
  'event AgentURIUpdated(uint256 indexed agentId, string newURI)',
  'event RegistrationFeeUpdated(uint256 newFee)',

  // Registration
  'function register(string agentURI) external payable returns (uint256)',

  // Metadata Management
  'function getMetadata(uint256 agentId, string key) external view returns (bytes)',
  'function setMetadata(uint256 agentId, string key, bytes value) external',

  // Wallet Management
  'function getAgentWallet(uint256 agentId) external view returns (address)',
  'function setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes signature) external',

  // URI Management
  'function tokenURI(uint256 agentId) external view returns (string)',
  'function setAgentURI(uint256 agentId, string newURI) external',

  // Views
  'function totalAgents() external view returns (uint256)',
  'function registrationFee() external view returns (uint256)',

  // ERC-721 Standard Functions
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function balanceOf(address owner) external view returns (uint256)',
  'function tokenOfOwnerByIndex(address owner, uint256 index) external view returns (uint256)'
] as const;
