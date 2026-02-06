// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

/**
 * @title AgentIdentityRegistry
 * @notice ERC-8004 compliant agent identity registry with ERC-721 NFT representation
 * @dev Each agent gets a unique NFT representing their on-chain identity
 */
contract AgentIdentityRegistry is ERC721Enumerable, Ownable, EIP712 {
    using ECDSA for bytes32;

    // State variables
    uint256 private _nextAgentId;
    mapping(uint256 => string) private _agentURIs;
    mapping(uint256 => address) private _agentWallets;
    mapping(uint256 => mapping(string => bytes)) private _metadata;
    
    // Registration fee
    uint256 public registrationFee;
    
    // Events
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event MetadataSet(uint256 indexed agentId, string key, bytes value);
    event AgentWalletSet(uint256 indexed agentId, address wallet);
    event AgentURIUpdated(uint256 indexed agentId, string newURI);
    event RegistrationFeeUpdated(uint256 newFee);

    // Errors
    error UnauthorizedAccess();
    error InvalidAgentId();
    error InsufficientFee();
    error InvalidSignature();
    error ExpiredSignature();

    constructor(uint256 _registrationFee) 
        ERC721("AgentIdentity", "AGENT")
        EIP712("AgentIdentityRegistry", "1")
        Ownable(msg.sender)
    {
        registrationFee = _registrationFee;
        _nextAgentId = 1; // Start from 1
    }

    /**
     * @notice Register a new agent identity
     * @param agentURI IPFS URI containing agent metadata (ERC-8004 format)
     * @return agentId The unique ID assigned to this agent
     */
    function register(string calldata agentURI) external payable returns (uint256 agentId) {
        if (msg.value < registrationFee) revert InsufficientFee();
        
        agentId = _nextAgentId++;
        _mint(msg.sender, agentId);
        _agentURIs[agentId] = agentURI;
        _agentWallets[agentId] = msg.sender;
        
        emit Registered(agentId, agentURI, msg.sender);
        
        return agentId;
    }

    /**
     * @notice Register agent with initial metadata
     * @param agentURI IPFS URI containing agent metadata
     * @param metadataEntries Initial metadata key-value pairs
     * @return agentId The unique ID assigned to this agent
     */
    function register(
        string calldata agentURI,
        MetadataEntry[] calldata metadataEntries
    ) external payable returns (uint256 agentId) {
        if (msg.value < registrationFee) revert InsufficientFee();
        
        agentId = _nextAgentId++;
        _mint(msg.sender, agentId);
        _agentURIs[agentId] = agentURI;
        _agentWallets[agentId] = msg.sender;
        
        // Set initial metadata
        for (uint256 i = 0; i < metadataEntries.length; i++) {
            _metadata[agentId][metadataEntries[i].key] = metadataEntries[i].value;
            emit MetadataSet(agentId, metadataEntries[i].key, metadataEntries[i].value);
        }
        
        emit Registered(agentId, agentURI, msg.sender);
        
        return agentId;
    }

    /**
     * @notice Get metadata for a specific key
     * @param agentId The agent's unique ID
     * @param key The metadata key
     * @return The metadata value
     */
    function getMetadata(uint256 agentId, string calldata key) 
        external 
        view 
        returns (bytes memory) 
    {
        if (_ownerOf(agentId) == address(0)) revert InvalidAgentId();
        return _metadata[agentId][key];
    }

    /**
     * @notice Set metadata (only agent owner)
     * @param agentId The agent's unique ID
     * @param key The metadata key
     * @param value The metadata value
     */
    function setMetadata(uint256 agentId, string calldata key, bytes calldata value) 
        external 
    {
        if (ownerOf(agentId) != msg.sender) revert UnauthorizedAccess();
        
        _metadata[agentId][key] = value;
        emit MetadataSet(agentId, key, value);
    }

    /**
     * @notice Get the agent's designated wallet address
     * @param agentId The agent's unique ID
     * @return The wallet address
     */
    function getAgentWallet(uint256 agentId) external view returns (address) {
        if (_ownerOf(agentId) == address(0)) revert InvalidAgentId();
        return _agentWallets[agentId];
    }

    /**
     * @notice Set agent wallet with EIP-712 signature
     * @param agentId The agent's unique ID
     * @param newWallet The new wallet address
     * @param deadline Signature expiry timestamp
     * @param signature EIP-712 signature from current owner
     */
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external {
        if (block.timestamp > deadline) revert ExpiredSignature();
        if (_ownerOf(agentId) == address(0)) revert InvalidAgentId();
        
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("SetAgentWallet(uint256 agentId,address newWallet,uint256 deadline)"),
                agentId,
                newWallet,
                deadline
            )
        );
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        
        if (signer != ownerOf(agentId)) revert InvalidSignature();
        
        _agentWallets[agentId] = newWallet;
        emit AgentWalletSet(agentId, newWallet);
    }

    /**
     * @notice Update agent URI (only owner)
     * @param agentId The agent's unique ID
     * @param newURI The new IPFS URI
     */
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        if (ownerOf(agentId) != msg.sender) revert UnauthorizedAccess();
        
        _agentURIs[agentId] = newURI;
        emit AgentURIUpdated(agentId, newURI);
    }

    /**
     * @notice Get agent URI
     * @param agentId The agent's unique ID
     * @return The agent's URI
     */
    function tokenURI(uint256 agentId) public view override returns (string memory) {
        if (_ownerOf(agentId) == address(0)) revert InvalidAgentId();
        return _agentURIs[agentId];
    }

    /**
     * @notice Get total number of registered agents
     * @return The total count
     */
    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }

    /**
     * @notice Update registration fee (owner only)
     * @param newFee The new fee amount
     */
    function setRegistrationFee(uint256 newFee) external onlyOwner {
        registrationFee = newFee;
        emit RegistrationFeeUpdated(newFee);
    }

    /**
     * @notice Withdraw collected fees (owner only)
     */
    function withdraw() external onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    // Required overrides for ERC721Enumerable
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 amount)
        internal
        override(ERC721Enumerable)
    {
        super._increaseBalance(account, amount);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}

struct MetadataEntry {
    string key;
    bytes value;
}
