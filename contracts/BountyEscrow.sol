// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./AgentIdentityRegistry.sol";

/**
 * @title BountyEscrow
 * @dev Secure escrow for bounty rewards with dispute handling
 * @notice Holds funds until bounty completion or dispute resolution
 */
contract BountyEscrow is ReentrancyGuard {
    using SafeERC20 for IERC20;
    
    // ============ Enums ============
    
    /**
     * @dev Escrow status states
     */
    enum EscrowStatus {
        None,           // No escrow exists
        Locked,         // Funds locked, awaiting completion
        Released,       // Funds released to hunter
        Refunded,       // Funds refunded to creator
        Disputed        // Under dispute resolution
    }
    
    // ============ Structs ============
    
    /**
     * @dev Escrow information structure
     */
    struct EscrowInfo {
        address token;              // ERC20 token address (or address(0) for native)
        uint256 amount;             // Escrowed amount
        address depositor;          // Original depositor (bounty creator)
        uint256 hunterAgentId;      // Agent ID assigned to complete bounty
        EscrowStatus status;        // Current status
        uint256 createdAt;          // Timestamp of deposit
        uint256 releasedAt;         // Timestamp of release/refund
    }
    
    // ============ Storage ============
    
    /// @dev Reference to AgentIdentityRegistry for wallet resolution
    AgentIdentityRegistry public immutable identityRegistry;
    
    /// @dev Address of BountyRegistry (authorized to manage escrow)
    address public bountyRegistry;
    
    /// @dev Address authorized to resolve disputes
    address public disputeResolver;
    
    /// @dev Platform fee recipient
    address public feeRecipient;
    
    /// @dev Platform fee rate in basis points (100 = 1%)
    uint256 public feeRate;
    
    /// @dev bountyId => escrow information
    mapping(uint256 => EscrowInfo) private _escrows;
    
    /// @dev Track total value locked per token
    mapping(address => uint256) private _totalLocked;
    
    // ============ Events ============
    
    /**
     * @dev Emitted when funds are deposited into escrow
     */
    event Deposited(
        uint256 indexed bountyId, 
        address indexed token, 
        uint256 amount, 
        address indexed depositor
    );
    
    /**
     * @dev Emitted when escrow is released to hunter
     */
    event Released(
        uint256 indexed bountyId, 
        address indexed recipient, 
        uint256 amount,
        uint256 fee
    );
    
    /**
     * @dev Emitted when escrow is refunded to creator
     */
    event Refunded(
        uint256 indexed bountyId, 
        address indexed recipient, 
        uint256 amount
    );
    
    /**
     * @dev Emitted when escrow enters dispute
     */
    event Disputed(uint256 indexed bountyId);
    
    /**
     * @dev Emitted when dispute is resolved
     */
    event DisputeResolved(
        uint256 indexed bountyId, 
        address indexed winner, 
        uint256 amount,
        bool favoredHunter
    );
    
    /**
     * @dev Emitted when hunter is assigned to escrow
     */
    event HunterAssigned(
        uint256 indexed bountyId,
        uint256 indexed hunterAgentId
    );
    
    // ============ Modifiers ============
    
    /**
     * @dev Restricts access to BountyRegistry
     */
    modifier onlyBountyRegistry() {
        require(msg.sender == bountyRegistry, "Only BountyRegistry");
        _;
    }
    
    /**
     * @dev Restricts access to dispute resolver
     */
    modifier onlyDisputeResolver() {
        require(msg.sender == disputeResolver, "Only DisputeResolver");
        _;
    }
    
    // ============ Constructor ============
    
    /**
     * @dev Initialize escrow contract
     * @param _identityRegistry AgentIdentityRegistry address
     */
    constructor(address _identityRegistry) {
        require(_identityRegistry != address(0), "Invalid identity registry");
        identityRegistry = AgentIdentityRegistry(_identityRegistry);
    }
    
    /**
     * @dev Initialize contract addresses (can only be called once)
     * @param _bountyRegistry BountyRegistry address
     * @param _disputeResolver Dispute resolver address
     * @param _feeRecipient Fee recipient address
     * @param _feeRate Fee rate in basis points
     */
    function initialize(
        address _bountyRegistry, 
        address _disputeResolver,
        address _feeRecipient,
        uint256 _feeRate
    ) external {
        require(bountyRegistry == address(0), "Already initialized");
        require(_bountyRegistry != address(0), "Invalid bounty registry");
        require(_disputeResolver != address(0), "Invalid dispute resolver");
        require(_feeRecipient != address(0), "Invalid fee recipient");
        require(_feeRate <= 1000, "Fee rate too high"); // Max 10%
        
        bountyRegistry = _bountyRegistry;
        disputeResolver = _disputeResolver;
        feeRecipient = _feeRecipient;
        feeRate = _feeRate;
    }
    
    // ============ Core Functions ============
    
    /**
     * @dev Deposit funds into escrow
     * @param bountyId The bounty ID
     * @param token ERC20 token address
     * @param amount Amount to escrow
     */
    function deposit(uint256 bountyId, address token, uint256 amount) 
        external 
        onlyBountyRegistry 
    {
        require(_escrows[bountyId].status == EscrowStatus.None, "Escrow already exists");
        require(amount > 0, "Amount must be positive");
        
        _escrows[bountyId] = EscrowInfo({
            token: token,
            amount: amount,
            depositor: tx.origin,
            hunterAgentId: 0,
            status: EscrowStatus.Locked,
            createdAt: block.timestamp,
            releasedAt: 0
        });
        
        _totalLocked[token] += amount;
        
        emit Deposited(bountyId, token, amount, tx.origin);
    }
    
    /**
     * @dev Assign hunter to the escrow
     * @param bountyId The bounty ID
     * @param hunterAgentId The hunter's agent ID
     */
    function assignHunter(uint256 bountyId, uint256 hunterAgentId) 
        external 
        onlyBountyRegistry 
    {
        require(_escrows[bountyId].status == EscrowStatus.Locked, "Invalid escrow status");
        require(hunterAgentId > 0, "Invalid hunter ID");
        
        _escrows[bountyId].hunterAgentId = hunterAgentId;
        
        emit HunterAssigned(bountyId, hunterAgentId);
    }
    
    /**
     * @dev Release escrowed funds to hunter
     * @param bountyId The bounty ID
     */
    function release(uint256 bountyId) external onlyBountyRegistry nonReentrant {
        EscrowInfo storage info = _escrows[bountyId];
        require(info.status == EscrowStatus.Locked, "Cannot release");
        require(info.hunterAgentId > 0, "No hunter assigned");
        
        info.status = EscrowStatus.Released;
        info.releasedAt = block.timestamp;
        
        // Calculate fee
        uint256 fee = (info.amount * feeRate) / 10000;
        uint256 hunterAmount = info.amount - fee;
        
        // Get hunter's wallet
        address hunterWallet = identityRegistry.getAgentWallet(info.hunterAgentId);
        if (hunterWallet == address(0)) {
            // Fallback to NFT owner if no wallet set
            hunterWallet = identityRegistry.ownerOf(info.hunterAgentId);
        }
        
        _totalLocked[info.token] -= info.amount;
        
        // Transfer funds
        if (fee > 0) {
            IERC20(info.token).safeTransfer(feeRecipient, fee);
        }
        IERC20(info.token).safeTransfer(hunterWallet, hunterAmount);
        
        emit Released(bountyId, hunterWallet, hunterAmount, fee);
    }
    
    /**
     * @dev Refund escrowed funds to creator
     * @param bountyId The bounty ID
     */
    function refund(uint256 bountyId) external onlyBountyRegistry nonReentrant {
        EscrowInfo storage info = _escrows[bountyId];
        require(
            info.status == EscrowStatus.Locked || info.status == EscrowStatus.Disputed, 
            "Cannot refund"
        );
        
        info.status = EscrowStatus.Refunded;
        info.releasedAt = block.timestamp;
        
        _totalLocked[info.token] -= info.amount;
        
        IERC20(info.token).safeTransfer(info.depositor, info.amount);
        
        emit Refunded(bountyId, info.depositor, info.amount);
    }
    
    /**
     * @dev Mark escrow as disputed
     * @param bountyId The bounty ID
     */
    function dispute(uint256 bountyId) external onlyBountyRegistry {
        EscrowInfo storage info = _escrows[bountyId];
        require(info.status == EscrowStatus.Locked, "Cannot dispute");
        
        info.status = EscrowStatus.Disputed;
        
        emit Disputed(bountyId);
    }
    
    /**
     * @dev Resolve dispute and distribute funds
     * @param bountyId The bounty ID
     * @param favorHunter True to release to hunter, false to refund to creator
     */
    function resolveDispute(uint256 bountyId, bool favorHunter) 
        external 
        onlyDisputeResolver 
        nonReentrant 
    {
        EscrowInfo storage info = _escrows[bountyId];
        require(info.status == EscrowStatus.Disputed, "Not in dispute");
        
        address winner;
        uint256 fee = 0;
        uint256 payout = info.amount;
        
        if (favorHunter) {
            require(info.hunterAgentId > 0, "No hunter assigned");
            
            // Calculate fee for hunter payout
            fee = (info.amount * feeRate) / 10000;
            payout = info.amount - fee;
            
            // Get hunter wallet
            address hunterWallet = identityRegistry.getAgentWallet(info.hunterAgentId);
            if (hunterWallet == address(0)) {
                hunterWallet = identityRegistry.ownerOf(info.hunterAgentId);
            }
            winner = hunterWallet;
            
            info.status = EscrowStatus.Released;
        } else {
            winner = info.depositor;
            info.status = EscrowStatus.Refunded;
        }
        
        info.releasedAt = block.timestamp;
        _totalLocked[info.token] -= info.amount;
        
        // Transfer funds
        if (fee > 0) {
            IERC20(info.token).safeTransfer(feeRecipient, fee);
        }
        IERC20(info.token).safeTransfer(winner, payout);
        
        emit DisputeResolved(bountyId, winner, payout, favorHunter);
    }
    
    // ============ View Functions ============
    
    /**
     * @dev Get escrow information
     * @param bountyId The bounty ID
     * @return Escrow details
     */
    function getEscrow(uint256 bountyId) 
        external view 
        returns (EscrowInfo memory) 
    {
        return _escrows[bountyId];
    }
    
    /**
     * @dev Get current locked balance for a bounty
     * @param bountyId The bounty ID
     * @return token Token address
     * @return amount Locked amount (0 if released/refunded)
     */
    function getEscrowBalance(uint256 bountyId) 
        external view 
        returns (address token, uint256 amount) 
    {
        EscrowInfo storage info = _escrows[bountyId];
        
        if (info.status == EscrowStatus.Locked || info.status == EscrowStatus.Disputed) {
            return (info.token, info.amount);
        }
        
        return (info.token, 0);
    }
    
    /**
     * @dev Check if escrow is locked
     * @param bountyId The bounty ID
     * @return locked True if funds are locked
     */
    function isLocked(uint256 bountyId) external view returns (bool locked) {
        EscrowStatus status = _escrows[bountyId].status;
        return status == EscrowStatus.Locked || status == EscrowStatus.Disputed;
    }
    
    /**
     * @dev Check if escrow is disputed
     * @param bountyId The bounty ID
     * @return disputed True if in dispute
     */
    function isDisputed(uint256 bountyId) external view returns (bool disputed) {
        return _escrows[bountyId].status == EscrowStatus.Disputed;
    }
    
    /**
     * @dev Get escrow status
     * @param bountyId The bounty ID
     * @return status Current escrow status
     */
    function getStatus(uint256 bountyId) external view returns (EscrowStatus status) {
        return _escrows[bountyId].status;
    }
    
    /**
     * @dev Get total value locked for a token
     * @param token Token address
     * @return amount Total locked amount
     */
    function getTotalLocked(address token) external view returns (uint256 amount) {
        return _totalLocked[token];
    }
    
    /**
     * @dev Calculate fee for an amount
     * @param amount The amount
     * @return fee The platform fee
     */
    function calculateFee(uint256 amount) external view returns (uint256 fee) {
        return (amount * feeRate) / 10000;
    }
}
