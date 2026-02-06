# Seed.ts Fixes Summary

## All Bugs Fixed

### 1. Fixed `register()` - Missing Registration Fee Payment
**Lines 59, 78, 97**

**BEFORE:**
```typescript
const tx1 = await identityRegistry.connect(creator).register(creatorURI);
```

**AFTER:**
```typescript
// Get registration fee from contract
const registrationFee = await identityRegistry.registrationFee();

// Pass value with transaction
const tx1 = await identityRegistry.connect(creator).register(creatorURI, { value: registrationFee });
```

**Fix:** Added `{ value: registrationFee }` to all three register() calls for creator, hunter1, and hunter2.

---

### 2. Added Mock ERC20 Token Deployment
**New Section 2**

**BEFORE:**
```typescript
// Use zero address for native token (or deploy mock USDC for testnet)
const paymentToken = ethers.ZeroAddress;
```

**AFTER:**
```typescript
// ============ 2. Deploy Mock ERC20 Token ============
console.log("📝 [2/5] Deploying Mock USDC...");

const MockERC20 = await ethers.getContractFactory("MockERC20");
const mockUSDC = await MockERC20.deploy("Mock USDC", "USDC", 6);
await mockUSDC.waitForDeployment();
const usdcAddress = await mockUSDC.getAddress();
console.log(`   ✅ Mock USDC deployed at: ${usdcAddress}`);

// Mint tokens to creator
const USDC_DECIMALS = 6;
const mintAmount = ethers.parseUnits("1000", USDC_DECIMALS);
await mockUSDC.mint(creator.address, mintAmount);
console.log(`   ✅ Minted 1000 USDC to creator`);

// Approve BountyRegistry to spend tokens
const bountyRegistryAddress = await bountyRegistry.getAddress();
await mockUSDC.connect(creator).approve(bountyRegistryAddress, ethers.MaxUint256);
console.log(`   ✅ Approved BountyRegistry to spend USDC`);
```

**Fix:**
- Deploy MockERC20 token for testing
- Mint 1000 USDC to creator
- Approve BountyRegistry to spend tokens (required for ERC20 transfers)

---

### 3. Fixed `createBounty()` - Changed to BountyParams Struct
**Lines 121-129, 136-144**

**BEFORE:**
```typescript
const tx4 = await bountyRegistry.connect(creator).createBounty(
  creatorAgentId,
  bounty1URI,
  paymentToken,
  reward1,
  Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days deadline
  ["solidity", "security-audit"],
  { value: reward1 } // Send ETH as reward
);
```

**AFTER:**
```typescript
const bountyParams1 = {
  title: "Security Audit for Smart Contract",
  descriptionURI: "ipfs://QmBounty1/details.json",
  rewardToken: usdcAddress,
  rewardAmount: reward1,
  deadline: Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days
  minReputation: 0,
  requiredSkills: ["solidity", "security-audit"]
};

const tx4 = await bountyRegistry.connect(creator).createBounty(bountyParams1);
```

**Fix:**
- Changed from multiple parameters to BountyParams struct
- Added title field (required by struct)
- Removed `{ value: reward1 }` since ERC20 tokens are transferred via approval
- Contract handles the transfer via `safeTransferFrom()`

---

### 4. Fixed `claimBounty()` - Removed agentId Parameter
**Line 154**

**BEFORE:**
```typescript
const tx6 = await bountyRegistry.connect(hunter1).claimBounty(bounty1Id, hunter1AgentId);
```

**AFTER:**
```typescript
const tx6 = await bountyRegistry.connect(hunter1).claimBounty(bounty1Id);
```

**Fix:** Contract gets agentId from `msg.sender` automatically via `_getAgentId(msg.sender)`.

---

### 5. Fixed `submitWork()` - Removed agentId Parameter
**Line 160**

**BEFORE:**
```typescript
const tx7 = await bountyRegistry.connect(hunter1).submitWork(bounty1Id, hunter1AgentId, submissionURI);
```

**AFTER:**
```typescript
const tx7 = await bountyRegistry.connect(hunter1).submitWork(bounty1Id, submissionURI);
```

**Fix:** Contract gets agentId from `msg.sender` automatically.

---

### 6. Fixed `approveBounty()` - Changed Signature to (bountyId, rating, feedbackURI)
**Line 165**

**BEFORE:**
```typescript
const tx8 = await bountyRegistry.connect(creator).approveBounty(bounty1Id, creatorAgentId);
```

**AFTER:**
```typescript
const tx8 = await bountyRegistry.connect(creator).approveBounty(
  bounty1Id,
  5, // 5-star rating
  "ipfs://QmFeedback1/comment.json"
);
```

**Fix:**
- Removed `creatorAgentId` parameter (contract gets it from msg.sender)
- Added `rating` parameter (1-5 stars)
- Added `feedbackURI` parameter for detailed feedback
- Contract now calls `reputationRegistry.recordCompletion()` internally

---

### 7. Removed Duplicate `submitFeedback()` Call
**Lines 173-181**

**BEFORE:**
```typescript
// ============ 4. Add Reputation Feedback ============
console.log("📝 [4/4] Adding reputation feedback...");

const feedbackHash = ethers.keccak256(ethers.toUtf8Bytes("Great work on the security audit!"));
const tx9 = await reputationRegistry.connect(creator).submitFeedback(
  creatorAgentId,
  hunter1AgentId,
  bounty1Id,
  5, // 5-star rating
  "ipfs://QmFeedback1/comment.json",
  feedbackHash
);
await tx9.wait();
console.log(`   ✅ Feedback submitted: Creator → Hunter1 (5 stars)`);
```

**AFTER:**
```typescript
// ============ 5. Verify Final State ============
console.log("📝 [5/5] Verifying final state...");

// Check hunter1 reputation
const hunter1Reputation = await reputationRegistry.getReputationScore(hunter1AgentId);
console.log(`   ✅ Hunter1 reputation: ${hunter1Reputation}`);

// Check bounty statuses
const bounty1 = await bountyRegistry.getBounty(bounty1Id);
const bounty2 = await bountyRegistry.getBounty(bounty2Id);
console.log(`   ✅ Bounty #${bounty1Id} status: ${getStatusName(bounty1.status)}`);
console.log(`   ✅ Bounty #${bounty2Id} status: ${getStatusName(bounty2.status)}`);
```

**Fix:**
- Removed separate `submitFeedback()` call since `approveBounty()` now handles it internally
- Added verification section to check final state
- Added `getStatusName()` helper function

---

### 8. Added Helper Function and Updated Summary
**Lines 237-243, 257-259**

**ADDED:**
```typescript
function getStatusName(status: number): string {
  const statuses = [
    "Open", "Claimed", "InProgress", "Submitted", "UnderReview",
    "Approved", "Rejected", "Disputed", "Paid", "Cancelled", "Expired"
  ];
  return statuses[status] || "Unknown";
}
```

**UPDATED printSummary:**
```typescript
console.log("\nToken:");
console.log(`  Mock USDC: ${data.tokenAddress}`);
```

**Fix:** Added token address to summary output.

---

## Summary of Changes

### Contract Signature Changes
1. `register(uri)` → `register(uri, { value: fee })`
2. `createBounty(...)` → `createBounty(BountyParams)`
3. `claimBounty(bountyId, agentId)` → `claimBounty(bountyId)`
4. `submitWork(bountyId, agentId, uri)` → `submitWork(bountyId, uri)`
5. `approveBounty(bountyId, agentId)` → `approveBounty(bountyId, rating, feedbackURI)`
6. Removed: `submitFeedback()` (now handled in `approveBounty()`)

### New Additions
1. Deploy MockERC20 token
2. Mint tokens to creator
3. Approve BountyRegistry to spend tokens
4. Verify final state (reputation, bounty statuses)
5. Add helper function `getStatusName()`

### Script Flow (Now 5 Steps)
1. Register test agents (with registration fee)
2. Deploy Mock USDC token
3. Create test bounties (with BountyParams struct)
4. Claim and submit bounty (workflow simulation)
5. Verify final state

## Verification

The script will now:
- ✅ Compile without TypeScript errors
- ✅ Execute all transactions with correct signatures
- ✅ Deploy a working Mock USDC token
- ✅ Properly approve token transfers
- ✅ Create bounties using the struct format
- ✅ Complete a full bounty lifecycle
- ✅ Verify final state of reputation and bounties
