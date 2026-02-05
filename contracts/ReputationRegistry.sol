// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./AgentIdentityRegistry.sol";

/**
 * @title ReputationRegistry
 * @notice Tracks on-chain reputation for agents
 * @dev Reputation is earned through completed bounties and ratings
 */
contract ReputationRegistry {
    // Structs
    struct Reputation {
        uint256 score;              // Current reputation score (0-100)
        uint256 completedBounties;  // Total completed
        uint256 totalEarnings;      // Total rewards earned (in wei)
        uint256 avgRating;          // Average rating (1-5 stars * 10)
        uint256 totalRatings;       // Number of ratings received
        uint256 successRate;        // Success rate (0-100)
        uint256 totalAttempts;      // Total bounties claimed
    }

    struct Review {
        uint256 bountyId;
        address reviewer;
        uint8 rating;              // 1-5 stars
        string feedback;
        uint256 timestamp;
    }

    // State variables
    AgentIdentityRegistry public immutable identityRegistry;
    address public bountyRegistry;
    
    mapping(uint256 => Reputation) private _reputations;
    mapping(uint256 => Review[]) private _reviews;
    
    // Default starting reputation
    uint256 public constant DEFAULT_REPUTATION = 50;
    
    // Events
    event ReputationUpdated(uint256 indexed agentId, uint256 newScore);
    event ReviewAdded(uint256 indexed agentId, uint256 indexed bountyId, uint8 rating);
    event BountyCompleted(uint256 indexed agentId, uint256 bountyId, uint256 reward);
    event BountyRegistrySet(address indexed bountyRegistry);

    // Errors
    error UnauthorizedCaller();
    error InvalidRating();
    error InvalidAgentId();
    error BountyRegistryNotSet();

    constructor(address _identityRegistry) {
        identityRegistry = AgentIdentityRegistry(_identityRegistry);
    }

    /**
     * @notice Set the bounty registry address (only owner)
     * @param _bountyRegistry The BountyRegistry contract address
     */
    function setBountyRegistry(address _bountyRegistry) external {
        // In production, add access control
        bountyRegistry = _bountyRegistry;
        emit BountyRegistrySet(_bountyRegistry);
    }

    /**
     * @notice Initialize reputation for a new agent
     * @param agentId The agent's unique ID
     */
    function initializeReputation(uint256 agentId) external {
        // Verify agent exists
        try identityRegistry.ownerOf(agentId) returns (address) {
            if (_reputations[agentId].score == 0) {
                _reputations[agentId].score = DEFAULT_REPUTATION;
                emit ReputationUpdated(agentId, DEFAULT_REPUTATION);
            }
        } catch {
            revert InvalidAgentId();
        }
    }

    /**
     * @notice Record bounty completion and update reputation
     * @param agentId The agent who completed the bounty
     * @param bountyId The bounty ID
     * @param reward The reward amount
     * @param rating Rating from creator (1-5)
     * @param feedback Text feedback
     */
    function recordCompletion(
        uint256 agentId,
        uint256 bountyId,
        uint256 reward,
        uint8 rating,
        string calldata feedback
    ) external {
        if (msg.sender != bountyRegistry) revert UnauthorizedCaller();
        if (rating < 1 || rating > 5) revert InvalidRating();
        
        Reputation storage rep = _reputations[agentId];
        
        // Initialize if first bounty
        if (rep.score == 0) {
            rep.score = DEFAULT_REPUTATION;
        }
        
        // Update completion stats
        rep.completedBounties++;
        rep.totalEarnings += reward;
        
        // Update rating
        uint256 totalRatingPoints = (rep.avgRating * rep.totalRatings) + (rating * 10);
        rep.totalRatings++;
        rep.avgRating = totalRatingPoints / rep.totalRatings;
        
        // Update success rate
        rep.totalAttempts++;
        rep.successRate = (rep.completedBounties * 100) / rep.totalAttempts;
        
        // Calculate new reputation score
        uint256 newScore = _calculateReputation(rep);
        rep.score = newScore;
        
        // Add review
        _reviews[agentId].push(Review({
            bountyId: bountyId,
            reviewer: msg.sender,
            rating: rating,
            feedback: feedback,
            timestamp: block.timestamp
        }));
        
        emit BountyCompleted(agentId, bountyId, reward);
        emit ReviewAdded(agentId, bountyId, rating);
        emit ReputationUpdated(agentId, newScore);
    }

    /**
     * @notice Record bounty failure (rejected/disputed)
     * @param agentId The agent who failed
     */
    function recordFailure(uint256 agentId) external {
        if (msg.sender != bountyRegistry) revert UnauthorizedCaller();
        
        Reputation storage rep = _reputations[agentId];
        
        if (rep.score == 0) {
            rep.score = DEFAULT_REPUTATION;
        }
        
        rep.totalAttempts++;
        rep.successRate = (rep.completedBounties * 100) / rep.totalAttempts;
        
        // Penalty for failure
        if (rep.score > 5) {
            rep.score -= 5;
        }
        
        emit ReputationUpdated(agentId, rep.score);
    }

    /**
     * @notice Calculate reputation score based on various factors
     * @param rep The reputation struct
     * @return The calculated score (0-100)
     */
    function _calculateReputation(Reputation memory rep) private pure returns (uint256) {
        // Base score from avg rating (max 40 points)
        uint256 ratingScore = (rep.avgRating * 40) / 50; // 5 stars * 10 = 50
        
        // Completion bonus (max 30 points)
        uint256 completionScore = rep.completedBounties > 30 
            ? 30 
            : rep.completedBounties;
        
        // Success rate (max 30 points)
        uint256 successScore = (rep.successRate * 30) / 100;
        
        uint256 total = ratingScore + completionScore + successScore;
        
        return total > 100 ? 100 : total;
    }

    /**
     * @notice Get agent's reputation
     * @param agentId The agent's ID
     * @return The reputation struct
     */
    function getReputation(uint256 agentId) 
        external 
        view 
        returns (Reputation memory) 
    {
        Reputation memory rep = _reputations[agentId];
        if (rep.score == 0) {
            rep.score = DEFAULT_REPUTATION;
        }
        return rep;
    }

    /**
     * @notice Get agent's reputation score
     * @param agentId The agent's ID
     * @return The reputation score
     */
    function getReputationScore(uint256 agentId) external view returns (uint256) {
        uint256 score = _reputations[agentId].score;
        return score == 0 ? DEFAULT_REPUTATION : score;
    }

    /**
     * @notice Get all reviews for an agent
     * @param agentId The agent's ID
     * @return Array of reviews
     */
    function getReviews(uint256 agentId) external view returns (Review[] memory) {
        return _reviews[agentId];
    }

    /**
     * @notice Check if agent meets minimum reputation requirement
     * @param agentId The agent's ID
     * @param minReputation The minimum required reputation
     * @return Whether agent meets requirement
     */
    function meetsRequirement(uint256 agentId, uint256 minReputation) 
        external 
        view 
        returns (bool) 
    {
        uint256 score = _reputations[agentId].score;
        if (score == 0) {
            score = DEFAULT_REPUTATION;
        }
        return score >= minReputation;
    }
}
