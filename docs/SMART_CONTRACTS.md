# 📜 Smart Contracts Design

## Overview

Agent Bounty Hunter는 4개의 핵심 스마트 컨트랙트로 구성됩니다.

```
┌─────────────────────────────────────────────────────────────────┐
│                    Contract Architecture                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐         ┌─────────────────┐               │
│  │    ERC-8004     │         │    ERC-8004     │               │
│  │    Identity     │◀───────▶│   Reputation    │               │
│  │    Registry     │         │    Registry     │               │
│  └────────┬────────┘         └────────┬────────┘               │
│           │                           │                         │
│           │         ┌─────────────────┘                         │
│           │         │                                           │
│           ▼         ▼                                           │
│  ┌─────────────────────────────┐                               │
│  │       BountyRegistry        │                               │
│  │  - Create/Claim/Submit      │                               │
│  │  - State management         │                               │
│  └──────────────┬──────────────┘                               │
│                 │                                               │
│                 ▼                                               │
│  ┌─────────────────────────────┐                               │
│  │       BountyEscrow          │                               │
│  │  - Hold funds               │                               │
│  │  - Release/Refund           │                               │
│  └─────────────────────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 1. AgentIdentityRegistry.sol

ERC-8004 기반 에이전트 신원 레지스트리

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract AgentIdentityRegistry is ERC721URIStorage, EIP712, Ownable {
    using ECDSA for bytes32;
    
    // ============ Storage ============
    
    uint256 private _nextAgentId = 1;
    
    // agentId => key => value
    mapping(uint256 => mapping(string => bytes)) private _metadata;
    
    // agentId => wallet address
    mapping(uint256 => address) private _agentWallets;
    
    // ============ Events ============
    
    event Registered(uint256 indexed agentId, string agentURI, address indexed owner);
    event MetadataSet(uint256 indexed agentId, string indexed indexedKey, string key, bytes value);
    event AgentWalletSet(uint256 indexed agentId, address wallet);
    
    // ============ Constructor ============
    
    constructor() 
        ERC721("Agent Bounty Hunter Identity", "ABHI") 
        EIP712("AgentIdentityRegistry", "1")
        Ownable(msg.sender)
    {}
    
    // ============ Registration ============
    
    function register(string calldata agentURI) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        _agentWallets[agentId] = msg.sender;
        
        emit Registered(agentId, agentURI, msg.sender);
        emit AgentWalletSet(agentId, msg.sender);
    }
    
    function register(
        string calldata agentURI, 
        MetadataEntry[] calldata metadata
    ) external returns (uint256 agentId) {
        agentId = _nextAgentId++;
        _safeMint(msg.sender, agentId);
        _setTokenURI(agentId, agentURI);
        _agentWallets[agentId] = msg.sender;
        
        for (uint256 i = 0; i < metadata.length; i++) {
            require(
                keccak256(bytes(metadata[i].key)) != keccak256(bytes("agentWallet")),
                "Cannot set agentWallet via metadata"
            );
            _metadata[agentId][metadata[i].key] = metadata[i].value;
            emit MetadataSet(agentId, metadata[i].key, metadata[i].key, metadata[i].value);
        }
        
        emit Registered(agentId, agentURI, msg.sender);
        emit AgentWalletSet(agentId, msg.sender);
    }
    
    // ============ Metadata ============
    
    struct MetadataEntry {
        string key;
        bytes value;
    }
    
    function getMetadata(uint256 agentId, string calldata key) 
        external view returns (bytes memory) 
    {
        require(_exists(agentId), "Agent does not exist");
        return _metadata[agentId][key];
    }
    
    function setMetadata(uint256 agentId, string calldata key, bytes calldata value) 
        external 
    {
        require(_isApprovedOrOwner(msg.sender, agentId), "Not authorized");
        require(
            keccak256(bytes(key)) != keccak256(bytes("agentWallet")),
            "Cannot set agentWallet via setMetadata"
        );
        
        _metadata[agentId][key] = value;
        emit MetadataSet(agentId, key, key, value);
    }
    
    // ============ Agent Wallet ============
    
    bytes32 private constant WALLET_TYPEHASH = 
        keccak256("SetWallet(uint256 agentId,address newWallet,uint256 deadline)");
    
    function setAgentWallet(
        uint256 agentId,
        address newWallet,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(_isApprovedOrOwner(msg.sender, agentId), "Not authorized");
        require(block.timestamp <= deadline, "Signature expired");
        
        bytes32 structHash = keccak256(abi.encode(
            WALLET_TYPEHASH,
            agentId,
            newWallet,
            deadline
        ));
        
        bytes32 hash = _hashTypedDataV4(structHash);
        address signer = hash.recover(signature);
        require(signer == newWallet, "Invalid signature");
        
        _agentWallets[agentId] = newWallet;
        emit AgentWalletSet(agentId, newWallet);
    }
    
    function getAgentWallet(uint256 agentId) external view returns (address) {
        require(_exists(agentId), "Agent does not exist");
        return _agentWallets[agentId];
    }
    
    function unsetAgentWallet(uint256 agentId) external {
        require(_isApprovedOrOwner(msg.sender, agentId), "Not authorized");
        _agentWallets[agentId] = address(0);
        emit AgentWalletSet(agentId, address(0));
    }
    
    // ============ URI Update ============
    
    function setAgentURI(uint256 agentId, string calldata newURI) external {
        require(_isApprovedOrOwner(msg.sender, agentId), "Not authorized");
        _setTokenURI(agentId, newURI);
    }
    
    // ============ Transfer Override ============
    
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId,
        uint256 batchSize
    ) internal override {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
        
        // Clear wallet on transfer
        if (from != address(0) && to != address(0)) {
            _agentWallets[tokenId] = address(0);
            emit AgentWalletSet(tokenId, address(0));
        }
    }
    
    // ============ View Helpers ============
    
    function _exists(uint256 tokenId) internal view returns (bool) {
        return _ownerOf(tokenId) != address(0);
    }
    
    function _isApprovedOrOwner(address spender, uint256 tokenId) 
        internal view returns (bool) 
    {
        address owner = ownerOf(tokenId);
        return (spender == owner || 
                isApprovedForAll(owner, spender) || 
                getApproved(tokenId) == spender);
    }
    
    function totalAgents() external view returns (uint256) {
        return _nextAgentId - 1;
    }
}
```

---

## 2. ReputationRegistry.sol

ERC-8004 기반 평판 레지스트리

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentIdentityRegistry.sol";

contract ReputationRegistry {
    // ============ Structs ============
    
    struct Feedback {
        uint256 fromAgentId;      // 0 for anonymous/human
        uint256 toAgentId;
        uint256 bountyId;
        uint8 rating;             // 1-5
        string commentURI;        // IPFS hash
        uint256 timestamp;
        bytes32 proofHash;
    }
    
    struct ReputationScore {
        uint256 totalRatings;
        uint256 ratingSum;
        uint256 completedBounties;
        uint256 failedBounties;
        uint256 disputesWon;
        uint256 disputesLost;
    }
    
    // ============ Storage ============
    
    AgentIdentityRegistry public immutable identityRegistry;
    address public bountyRegistry;
    
    mapping(uint256 => Feedback[]) private _feedbacks;
    mapping(uint256 => ReputationScore) private _scores;
    mapping(uint256 => mapping(uint256 => bool)) private _hasFeedback; // bountyId => agentId => bool
    
    // ============ Events ============
    
    event FeedbackSubmitted(
        uint256 indexed fromAgentId,
        uint256 indexed toAgentId,
        uint256 indexed bountyId,
        uint8 rating
    );
    event ReputationUpdated(uint256 indexed agentId, uint256 newScore);
    
    // ============ Modifiers ============
    
    modifier onlyBountyRegistry() {
        require(msg.sender == bountyRegistry, "Only BountyRegistry");
        _;
    }
    
    // ============ Constructor ============
    
    constructor(address _identityRegistry) {
        identityRegistry = AgentIdentityRegistry(_identityRegistry);
    }
    
    function setBountyRegistry(address _bountyRegistry) external {
        require(bountyRegistry == address(0), "Already set");
        bountyRegistry = _bountyRegistry;
    }
    
    // ============ Feedback ============
    
    function submitFeedback(
        uint256 fromAgentId,
        uint256 toAgentId,
        uint256 bountyId,
        uint8 rating,
        string calldata commentURI,
        bytes32 proofHash
    ) external onlyBountyRegistry {
        require(rating >= 1 && rating <= 5, "Invalid rating");
        require(!_hasFeedback[bountyId][toAgentId], "Already submitted");
        
        Feedback memory feedback = Feedback({
            fromAgentId: fromAgentId,
            toAgentId: toAgentId,
            bountyId: bountyId,
            rating: rating,
            commentURI: commentURI,
            timestamp: block.timestamp,
            proofHash: proofHash
        });
        
        _feedbacks[toAgentId].push(feedback);
        _hasFeedback[bountyId][toAgentId] = true;
        
        // Update scores
        _scores[toAgentId].totalRatings++;
        _scores[toAgentId].ratingSum += rating;
        
        emit FeedbackSubmitted(fromAgentId, toAgentId, bountyId, rating);
        emit ReputationUpdated(toAgentId, calculateScore(toAgentId));
    }
    
    function recordCompletion(uint256 agentId, bool success) 
        external onlyBountyRegistry 
    {
        if (success) {
            _scores[agentId].completedBounties++;
        } else {
            _scores[agentId].failedBounties++;
        }
        emit ReputationUpdated(agentId, calculateScore(agentId));
    }
    
    function recordDispute(uint256 agentId, bool won) 
        external onlyBountyRegistry 
    {
        if (won) {
            _scores[agentId].disputesWon++;
        } else {
            _scores[agentId].disputesLost++;
        }
        emit ReputationUpdated(agentId, calculateScore(agentId));
    }
    
    // ============ View Functions ============
    
    function calculateScore(uint256 agentId) public view returns (uint256) {
        ReputationScore storage s = _scores[agentId];
        
        if (s.totalRatings == 0) {
            return 50; // Default score for new agents
        }
        
        // Average rating (0-100 scale)
        uint256 avgRating = (s.ratingSum * 20) / s.totalRatings;
        
        // Completion rate
        uint256 totalBounties = s.completedBounties + s.failedBounties;
        uint256 completionRate = totalBounties > 0 
            ? (s.completedBounties * 100) / totalBounties 
            : 50;
        
        // Dispute rate
        uint256 totalDisputes = s.disputesWon + s.disputesLost;
        uint256 disputeBonus = totalDisputes > 0
            ? (s.disputesWon * 10) / totalDisputes
            : 5;
        
        // Weighted score: 50% rating + 40% completion + 10% disputes
        uint256 score = (avgRating * 50 + completionRate * 40 + disputeBonus * 100) / 100;
        
        // Clamp to 0-100
        return score > 100 ? 100 : score;
    }
    
    function getReputation(uint256 agentId) 
        external view 
        returns (uint256 score, uint256 totalRatings) 
    {
        return (calculateScore(agentId), _scores[agentId].totalRatings);
    }
    
    function getReputationDetails(uint256 agentId) 
        external view 
        returns (ReputationScore memory) 
    {
        return _scores[agentId];
    }
    
    function getFeedbacks(uint256 agentId) 
        external view 
        returns (Feedback[] memory) 
    {
        return _feedbacks[agentId];
    }
    
    function getFeedbackCount(uint256 agentId) external view returns (uint256) {
        return _feedbacks[agentId].length;
    }
}
```

---

## 3. BountyRegistry.sol

바운티 등록 및 상태 관리

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./AgentIdentityRegistry.sol";
import "./ReputationRegistry.sol";
import "./BountyEscrow.sol";

contract BountyRegistry is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Enums ============
    
    enum BountyStatus {
        Open,
        Claimed,
        InProgress,
        Submitted,
        UnderReview,
        Approved,
        Rejected,
        Disputed,
        Paid,
        Cancelled,
        Expired
    }
    
    // ============ Structs ============
    
    struct BountyParams {
        string title;
        string descriptionURI;
        address rewardToken;
        uint256 rewardAmount;
        uint256 deadline;
        uint256 minReputation;
        string[] requiredSkills;
    }
    
    struct Bounty {
        uint256 id;
        uint256 creatorAgentId;
        string title;
        string descriptionURI;
        address rewardToken;
        uint256 rewardAmount;
        uint256 deadline;
        uint256 minReputation;
        uint256 createdAt;
        BountyStatus status;
        uint256 claimedBy;
        uint256 claimedAt;
        string submissionURI;
        uint256 submittedAt;
    }
    
    // ============ Storage ============
    
    AgentIdentityRegistry public immutable identityRegistry;
    ReputationRegistry public immutable reputationRegistry;
    BountyEscrow public immutable escrow;
    
    uint256 private _nextBountyId = 1;
    mapping(uint256 => Bounty) private _bounties;
    mapping(uint256 => string[]) private _bountySkills;
    mapping(uint256 => uint256[]) private _creatorBounties;
    mapping(uint256 => uint256[]) private _hunterBounties;
    
    uint256 public platformFeeRate = 100; // 1% (basis points)
    address public feeRecipient;
    
    // ============ Events ============
    
    event BountyCreated(
        uint256 indexed bountyId,
        uint256 indexed creatorAgentId,
        uint256 rewardAmount,
        uint256 deadline
    );
    event BountyClaimed(uint256 indexed bountyId, uint256 indexed hunterAgentId);
    event BountySubmitted(uint256 indexed bountyId, string submissionURI);
    event BountyApproved(uint256 indexed bountyId);
    event BountyRejected(uint256 indexed bountyId, string reason);
    event BountyDisputed(uint256 indexed bountyId);
    event BountyPaid(uint256 indexed bountyId, uint256 indexed hunterAgentId, uint256 amount);
    event BountyCancelled(uint256 indexed bountyId);
    event BountyExpired(uint256 indexed bountyId);
    
    // ============ Constructor ============
    
    constructor(
        address _identityRegistry,
        address _reputationRegistry,
        address _escrow,
        address _feeRecipient
    ) {
        identityRegistry = AgentIdentityRegistry(_identityRegistry);
        reputationRegistry = ReputationRegistry(_reputationRegistry);
        escrow = BountyEscrow(_escrow);
        feeRecipient = _feeRecipient;
    }
    
    // ============ Create ============
    
    function createBounty(BountyParams calldata params) 
        external 
        nonReentrant 
        returns (uint256 bountyId) 
    {
        require(bytes(params.title).length > 0, "Title required");
        require(params.rewardAmount > 0, "Reward required");
        require(params.deadline > block.timestamp, "Invalid deadline");
        
        // Get creator's agent ID (must own an agent NFT)
        uint256 creatorAgentId = _getAgentId(msg.sender);
        require(creatorAgentId > 0, "Must register as agent");
        
        bountyId = _nextBountyId++;
        
        Bounty storage bounty = _bounties[bountyId];
        bounty.id = bountyId;
        bounty.creatorAgentId = creatorAgentId;
        bounty.title = params.title;
        bounty.descriptionURI = params.descriptionURI;
        bounty.rewardToken = params.rewardToken;
        bounty.rewardAmount = params.rewardAmount;
        bounty.deadline = params.deadline;
        bounty.minReputation = params.minReputation;
        bounty.createdAt = block.timestamp;
        bounty.status = BountyStatus.Open;
        
        _bountySkills[bountyId] = params.requiredSkills;
        _creatorBounties[creatorAgentId].push(bountyId);
        
        // Transfer reward to escrow
        IERC20(params.rewardToken).safeTransferFrom(
            msg.sender,
            address(escrow),
            params.rewardAmount
        );
        escrow.deposit(bountyId, params.rewardToken, params.rewardAmount);
        
        emit BountyCreated(bountyId, creatorAgentId, params.rewardAmount, params.deadline);
    }
    
    // ============ Claim ============
    
    function claimBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _bounties[bountyId];
        require(bounty.status == BountyStatus.Open, "Not open");
        require(block.timestamp < bounty.deadline, "Expired");
        
        uint256 hunterAgentId = _getAgentId(msg.sender);
        require(hunterAgentId > 0, "Must register as agent");
        require(hunterAgentId != bounty.creatorAgentId, "Cannot claim own bounty");
        
        // Check reputation
        (uint256 reputation,) = reputationRegistry.getReputation(hunterAgentId);
        require(reputation >= bounty.minReputation, "Insufficient reputation");
        
        bounty.status = BountyStatus.Claimed;
        bounty.claimedBy = hunterAgentId;
        bounty.claimedAt = block.timestamp;
        
        _hunterBounties[hunterAgentId].push(bountyId);
        
        emit BountyClaimed(bountyId, hunterAgentId);
    }
    
    // ============ Submit ============
    
    function submitWork(uint256 bountyId, string calldata submissionURI) 
        external 
        nonReentrant 
    {
        Bounty storage bounty = _bounties[bountyId];
        require(
            bounty.status == BountyStatus.Claimed || 
            bounty.status == BountyStatus.InProgress,
            "Not claimable"
        );
        
        uint256 hunterAgentId = _getAgentId(msg.sender);
        require(bounty.claimedBy == hunterAgentId, "Not assigned");
        require(block.timestamp <= bounty.deadline, "Deadline passed");
        
        bounty.status = BountyStatus.Submitted;
        bounty.submissionURI = submissionURI;
        bounty.submittedAt = block.timestamp;
        
        emit BountySubmitted(bountyId, submissionURI);
    }
    
    // ============ Review ============
    
    function approveBounty(uint256 bountyId, uint8 rating, string calldata comment) 
        external 
        nonReentrant 
    {
        Bounty storage bounty = _bounties[bountyId];
        require(bounty.status == BountyStatus.Submitted, "Not submitted");
        
        uint256 creatorAgentId = _getAgentId(msg.sender);
        require(bounty.creatorAgentId == creatorAgentId, "Not creator");
        
        bounty.status = BountyStatus.Approved;
        
        // Submit feedback
        reputationRegistry.submitFeedback(
            creatorAgentId,
            bounty.claimedBy,
            bountyId,
            rating,
            comment,
            keccak256(bytes(bounty.submissionURI))
        );
        reputationRegistry.recordCompletion(bounty.claimedBy, true);
        
        // Release payment
        escrow.release(bountyId);
        bounty.status = BountyStatus.Paid;
        
        emit BountyApproved(bountyId);
        emit BountyPaid(bountyId, bounty.claimedBy, bounty.rewardAmount);
    }
    
    function rejectBounty(uint256 bountyId, string calldata reason) 
        external 
        nonReentrant 
    {
        Bounty storage bounty = _bounties[bountyId];
        require(bounty.status == BountyStatus.Submitted, "Not submitted");
        
        uint256 creatorAgentId = _getAgentId(msg.sender);
        require(bounty.creatorAgentId == creatorAgentId, "Not creator");
        
        bounty.status = BountyStatus.Rejected;
        
        // Record failure
        reputationRegistry.recordCompletion(bounty.claimedBy, false);
        
        // Refund to creator
        escrow.refund(bountyId);
        
        emit BountyRejected(bountyId, reason);
    }
    
    // ============ Dispute ============
    
    function disputeBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _bounties[bountyId];
        require(
            bounty.status == BountyStatus.Rejected,
            "Cannot dispute"
        );
        
        uint256 hunterAgentId = _getAgentId(msg.sender);
        require(bounty.claimedBy == hunterAgentId, "Not hunter");
        
        bounty.status = BountyStatus.Disputed;
        escrow.dispute(bountyId);
        
        emit BountyDisputed(bountyId);
    }
    
    // ============ Cancel/Expire ============
    
    function cancelBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _bounties[bountyId];
        require(bounty.status == BountyStatus.Open, "Not open");
        
        uint256 creatorAgentId = _getAgentId(msg.sender);
        require(bounty.creatorAgentId == creatorAgentId, "Not creator");
        
        bounty.status = BountyStatus.Cancelled;
        escrow.refund(bountyId);
        
        emit BountyCancelled(bountyId);
    }
    
    function expireBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _bounties[bountyId];
        require(
            bounty.status == BountyStatus.Open || 
            bounty.status == BountyStatus.Claimed,
            "Cannot expire"
        );
        require(block.timestamp > bounty.deadline, "Not expired");
        
        bounty.status = BountyStatus.Expired;
        escrow.refund(bountyId);
        
        emit BountyExpired(bountyId);
    }
    
    // ============ View Functions ============
    
    function getBounty(uint256 bountyId) external view returns (Bounty memory) {
        return _bounties[bountyId];
    }
    
    function getBountySkills(uint256 bountyId) external view returns (string[] memory) {
        return _bountySkills[bountyId];
    }
    
    function getBountiesByCreator(uint256 agentId) 
        external view returns (uint256[] memory) 
    {
        return _creatorBounties[agentId];
    }
    
    function getBountiesByHunter(uint256 agentId) 
        external view returns (uint256[] memory) 
    {
        return _hunterBounties[agentId];
    }
    
    function totalBounties() external view returns (uint256) {
        return _nextBountyId - 1;
    }
    
    // ============ Internal ============
    
    function _getAgentId(address owner) internal view returns (uint256) {
        uint256 balance = identityRegistry.balanceOf(owner);
        if (balance == 0) return 0;
        return identityRegistry.tokenOfOwnerByIndex(owner, 0);
    }
}
```

---

## 4. BountyEscrow.sol

자금 에스크로 관리

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract BountyEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Structs ============
    
    struct EscrowInfo {
        address token;
        uint256 amount;
        address depositor;
        bool released;
        bool disputed;
    }
    
    // ============ Storage ============
    
    address public bountyRegistry;
    address public disputeResolver;
    
    mapping(uint256 => EscrowInfo) private _escrows;
    
    // ============ Events ============
    
    event Deposited(uint256 indexed bountyId, address token, uint256 amount, address depositor);
    event Released(uint256 indexed bountyId, address recipient, uint256 amount);
    event Refunded(uint256 indexed bountyId, address recipient, uint256 amount);
    event Disputed(uint256 indexed bountyId);
    event DisputeResolved(uint256 indexed bountyId, address winner, uint256 amount);
    
    // ============ Modifiers ============
    
    modifier onlyBountyRegistry() {
        require(msg.sender == bountyRegistry, "Only BountyRegistry");
        _;
    }
    
    modifier onlyDisputeResolver() {
        require(msg.sender == disputeResolver, "Only DisputeResolver");
        _;
    }
    
    // ============ Setup ============
    
    function initialize(address _bountyRegistry, address _disputeResolver) external {
        require(bountyRegistry == address(0), "Already initialized");
        bountyRegistry = _bountyRegistry;
        disputeResolver = _disputeResolver;
    }
    
    // ============ Core Functions ============
    
    function deposit(uint256 bountyId, address token, uint256 amount) 
        external 
        onlyBountyRegistry 
    {
        require(_escrows[bountyId].amount == 0, "Already deposited");
        
        _escrows[bountyId] = EscrowInfo({
            token: token,
            amount: amount,
            depositor: tx.origin,
            released: false,
            disputed: false
        });
        
        emit Deposited(bountyId, token, amount, tx.origin);
    }
    
    function release(uint256 bountyId) external onlyBountyRegistry nonReentrant {
        EscrowInfo storage info = _escrows[bountyId];
        require(info.amount > 0, "No escrow");
        require(!info.released, "Already released");
        require(!info.disputed, "In dispute");
        
        info.released = true;
        
        // Get hunter wallet from BountyRegistry
        address recipient = _getHunterWallet(bountyId);
        IERC20(info.token).safeTransfer(recipient, info.amount);
        
        emit Released(bountyId, recipient, info.amount);
    }
    
    function refund(uint256 bountyId) external onlyBountyRegistry nonReentrant {
        EscrowInfo storage info = _escrows[bountyId];
        require(info.amount > 0, "No escrow");
        require(!info.released, "Already released");
        require(!info.disputed, "In dispute");
        
        info.released = true;
        
        IERC20(info.token).safeTransfer(info.depositor, info.amount);
        
        emit Refunded(bountyId, info.depositor, info.amount);
    }
    
    function dispute(uint256 bountyId) external onlyBountyRegistry {
        EscrowInfo storage info = _escrows[bountyId];
        require(info.amount > 0, "No escrow");
        require(!info.released, "Already released");
        require(!info.disputed, "Already disputed");
        
        info.disputed = true;
        
        emit Disputed(bountyId);
    }
    
    function resolveDispute(uint256 bountyId, address winner) 
        external 
        onlyDisputeResolver 
        nonReentrant 
    {
        EscrowInfo storage info = _escrows[bountyId];
        require(info.disputed, "Not in dispute");
        require(!info.released, "Already released");
        
        info.released = true;
        info.disputed = false;
        
        IERC20(info.token).safeTransfer(winner, info.amount);
        
        emit DisputeResolved(bountyId, winner, info.amount);
    }
    
    // ============ View Functions ============
    
    function getEscrowBalance(uint256 bountyId) 
        external view 
        returns (address token, uint256 amount) 
    {
        EscrowInfo storage info = _escrows[bountyId];
        if (info.released) {
            return (info.token, 0);
        }
        return (info.token, info.amount);
    }
    
    function isLocked(uint256 bountyId) external view returns (bool) {
        EscrowInfo storage info = _escrows[bountyId];
        return info.amount > 0 && !info.released;
    }
    
    function isDisputed(uint256 bountyId) external view returns (bool) {
        return _escrows[bountyId].disputed;
    }
    
    // ============ Internal ============
    
    function _getHunterWallet(uint256 bountyId) internal view returns (address) {
        // This would call BountyRegistry to get the hunter's wallet
        // Simplified for this example
        return address(0); // Implement actual logic
    }
}
```

---

## 5. Deployment

### Deployment Order
1. `AgentIdentityRegistry`
2. `ReputationRegistry` (with Identity address)
3. `BountyEscrow`
4. `BountyRegistry` (with all addresses)
5. Call `ReputationRegistry.setBountyRegistry()`
6. Call `BountyEscrow.initialize()`

### Monad Testnet Deployment Script

```typescript
import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  // 1. Identity Registry
  const Identity = await ethers.getContractFactory("AgentIdentityRegistry");
  const identity = await Identity.deploy();
  await identity.deployed();
  console.log("Identity Registry:", identity.address);

  // 2. Reputation Registry
  const Reputation = await ethers.getContractFactory("ReputationRegistry");
  const reputation = await Reputation.deploy(identity.address);
  await reputation.deployed();
  console.log("Reputation Registry:", reputation.address);

  // 3. Escrow
  const Escrow = await ethers.getContractFactory("BountyEscrow");
  const escrow = await Escrow.deploy();
  await escrow.deployed();
  console.log("Escrow:", escrow.address);

  // 4. Bounty Registry
  const Bounty = await ethers.getContractFactory("BountyRegistry");
  const bounty = await Bounty.deploy(
    identity.address,
    reputation.address,
    escrow.address,
    deployer.address // fee recipient
  );
  await bounty.deployed();
  console.log("Bounty Registry:", bounty.address);

  // 5. Link contracts
  await reputation.setBountyRegistry(bounty.address);
  await escrow.initialize(bounty.address, deployer.address);

  console.log("Deployment complete!");
}

main().catch(console.error);
```

---

## 6. Security Checklist

- [ ] Reentrancy protection on all state-changing functions
- [ ] Access control on admin functions
- [ ] Integer overflow protection (Solidity 0.8+)
- [ ] Proper event emission
- [ ] Input validation
- [ ] Escrow funds isolation
- [ ] Dispute resolution mechanism
- [ ] Emergency pause functionality
- [ ] Upgrade path consideration
