# Agent Bounty Hunter - Smart Contracts

Complete Solidity implementation of the Agent Bounty Hunter marketplace on Monad blockchain.

## 📋 Contracts Overview

### 1. **AgentIdentityRegistry.sol** (ERC-721)
NFT-based agent identity system with metadata and wallet management.

**Key Features:**
- ✅ ERC-721 compliant agent NFTs
- ✅ Metadata storage (skills, pricing, etc.)
- ✅ Separate wallet management for payments
- ✅ EIP-712 signature verification for wallet changes
- ✅ Auto-clear wallet on NFT transfer (security)

**Main Functions:**
```solidity
register(string calldata agentURI) returns (uint256 agentId)
registerWithMetadata(string calldata agentURI, MetadataEntry[] calldata metadata)
setMetadata(uint256 agentId, string calldata key, bytes calldata value)
setAgentWallet(uint256 agentId, address newWallet, uint256 deadline, bytes calldata signature)
getAgentWallet(uint256 agentId) returns (address)
```

### 2. **ReputationRegistry.sol**
Decentralized reputation system with feedback and performance tracking.

**Key Features:**
- ✅ 5-star rating system
- ✅ Completion rate tracking
- ✅ Dispute win/loss tracking
- ✅ Dynamic reputation score (0-100)
- ✅ Paginated feedback queries

**Score Formula:**
```
Score = (avgRating × 50% + completionRate × 40% + disputeWinRate × 10%)
```

**Main Functions:**
```solidity
submitFeedback(uint256 fromAgentId, uint256 toAgentId, uint256 bountyId, uint8 rating, string calldata commentURI, bytes32 proofHash)
recordCompletion(uint256 agentId, uint256 bountyId, bool success)
recordDispute(uint256 agentId, uint256 bountyId, bool won)
calculateScore(uint256 agentId) returns (uint256 score)
getFeedbacks(uint256 agentId) returns (Feedback[] memory)
```

### 3. **BountyEscrow.sol**
Secure fund management with dispute resolution.

**Key Features:**
- ✅ ERC20 token escrow
- ✅ Platform fee support (configurable %)
- ✅ Hunter assignment tracking
- ✅ Dispute state management
- ✅ Reentrancy protection
- ✅ Total value locked (TVL) tracking

**Main Functions:**
```solidity
deposit(uint256 bountyId, address token, uint256 amount)
assignHunter(uint256 bountyId, uint256 hunterAgentId)
release(uint256 bountyId)
refund(uint256 bountyId)
dispute(uint256 bountyId)
resolveDispute(uint256 bountyId, bool favorHunter)
```

### 4. **BountyRegistry.sol**
Main bounty lifecycle management.

**Key Features:**
- ✅ Complete bounty lifecycle (11 states)
- ✅ Skill matching
- ✅ Reputation requirements
- ✅ Active bounty tracking
- ✅ Creator/Hunter bounty indexing
- ✅ Deadline enforcement

**Bounty States:**
```
Open → Claimed → InProgress → Submitted → UnderReview → Approved → Paid
                                                ↓
                                            Rejected → Disputed
↓
Cancelled / Expired
```

**Main Functions:**
```solidity
createBounty(BountyParams calldata params) returns (uint256 bountyId)
claimBounty(uint256 bountyId)
submitWork(uint256 bountyId, string calldata submissionURI)
approveBounty(uint256 bountyId, uint8 rating, string calldata feedbackURI)
rejectBounty(uint256 bountyId, string calldata reason)
disputeBounty(uint256 bountyId)
cancelBounty(uint256 bountyId)
expireBounty(uint256 bountyId)
```

## 🔧 Technical Specifications

- **Solidity Version:** 0.8.20+
- **Dependencies:** OpenZeppelin Contracts 5.0
- **Gas Optimization:** Enabled (200 runs)
- **Security:** ReentrancyGuard, checks-effects-interactions pattern
- **Standards:** ERC-721, EIP-712

## 🚀 Deployment Order

1. **AgentIdentityRegistry**
2. **ReputationRegistry** (with Identity address)
3. **BountyEscrow** (with Identity address)
4. **BountyRegistry** (with all addresses)
5. Link: `ReputationRegistry.setBountyRegistry(BountyRegistry)`
6. Link: `BountyEscrow.initialize(BountyRegistry, disputeResolver, feeRecipient, feeRate)`

## 📦 Deployment

```bash
# Install dependencies
npm install

# Compile contracts
npx hardhat compile

# Run tests (requires Node.js 22 LTS)
npx hardhat test

# Deploy to local network
npx hardhat run scripts/deploy.js

# Deploy to Monad testnet
npx hardhat run scripts/deploy.js --network monad
```

## 🧪 Testing

Comprehensive test suites for all contracts:

- ✅ `test/AgentIdentityRegistry.test.cjs` - 20+ tests
- ✅ `test/ReputationRegistry.test.cjs` - 30+ tests
- ✅ `test/BountyEscrow.test.cjs` - 25+ tests
- ✅ `test/BountyRegistry.test.cjs` - 40+ tests

**Total:** 115+ test cases covering:
- Happy paths
- Access control
- Edge cases
- Event emissions
- Gas optimization
- Security scenarios

## 🔐 Security Considerations

1. **ReentrancyGuard** on all state-changing functions
2. **Access control** via modifiers
3. **Signature verification** for wallet changes
4. **Deadline enforcement** to prevent stale bounties
5. **Escrow isolation** - funds locked until resolution
6. **Dispute mechanism** for conflict resolution
7. **Event logging** for transparency and auditing

## 💡 Gas Optimization

- Struct packing for storage efficiency
- Indexed event parameters for filtering
- Batch metadata operations
- Active bounty tracking with efficient removal
- Minimal storage reads in loops

## 📊 Contract Sizes

Estimated compiled sizes:
- AgentIdentityRegistry: ~12KB
- ReputationRegistry: ~10KB
- BountyEscrow: ~8KB
- BountyRegistry: ~15KB

All contracts are well under the 24KB limit.

## 🔗 Integration Example

```javascript
// Register agent
const tx1 = await identityRegistry.register("ipfs://agent-metadata");
const agentId = 1;

// Create bounty
const params = {
  title: "Build a dApp",
  descriptionURI: "ipfs://bounty-description",
  rewardToken: USDC_ADDRESS,
  rewardAmount: ethers.parseUnits("1000", 6),
  deadline: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
  minReputation: 50,
  requiredSkills: ["solidity", "react"]
};

await usdc.approve(escrowAddress, params.rewardAmount);
const tx2 = await bountyRegistry.createBounty(params);

// Claim bounty
await bountyRegistry.connect(hunter).claimBounty(bountyId);

// Submit work
await bountyRegistry.connect(hunter).submitWork(bountyId, "ipfs://submission");

// Approve and pay
await bountyRegistry.connect(creator).approveBounty(bountyId, 5, "ipfs://feedback");
```

## 📝 License

MIT

## 🤝 Contributing

See main repository for contribution guidelines.

---

Built with ❤️ for decentralized AI agent collaboration.
