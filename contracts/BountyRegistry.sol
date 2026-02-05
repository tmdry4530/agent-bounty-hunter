// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentIdentityRegistry.sol";
import "./ReputationRegistry.sol";
import "./BountyEscrow.sol";

/**
 * @title BountyRegistry
 * @dev Main contract for bounty lifecycle management
 * @notice Handles bounty creation, claims, submissions, and state transitions
 */
contract BountyRegistry is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Enums ============
    
    /**
     * @dev Bounty lifecycle states
     */
    enum BountyStatus {
        Open,           // Available to claim
        Claimed,        // Claimed by a hunter
        InProgress,     // Work in progress (optional state)
        Submitted,      // Work submitted, awaiting review
        UnderReview,    // Under review by creator
        Approved,       // Approved by creator
        Rejected,       // Rejected by creator
        Disputed,       // Under dispute resolution
        Paid,           // Payment released
        Cancelled,      // Cancelled by creator
        Expired         // Deadline passed without completion
    }
    
    // ============ Structs ============
    
    /**
     * @dev Parameters for bounty creation
     */
    struct BountyParams {
        string title;
        string descriptionURI;
        address rewardToken;
        uint256 rewardAmount;
        uint256 deadline;
        uint256 minReputation;
        string[] requiredSkills;
    }
    
    /**
     * @dev Core bounty data structure
     */
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
    
    /// @dev Contract references
    AgentIdentityRegistry public immutable identityRegistry;
    ReputationRegistry public immutable reputationRegistry;
    BountyEscrow public immutable escrow;
    
    /// @dev Bounty tracking
    uint256 private _nextBountyId = 1;
    mapping(uint256 => Bounty) private _bounties;
    mapping(uint256 => string[]) private _bountySkills;
    
    /// @dev Agent-bounty mappings
    mapping(uint256 => uint256[]) private _creatorBounties;
    mapping(uint256 => uint256[]) private _hunterBounties;
    
    /// @dev Active bounty tracking for efficient queries
    uint256[] private _activeBountyIds;
    mapping(uint256 => uint256) private _activeBountyIndex;
    
    // ============ Events ============
    
    event BountyCreated(
        uint256 indexed bountyId,
        uint256 indexed creatorAgentId,
        string title,
        uint256 rewardAmount,
        uint256 deadline
    );
    
    event BountyClaimed(
        uint256 indexed bountyId, 
        uint256 indexed hunterAgentId,
        uint256 claimedAt
    );
    
    event BountySubmitted(
        uint256 indexed bountyId, 
        uint256 indexed hunterAgentId,
        string submissionURI,
        uint256 submittedAt
    );
    
    event BountyApproved(
        uint256 indexed bountyId,
        uint256 indexed hunterAgentId,
        uint8 rating
    );
    
    event BountyRejected(
        uint256 indexed bountyId,
        uint256 indexed hunterAgentId,
        string reason
    );
    
    event BountyDisputed(
        uint256 indexed bountyId,
        uint256 indexed hunterAgentId
    );
    
    event BountyPaid(
        uint256 indexed bountyId, 
        uint256 indexed hunterAgentId, 
        uint256 amount
    );
    
    event BountyCancelled(
        uint256 indexed bountyId,
        uint256 indexed creatorAgentId
    );
    
    event BountyExpired(
        uint256 indexed bountyId
    );
    
    event BountyStatusChanged(
        uint256 indexed bountyId,
        BountyStatus oldStatus,
        BountyStatus newStatus
    );
    
    // ============ Constructor ============
    
    /**
     * @dev Initialize BountyRegistry with contract dependencies
     */
    constructor(
        address _identityRegistry,
        address _reputationRegistry,
        address _escrow
    ) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        require(_reputationRegistry != address(0), "Invalid reputation registry");
        require(_escrow != address(0), "Invalid escrow");
        
        identityRegistry = AgentIdentityRegistry(_identityRegistry);
        reputationRegistry = ReputationRegistry(_reputationRegistry);
        escrow = BountyEscrow(_escrow);
    }
    
    // ============ Bounty Creation ============
    
    /**
     * @dev Create a new bounty
     * @param params Bounty creation parameters
     * @return bountyId The newly created bounty ID
     */
    function createBounty(BountyParams calldata params) 
        external 
        nonReentrant 
        returns (uint256 bountyId) 
    {
        require(bytes(params.title).length > 0, "Title required");
        require(bytes(params.descriptionURI).length > 0, "Description required");
        require(params.rewardAmount > 0, "Reward required");
        require(params.deadline > block.timestamp, "Invalid deadline");
        require(params.deadline <= block.timestamp + 365 days, "Deadline too far");
        
        // Get creator's agent ID
        uint256 creatorAgentId = _getAgentId(msg.sender);
        require(creatorAgentId > 0, "Must register as agent first");
        
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
        
        // Add to active bounties
        _addActiveBounty(bountyId);
        
        // Transfer reward to escrow
        IERC20(params.rewardToken).safeTransferFrom(
            msg.sender,
            address(escrow),
            params.rewardAmount
        );
        escrow.deposit(bountyId, params.rewardToken, params.rewardAmount);
        
        emit BountyCreated(
            bountyId, 
            creatorAgentId, 
            params.title,
            params.rewardAmount, 
            params.deadline
        );
    }
    
    // ============ Claiming ============
    
    /**
     * @dev Claim an open bounty
     * @param bountyId The bounty ID to claim
     */
    function claimBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _bounties[bountyId];
        require(bounty.status == BountyStatus.Open, "Not available");
        require(block.timestamp < bounty.deadline, "Bounty expired");
        
        uint256 hunterAgentId = _getAgentId(msg.sender);
        require(hunterAgentId > 0, "Must register as agent");
        require(hunterAgentId != bounty.creatorAgentId, "Cannot claim own bounty");
        
        // Check reputation requirement
        (uint256 reputation,) = reputationRegistry.getReputation(hunterAgentId);
        require(reputation >= bounty.minReputation, "Insufficient reputation");
        
        // Update state
        BountyStatus oldStatus = bounty.status;
        bounty.status = BountyStatus.Claimed;
        bounty.claimedBy = hunterAgentId;
        bounty.claimedAt = block.timestamp;
        
        _hunterBounties[hunterAgentId].push(bountyId);
        
        // Assign hunter in escrow
        escrow.assignHunter(bountyId, hunterAgentId);
        
        emit BountyClaimed(bountyId, hunterAgentId, block.timestamp);
        emit BountyStatusChanged(bountyId, oldStatus, BountyStatus.Claimed);
    }
    
    // ============ Submission ============
    
    /**
     * @dev Submit work for a claimed bounty
     * @param bountyId The bounty ID
     * @param submissionURI IPFS URI containing the work submission
     */
    function submitWork(uint256 bountyId, string calldata submissionURI) 
        external 
        nonReentrant 
    {
        Bounty storage bounty = _bounties[bountyId];
        require(
            bounty.status == BountyStatus.Claimed || 
            bounty.status == BountyStatus.InProgress,
            "Cannot submit"
        );
        require(bytes(submissionURI).length > 0, "Submission URI required");
        
        uint256 hunterAgentId = _getAgentId(msg.sender);
        require(bounty.claimedBy == hunterAgentId, "Not assigned to you");
        require(block.timestamp <= bounty.deadline, "Deadline passed");
        
        BountyStatus oldStatus = bounty.status;
        bounty.status = BountyStatus.Submitted;
        bounty.submissionURI = submissionURI;
        bounty.submittedAt = block.timestamp;
        
        emit BountySubmitted(bountyId, hunterAgentId, submissionURI, block.timestamp);
        emit BountyStatusChanged(bountyId, oldStatus, BountyStatus.Submitted);
    }
    
    // ============ Review & Approval ============
    
    /**
     * @dev Approve bounty submission and release payment
     * @param bountyId The bounty ID
     * @param rating Rating (1-5) for the work
     * @param feedbackURI IPFS URI for detailed feedback
     */
    function approveBounty(
        uint256 bountyId, 
        uint8 rating, 
        string calldata feedbackURI
    ) 
        external 
        nonReentrant 
    {
        Bounty storage bounty = _bounties[bountyId];
        require(bounty.status == BountyStatus.Submitted, "Not submitted");
        require(rating >= 1 && rating <= 5, "Invalid rating");
        
        uint256 creatorAgentId = _getAgentId(msg.sender);
        require(bounty.creatorAgentId == creatorAgentId, "Not creator");
        
        BountyStatus oldStatus = bounty.status;
        bounty.status = BountyStatus.Approved;
        
        // Submit feedback to reputation system
        reputationRegistry.submitFeedback(
            creatorAgentId,
            bounty.claimedBy,
            bountyId,
            rating,
            feedbackURI,
            keccak256(bytes(bounty.submissionURI))
        );
        reputationRegistry.recordCompletion(bounty.claimedBy, bountyId, true);
        
        // Release payment from escrow
        escrow.release(bountyId);
        bounty.status = BountyStatus.Paid;
        
        // Remove from active bounties
        _removeActiveBounty(bountyId);
        
        emit BountyApproved(bountyId, bounty.claimedBy, rating);
        emit BountyPaid(bountyId, bounty.claimedBy, bounty.rewardAmount);
        emit BountyStatusChanged(bountyId, oldStatus, BountyStatus.Paid);
    }
    
    /**
     * @dev Reject bounty submission
     * @param bountyId The bounty ID
     * @param reason Rejection reason
     */
    function rejectBounty(uint256 bountyId, string calldata reason) 
        external 
        nonReentrant 
    {
        Bounty storage bounty = _bounties[bountyId];
        require(bounty.status == BountyStatus.Submitted, "Not submitted");
        require(bytes(reason).length > 0, "Reason required");
        
        uint256 creatorAgentId = _getAgentId(msg.sender);
        require(bounty.creatorAgentId == creatorAgentId, "Not creator");
        
        BountyStatus oldStatus = bounty.status;
        bounty.status = BountyStatus.Rejected;
        
        // Record failure in reputation
        reputationRegistry.recordCompletion(bounty.claimedBy, bountyId, false);
        
        // Refund to creator
        escrow.refund(bountyId);
        
        // Remove from active bounties
        _removeActiveBounty(bountyId);
        
        emit BountyRejected(bountyId, bounty.claimedBy, reason);
        emit BountyStatusChanged(bountyId, oldStatus, BountyStatus.Rejected);
    }
    
    // ============ Disputes ============
    
    /**
     * @dev Dispute a rejection
     * @param bountyId The bounty ID
     */
    function disputeBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _bounties[bountyId];
        require(bounty.status == BountyStatus.Rejected, "Can only dispute rejections");
        
        uint256 hunterAgentId = _getAgentId(msg.sender);
        require(bounty.claimedBy == hunterAgentId, "Not assigned hunter");
        
        BountyStatus oldStatus = bounty.status;
        bounty.status = BountyStatus.Disputed;
        
        escrow.dispute(bountyId);
        
        emit BountyDisputed(bountyId, hunterAgentId);
        emit BountyStatusChanged(bountyId, oldStatus, BountyStatus.Disputed);
    }
    
    // ============ Cancellation & Expiry ============
    
    /**
     * @dev Cancel an open bounty
     * @param bountyId The bounty ID
     */
    function cancelBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _bounties[bountyId];
        require(bounty.status == BountyStatus.Open, "Can only cancel open bounties");
        
        uint256 creatorAgentId = _getAgentId(msg.sender);
        require(bounty.creatorAgentId == creatorAgentId, "Not creator");
        
        BountyStatus oldStatus = bounty.status;
        bounty.status = BountyStatus.Cancelled;
        
        escrow.refund(bountyId);
        _removeActiveBounty(bountyId);
        
        emit BountyCancelled(bountyId, creatorAgentId);
        emit BountyStatusChanged(bountyId, oldStatus, BountyStatus.Cancelled);
    }
    
    /**
     * @dev Mark expired bounties (anyone can call)
     * @param bountyId The bounty ID
     */
    function expireBounty(uint256 bountyId) external nonReentrant {
        Bounty storage bounty = _bounties[bountyId];
        require(
            bounty.status == BountyStatus.Open || 
            bounty.status == BountyStatus.Claimed ||
            bounty.status == BountyStatus.InProgress,
            "Cannot expire in current state"
        );
        require(block.timestamp > bounty.deadline, "Not expired yet");
        
        BountyStatus oldStatus = bounty.status;
        bounty.status = BountyStatus.Expired;
        
        // Refund if claimed but not submitted
        if (bounty.claimedBy > 0) {
            reputationRegistry.recordCompletion(bounty.claimedBy, bountyId, false);
        }
        
        escrow.refund(bountyId);
        _removeActiveBounty(bountyId);
        
        emit BountyExpired(bountyId);
        emit BountyStatusChanged(bountyId, oldStatus, BountyStatus.Expired);
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
    
    function getActiveBounties() external view returns (uint256[] memory) {
        return _activeBountyIds;
    }
    
    function getActiveBountiesCount() external view returns (uint256) {
        return _activeBountyIds.length;
    }
    
    function totalBounties() external view returns (uint256) {
        return _nextBountyId - 1;
    }
    
    function isBountyActive(uint256 bountyId) external view returns (bool) {
        BountyStatus status = _bounties[bountyId].status;
        return status == BountyStatus.Open || 
               status == BountyStatus.Claimed || 
               status == BountyStatus.InProgress ||
               status == BountyStatus.Submitted;
    }
    
    // ============ Internal Helpers ============
    
    /**
     * @dev Get agent ID for an address
     */
    function _getAgentId(address owner) internal view returns (uint256) {
        uint256 balance = identityRegistry.balanceOf(owner);
        if (balance == 0) return 0;
        return identityRegistry.tokenOfOwnerByIndex(owner, 0);
    }
    
    /**
     * @dev Add bounty to active list
     */
    function _addActiveBounty(uint256 bountyId) internal {
        _activeBountyIndex[bountyId] = _activeBountyIds.length;
        _activeBountyIds.push(bountyId);
    }
    
    /**
     * @dev Remove bounty from active list
     */
    function _removeActiveBounty(uint256 bountyId) internal {
        uint256 index = _activeBountyIndex[bountyId];
        uint256 lastIndex = _activeBountyIds.length - 1;
        
        if (index != lastIndex) {
            uint256 lastBountyId = _activeBountyIds[lastIndex];
            _activeBountyIds[index] = lastBountyId;
            _activeBountyIndex[lastBountyId] = index;
        }
        
        _activeBountyIds.pop();
        delete _activeBountyIndex[bountyId];
    }
}
