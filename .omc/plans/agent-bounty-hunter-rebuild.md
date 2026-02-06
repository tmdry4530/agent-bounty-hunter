# Agent Bounty Hunter - Rebuild Plan (Refined)

> **Created:** 2026-02-05
> **Refined:** 2026-02-05 (ralplan iteration)
> **Critic Review:** PASSED (Iteration 1) - 43/43 bugs verified correct
> **Strategy:** Rebuild selectively - contracts first, then backend
> **Priority:** Smart contracts --> Local deployment --> Backend --> SDK
> **Target:** Monad mainnet (Chain ID 143), local Hardhat first

---

## Executive Summary

The current codebase has an MVP implementation with critical mismatches between the SPEC and actual code. The SPEC calls for Foundry + Bun + Hono + Drizzle + viem, but the implementation uses Hardhat + Express + ethers.js with no ORM or database. Smart contracts have **compile-blocking interface mismatches** between dependent contracts, and every script (deploy, seed) calls functions with wrong signatures. This plan rebuilds selectively: keeping what works, fixing what's broken, and building what's missing.

---

## Current State Assessment

### What Works (Keep)
- Project structure and directory layout
- Docker Compose setup (PostgreSQL, Redis, API, Indexer, Nginx) -- needs path fixes
- Smart contract architecture and design (4 contracts with correct dependency flow)
- Type definitions and error codes (`backend/src/types/index.ts`) -- good foundation
- `.env.example` templates
- Hardhat config (`hardhat.config.ts`) -- already correct chain ID 143
- Root `package.json` scripts for Hardhat compilation

### What's Broken (Fix) -- VERIFIED WITH LINE REFERENCES

**Smart Contract Bugs (compile-blocking):**

| # | File:Line | Bug | Severity |
|---|-----------|-----|----------|
| 1 | `contracts/AgentIdentityRegistry.sol:106` | `!_ownerOf(agentId) == address(0)` -- operator precedence: `!` negates the address to bool before comparing. Should be `_ownerOf(agentId) == address(0)`. | HIGH |
| 2 | `contracts/AgentIdentityRegistry.sol:4` | Only extends `ERC721`, not `ERC721Enumerable`. `BountyRegistry._getAgentId()` calls `tokenOfOwnerByIndex()` which requires Enumerable. Won't compile. | CRITICAL |
| 3 | `contracts/BountyRegistry.sol:248` | `(uint256 reputation,) = reputationRegistry.getReputation(hunterAgentId)` -- tries to destructure as tuple, but `getReputation()` returns `Reputation memory` struct. Won't compile. | CRITICAL |
| 4 | `contracts/BountyRegistry.sol:325-332` | Calls `reputationRegistry.submitFeedback(creatorAgentId, bounty.claimedBy, bountyId, rating, feedbackURI, keccak256(...))` -- 6 args, but **no `submitFeedback` function exists** in ReputationRegistry. Won't compile. | CRITICAL |
| 5 | `contracts/BountyRegistry.sol:333` | Calls `reputationRegistry.recordCompletion(bounty.claimedBy, bountyId, true)` -- 3 args `(uint256,uint256,bool)`, but actual signature is `recordCompletion(uint256,uint256,uint256,uint8,string)` -- 5 args. Won't compile. | CRITICAL |
| 6 | `contracts/BountyRegistry.sol:367` | `rejectBounty` calls `recordCompletion(bounty.claimedBy, bountyId, false)` -- same 3-arg mismatch. Should call `recordFailure(bounty.claimedBy)` instead. Won't compile. | CRITICAL |
| 7 | `contracts/BountyRegistry.sol:443` | `expireBounty` also calls `recordCompletion(bounty.claimedBy, bountyId, false)` -- same wrong signature. Should call `recordFailure()`. | CRITICAL |
| 8 | `contracts/ReputationRegistry.sol:61` | `setBountyRegistry()` has **no access control** -- anyone can change the bountyRegistry address. Comment says "In production, add access control". | HIGH |
| 9 | `contracts/BountyEscrow.sol:158-174` | `initialize()` has no access control beyond `already initialized` check. Can be front-run by attacker to set malicious bountyRegistry/disputeResolver/feeRecipient. | HIGH |
| 10 | `contracts/BountyEscrow.sol:194` | `depositor: tx.origin` -- uses `tx.origin` for depositor tracking. Security anti-pattern; should receive depositor as parameter from BountyRegistry. | MEDIUM |
| 11 | `contracts/mocks/MockERC20.sol:11` | Default 18 decimals, but USDC has 6 decimals. Tests need a `decimals()` override or separate mock. | LOW |

**Deployment & Seed Script Bugs (all broken):**

| # | File:Line | Bug |
|---|-----------|-----|
| 12 | `scripts/deploy.ts:60` | `AgentIdentityRegistry.deploy()` with 0 args -- constructor requires `_registrationFee` (1 arg). |
| 13 | `scripts/deploy.ts:91` | `BountyEscrow.deploy()` with 0 args -- constructor requires `_identityRegistry` (1 arg). |
| 14 | `scripts/deploy.ts:126` | Calls `reputationRegistry.setAuthorizedCaller()` -- function doesn't exist. Should be `setBountyRegistry()`. |
| 15 | `scripts/deploy.ts:131` | Calls `bountyEscrow.setAuthorizedRegistry()` -- function doesn't exist. Should be `initialize()` with 4 args. |
| 16 | `scripts/seed.ts:121-128` | `createBounty(agentId, uri, token, amount, deadline, skills, {value})` -- positional args. Actual contract takes `BountyParams` struct, no native ETH. |
| 17 | `scripts/seed.ts:154` | `claimBounty(bountyId, agentId)` -- 2 args. Actual: `claimBounty(bountyId)` -- 1 arg (agent derived from msg.sender). |
| 18 | `scripts/seed.ts:160` | `submitWork(bountyId, agentId, uri)` -- 3 args. Actual: `submitWork(bountyId, uri)` -- 2 args. |
| 19 | `scripts/seed.ts:165` | `approveBounty(bountyId, agentId)` -- 2 args. Actual: `approveBounty(bountyId, rating, feedbackURI)` -- 3 args. |
| 20 | `scripts/seed.ts:174` | Calls `reputationRegistry.submitFeedback()` directly -- function doesn't exist in ReputationRegistry. |
| 21 | `scripts/seed.ts:59,78,97` | `register(uri)` without sending ETH for `registrationFee`. Will revert with `InsufficientFee()`. |

**Backend ABI + Logic Mismatches:**

| # | File:Line | Bug |
|---|-----------|-----|
| 22 | `backend/src/contracts/IAgentRegistry.ts:9` | Defines `registerAgent(string)` -- actual is `register(string)`. |
| 23 | `backend/src/contracts/IAgentRegistry.ts:11` | Defines `getAgent(uint256)` returning `(wallet, owner, uri, active)` -- no such function in contract. |
| 24 | `backend/src/contracts/IAgentRegistry.ts:12` | Defines `getAgentByWallet(address)` -- doesn't exist. |
| 25 | `backend/src/contracts/IAgentRegistry.ts:14` | `getMetadata` returns `string` -- actual returns `bytes`. |
| 26 | `backend/src/contracts/IAgentRegistry.ts:16-17` | `submitFeedback` and `getReputation` are on AgentRegistry ABI but belong to ReputationRegistry. |
| 27 | `backend/src/contracts/IBountyRegistry.ts:14` | `createBounty(string,string,address,uint256,uint256,uint256[],uint256)` -- positional args with `uint256[]` skills. Actual takes `BountyParams` struct with `string[]` skills. |
| 28 | `backend/src/contracts/IBountyRegistry.ts:18` | `approveBounty(uint256)` -- 1 arg. Actual: 3 args `(bountyId, rating, feedbackURI)`. |
| 29 | `backend/src/contracts/IBountyEscrow.ts` | Simplified ABI missing most functions (`initialize`, `assignHunter`, `resolveDispute`, etc.). |
| 30 | `backend/src/middleware/auth.ts:60` | Calls `registry.getAgent(agentId)` which doesn't exist. |
| 31 | `backend/src/routes/agents.ts:39` | Calls `registry.registerAgent()` -- function is `register()`. |
| 32 | `backend/src/routes/agents.ts:51` | Parses `AgentRegistered` event -- actual event is `Registered`. |
| 33 | `backend/src/routes/agents.ts:58` | Calls `updateMetadata()` -- function is `setMetadata()` and takes `bytes` not `string`. |
| 34 | `backend/src/routes/agents.ts:124` | Calls `registry.getReputation()` -- lives on ReputationRegistry, not AgentRegistry. |
| 35 | `backend/src/routes/bounties.ts:185-193` | `createBounty()` called with positional args matching wrong ABI. |
| 36 | `backend/src/routes/bounties.ts:255` | `bounty.status !== 1` -- checks for status `1` as "Open", but `Open = 0` in the enum. Should be `!== 0`. |
| 37 | `backend/src/routes/bounties.ts:379` | `approveBounty(bountyId)` -- 1 arg. Needs 3 args. |
| 38 | `backend/src/server.ts:110` | Chain ID defaults to `41454` -- should be `143`. |
| 39 | `backend/src/server.ts:191` | `CHAIN_ID === '41454'` check for "Monad" -- should be `'143'`. |
| 40 | `backend/src/utils/eip712.ts:57` | Chain ID defaults to `'41454'` -- should be `'143'`. |

**Infrastructure Mismatches:**

| # | File:Line | Bug |
|---|-----------|-----|
| 41 | `docker-compose.yml:18` | References `./api/database/init.sql` -- file doesn't exist; `api/` only has `package.json`. |
| 42 | `Dockerfile:24,37-38,46-47` | References `api/` directory throughout -- should be `backend/` or new unified structure. |
| 43 | Root `package.json:22-24` | Scripts `api:dev`, `api:build`, `api:start` reference `cd api &&` -- orphaned `api/` dir. |

### What's Missing (Build)
1. Foundry test setup (user chose Foundry for testing)
2. Backend rewrite: Express --> Bun + Hono
3. Database layer: Drizzle ORM + PostgreSQL schema
4. Redis integration for caching
5. Real x402 middleware with dev bypass (current impl uses custom verification, not `@x402/hono`)
6. IPFS/Pinata integration
7. Event indexer service
8. TypeScript SDK client
9. Webhook endpoints (SPEC section 4.2 lists webhook CRUD)
10. Working search endpoints (currently return empty arrays)
11. Working bounty listing with filters/pagination (currently stub)

---

## Phase 0: Cleanup & Standardization

**Goal:** Eliminate inconsistencies before any implementation work.
**Estimated scope:** ~10 files modified, ~5 files deleted

### 0.1 Standardize Chain ID

All instances must use `143`:

- [ ] `backend/src/server.ts:110` -- change default from `'41454'` to `'143'`
- [ ] `backend/src/server.ts:191` -- change `'41454'` comparison to `'143'`
- [ ] `backend/src/utils/eip712.ts:57` -- change default from `'41454'` to `'143'`
- [ ] `backend/src/middleware/x402.ts:30` -- change default from `'41454'` to `'143'`
- [ ] All `.env.example` files -- set `CHAIN_ID=143`

**Verification:** `grep -rn "41454" --include="*.ts" --include="*.sol" --include="*.json" --include="*.yml" --include="*.env*" .` returns zero results. Documentation files (docs/, README, etc.) will be updated separately.

### 0.2 Remove Duplicate/Dead Code

- [ ] Delete `api/package.json` (conflicts with `backend/`; docker-compose refs will be updated in Phase 5)
- [ ] Delete `hardhat.config.cjs` if it exists (keep `.ts` only, project uses ESM)
- [ ] Delete `test/*.test.cjs` files if they exist (duplicates of `.ts` tests)
- [ ] Delete `scripts/deploy.js` if it exists (redundant with `.ts` version)
- [ ] Keep existing Hardhat `.ts` tests as reference but they won't pass until contracts are fixed

**Verification:** `ls api/` returns empty or error; no `.cjs` test files remain.

### 0.3 Fix Deployment Script (`scripts/deploy.ts`)

Current script is completely broken. Fix all call signatures:

- [ ] Line 60: `AgentIdentityRegistry.deploy()` --> `AgentIdentityRegistry.deploy(registrationFee)` where `registrationFee` is configurable (e.g., `ethers.parseEther("0.001")`)
- [ ] Line 91: `BountyEscrow.deploy()` --> `BountyEscrow.deploy(identityAddress)`
- [ ] Line 126: `reputationRegistry.setAuthorizedCaller(bountyAddress, true)` --> `reputationRegistry.setBountyRegistry(bountyAddress)`
- [ ] Line 131: `bountyEscrow.setAuthorizedRegistry(bountyAddress)` --> `bountyEscrow.initialize(bountyAddress, disputeResolver, feeRecipient, feeRate)` where disputeResolver=deployer, feeRecipient=deployer, feeRate=100 (1%)

**Verification:** `npx hardhat compile && npx hardhat run scripts/deploy.ts --network hardhat` succeeds (after Phase 1 contract fixes).

### 0.4 Fix Seed Script (`scripts/seed.ts`)

Every contract call in the seed script is wrong. Fix all:

- [ ] Lines 59,78,97: `register(uri)` --> `register(uri, { value: registrationFee })` to pay the fee
- [ ] Lines 121-128: Replace positional `createBounty()` call with struct-based: `createBounty({ title, descriptionURI, rewardToken, rewardAmount, deadline, minReputation, requiredSkills })`
- [ ] Line 136-147: Same fix for second bounty
- [ ] Line 117: Use a deployed MockERC20 address for `paymentToken` instead of `ethers.ZeroAddress` (escrow uses `IERC20.safeTransfer`)
- [ ] Add ERC20 approve step before `createBounty` (contract does `safeTransferFrom`)
- [ ] Line 154: `claimBounty(bountyId, agentId)` --> `claimBounty(bountyId)` (1 arg)
- [ ] Line 160: `submitWork(bountyId, agentId, uri)` --> `submitWork(bountyId, uri)` (2 args)
- [ ] Line 165: `approveBounty(bountyId, agentId)` --> `approveBounty(bountyId, rating, feedbackURI)` (3 args)
- [ ] Lines 174-183: Remove `reputationRegistry.submitFeedback()` call entirely -- reputation is recorded internally by BountyRegistry during `approveBounty`

**Verification:** `npx hardhat run scripts/seed.ts --network localhost` succeeds against a running local node with deployed contracts.

### Phase 0 Acceptance Criteria
- Zero instances of chain ID `41454` in codebase
- No duplicate configuration files (`.cjs`, `api/`)
- `deploy.ts` and `seed.ts` have no syntax errors (full compilation verified after Phase 1 typechain generation)
- All changes committed as: `fix: standardize chain ID and fix deployment scripts`

---

## Phase 1: Smart Contract Fixes & Foundry Test Setup

**Goal:** Get all 4 contracts compiling, deploying, and passing tests locally.
**Estimated scope:** ~15 files modified/created
**Depends on:** Phase 0

### 1.1 Fix AgentIdentityRegistry (`contracts/AgentIdentityRegistry.sol`)

- [ ] **Line 4:** Change `import ...ERC721.sol` to also import `ERC721Enumerable`:
  ```
  import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
  ```
- [ ] **Line 14:** Change `is ERC721, Ownable, EIP712` to `is ERC721Enumerable, Ownable, EIP712`
- [ ] **Line 41:** Update constructor to call `ERC721Enumerable` (no extra args needed -- it inherits from ERC721)
- [ ] **Line 106:** Fix operator precedence: `if (!_ownerOf(agentId) == address(0))` --> `if (_ownerOf(agentId) == address(0))`
- [ ] Override `_update` and `supportsInterface` as required by ERC721Enumerable + ERC721 diamond inheritance
- [ ] Keep all OZ import paths as `@openzeppelin/contracts/...` (compatible with Hardhat node_modules)

**Verification:** `npx hardhat compile` succeeds with zero warnings on this contract.

### 1.2 Fix ReputationRegistry (`contracts/ReputationRegistry.sol`)

- [ ] **Line 61:** Add access control to `setBountyRegistry()`:
  ```solidity
  address public owner;
  constructor(address _identityRegistry) {
      identityRegistry = AgentIdentityRegistry(_identityRegistry);
      owner = msg.sender;
  }
  function setBountyRegistry(address _bountyRegistry) external {
      require(msg.sender == owner, "Only owner");
      bountyRegistry = _bountyRegistry;
      emit BountyRegistrySet(_bountyRegistry);
  }
  ```
  Or use OZ `Ownable` pattern. The simplest fix is to add `Ownable` inheritance.

- [ ] Keep existing `recordCompletion(uint256,uint256,uint256,uint8,string)` as-is -- it's the correct 5-arg version. BountyRegistry will be fixed to call it properly.

- [ ] Keep existing `recordFailure(uint256)` as-is -- BountyRegistry will use it for rejections/expiry.

- [ ] Do NOT add a `submitFeedback` function. The `recordCompletion` already handles rating and feedback storage. BountyRegistry will be fixed to use `recordCompletion` with all 5 args instead of calling nonexistent `submitFeedback`.

**Verification:** `npx hardhat compile` succeeds; `getReputation()` returns `Reputation memory` struct as designed.

### 1.3 Fix BountyEscrow (`contracts/BountyEscrow.sol`)

- [ ] **Line 158-174:** Add deployer-based access control to `initialize()`:
  ```solidity
  address private immutable _deployer;
  constructor(address _identityRegistry) {
      // ... existing code ...
      _deployer = msg.sender;
  }
  function initialize(...) external {
      require(msg.sender == _deployer, "Only deployer");
      // ... rest unchanged ...
  }
  ```

- [ ] **Line 194:** Replace `tx.origin` with parameter from BountyRegistry:
  ```solidity
  function deposit(uint256 bountyId, address token, uint256 amount, address depositor) external onlyBountyRegistry {
      // ...
      _escrows[bountyId] = EscrowInfo({
          // ...
          depositor: depositor,  // was tx.origin
          // ...
      });
  }
  ```
  And update BountyRegistry's `createBounty` to pass `msg.sender` as the depositor arg.

- [ ] **Line 203:** Update emit to also use depositor parameter: `emit Deposited(bountyId, token, amount, depositor)` instead of `emit Deposited(bountyId, token, amount, tx.origin)`

**Verification:** `npx hardhat compile` succeeds. `initialize()` can only be called by deployer. No `tx.origin` usage.

### 1.4 Fix BountyRegistry (`contracts/BountyRegistry.sol`)

This contract has the most bugs. All fixes:

- [ ] **Line 248:** Fix `claimBounty` reputation check. Replace:
  ```solidity
  (uint256 reputation,) = reputationRegistry.getReputation(hunterAgentId);
  ```
  With:
  ```solidity
  uint256 reputation = reputationRegistry.getReputationScore(hunterAgentId);
  ```
  (Use the dedicated `getReputationScore()` view function that returns a single `uint256`.)

- [ ] **Lines 325-333:** Fix `approveBounty`. Replace the `submitFeedback` + `recordCompletion` block:
  ```solidity
  // OLD (broken):
  reputationRegistry.submitFeedback(creatorAgentId, bounty.claimedBy, bountyId, rating, feedbackURI, keccak256(bytes(bounty.submissionURI)));
  reputationRegistry.recordCompletion(bounty.claimedBy, bountyId, true);

  // NEW (correct):
  reputationRegistry.recordCompletion(
      bounty.claimedBy,
      bountyId,
      bounty.rewardAmount,
      rating,
      feedbackURI
  );
  ```

- [ ] **Line 367:** Fix `rejectBounty`. Replace:
  ```solidity
  reputationRegistry.recordCompletion(bounty.claimedBy, bountyId, false);
  ```
  With:
  ```solidity
  reputationRegistry.recordFailure(bounty.claimedBy);
  ```

- [ ] **Line 443:** Fix `expireBounty`. Same fix -- replace `recordCompletion(3 args)` with `recordFailure(agentId)`:
  ```solidity
  if (bounty.claimedBy > 0) {
      reputationRegistry.recordFailure(bounty.claimedBy);
  }
  ```

- [ ] **Line 221:** Update `deposit()` call to pass depositor:
  ```solidity
  escrow.deposit(bountyId, params.rewardToken, params.rewardAmount, msg.sender);
  ```

- [ ] **Line 503:** `_getAgentId` calls `tokenOfOwnerByIndex` -- this will work once AgentIdentityRegistry extends ERC721Enumerable (Phase 1.1).

**Verification:** `npx hardhat compile` succeeds with zero errors across all 4 contracts.

### 1.5 Fix MockERC20 (`contracts/mocks/MockERC20.sol`)

- [ ] Add configurable decimals for USDC testing:
  ```solidity
  uint8 private _decimals;
  constructor(string memory name, string memory symbol, uint8 decimals_) ERC20(name, symbol) {
      _decimals = decimals_;
  }
  function decimals() public view override returns (uint8) {
      return _decimals;
  }
  ```

- [ ] Update `contracts/README.md` to reflect corrected function signatures (remove `submitFeedback`, update `recordCompletion` to 5-arg signature, update `recordFailure` usage)

**Verification:** `MockERC20("USDC", "USDC", 6).decimals() == 6`.

### 1.6 Add Foundry Test Setup

- [ ] Install Foundry: `curl -L https://foundry.paradigm.xyz | bash && foundryup`
- [ ] Create `foundry.toml`:
  ```toml
  [profile.default]
  src = "contracts"
  out = "out"
  libs = ["node_modules"]
  solc = "0.8.20"
  optimizer = true
  optimizer_runs = 200

  [profile.default.remappings]
  "@openzeppelin/" = "node_modules/@openzeppelin/"
  ```
- [ ] Create `test/foundry/` directory structure
- [ ] Write Foundry tests for each contract:
  - `test/foundry/AgentIdentityRegistry.t.sol`:
    - Test registration with correct fee
    - Test registration reverts with insufficient fee
    - Test metadata set/get
    - Test getMetadata bug fix (was operator precedence)
    - Test tokenOfOwnerByIndex works (ERC721Enumerable)
    - Test wallet management with EIP-712 signature
    - Test setRegistrationFee (onlyOwner)
  - `test/foundry/ReputationRegistry.t.sol`:
    - Test setBountyRegistry access control (onlyOwner)
    - Test initializeReputation
    - Test recordCompletion updates all fields correctly
    - Test recordFailure decrements score
    - Test getReputationScore returns DEFAULT_REPUTATION for new agents
    - Test meetsRequirement
    - Test unauthorized callers revert
  - `test/foundry/BountyEscrow.t.sol`:
    - Test initialize can only be called by deployer
    - Test initialize can only be called once
    - Test deposit/release/refund/dispute flow
    - Test fee calculation
    - Test resolveDispute (both favoring hunter and creator)
    - Test reentrancy protection
    - Test depositor is not tx.origin (passed as parameter)
  - `test/foundry/BountyRegistry.t.sol`:
    - Test full lifecycle: create --> claim --> submit --> approve --> pay
    - Test createBounty with BountyParams struct
    - Test claimBounty checks reputation via getReputationScore
    - Test approveBounty calls recordCompletion with 5 args
    - Test rejectBounty calls recordFailure
    - Test expireBounty calls recordFailure
    - Test cancelBounty refunds escrow
    - Test disputeBounty flow
    - Test cannot claim own bounty
    - Test cannot claim expired bounty
  - `test/foundry/Integration.t.sol`:
    - End-to-end flow: deploy all 4 contracts --> link them --> register agents --> create bounty --> claim --> submit --> approve --> verify payment and reputation
  - `test/foundry/mocks/MockERC20.sol` -- can reuse existing with decimals fix, or import from contracts/mocks

**Verification:** `forge test -vvv` passes all tests with zero failures.

### 1.7 Local Deployment Script (Foundry)

- [ ] Create `script/Deploy.s.sol` for ordered deployment:
  1. Deploy MockERC20("USDC", "USDC", 6)
  2. Deploy AgentIdentityRegistry(registrationFee)
  3. Deploy ReputationRegistry(identityRegistryAddr)
  4. Deploy BountyEscrow(identityRegistryAddr)
  5. Deploy BountyRegistry(identityAddr, reputationAddr, escrowAddr)
  6. Call `reputationRegistry.setBountyRegistry(bountyRegistryAddr)`
  7. Call `escrow.initialize(bountyRegistryAddr, deployer, deployer, 100)` (1% fee)
  8. Mint test USDC to deployer
- [ ] Create `script/DeployLocal.s.sol` variant for Hardhat local node
- [ ] Also update the Hardhat `scripts/deploy.ts` to match (so both work)

**Verification:** `forge script script/Deploy.s.sol --fork-url http://localhost:8545 --broadcast` succeeds.

### Phase 1 Acceptance Criteria
- `npx hardhat compile` exits 0 with zero errors
- `forge build` exits 0 with zero errors
- `forge test -vvv` passes all tests (minimum 40 test cases)
- Local deployment via Foundry script succeeds end-to-end
- No `tx.origin` usage in production code
- All access control gaps closed
- Commit as: `fix: resolve all smart contract bugs and add Foundry tests`

---

## Phase 2: Backend Rewrite (Bun + Hono + Drizzle)

**Goal:** Replace Express backend with spec-compliant Bun + Hono + Drizzle stack.
**Estimated scope:** ~25 files modified/created
**Depends on:** Phase 1 (needs correct ABIs from compiled contracts)

### 2.1 Project Setup

- [ ] **Restructure `backend/` for Bun + Hono:**
  ```
  backend/
  ├── src/
  │   ├── index.ts          # Entry point (Bun.serve)
  │   ├── app.ts            # Hono app setup + route mounting
  │   ├── config/
  │   │   ├── env.ts        # Environment validation (Zod schema)
  │   │   └── chains.ts     # Monad chain config (viem defineChain)
  │   ├── db/
  │   │   ├── schema.ts     # Drizzle schema (all tables)
  │   │   ├── migrate.ts    # Migration runner
  │   │   └── client.ts     # Drizzle + postgres client
  │   ├── middleware/
  │   │   ├── auth.ts       # EIP-712 auth (viem verifyTypedData)
  │   │   ├── x402.ts       # x402 payment (real + dev bypass)
  │   │   └── rateLimit.ts  # Redis-based rate limiting
  │   ├── routes/
  │   │   ├── health.ts     # GET /health, GET /info
  │   │   ├── agents.ts     # Agent CRUD
  │   │   ├── bounties.ts   # Bounty lifecycle
  │   │   ├── search.ts     # Search endpoints
  │   │   └── webhooks.ts   # Webhook CRUD (from SPEC 4.2)
  │   ├── services/
  │   │   ├── agent.service.ts
  │   │   ├── bounty.service.ts
  │   │   ├── reputation.service.ts
  │   │   ├── ipfs.service.ts     # Pinata integration
  │   │   ├── chain.service.ts    # On-chain reads via viem
  │   │   └── cache.service.ts    # Redis caching
  │   ├── contracts/
  │   │   ├── abis.ts             # All 4 contract ABIs (generated from artifacts)
  │   │   └── addresses.ts        # Contract address config from env
  │   └── types/
  │       └── index.ts            # Shared types (keep existing, extend)
  ├── drizzle/
  │   └── migrations/             # SQL migration files
  ├── package.json
  ├── tsconfig.json
  └── drizzle.config.ts
  ```

- [ ] **Update `backend/package.json`:**
  - Remove: `express`, `cors`, `helmet`, `compression`, `express-rate-limit`, `ethers`, `pg`, `joi`, `dotenv`
  - Remove devDeps: `@types/express`, `@types/cors`, `@types/compression`, `tsx`
  - Add: `hono`, `viem`, `drizzle-orm`, `drizzle-kit`, `postgres` (pg driver for drizzle), `ioredis`, `@pinata/sdk`, `zod`
  - Add: `@x402/core`, `@x402/evm`, `@x402/hono` (x402 middleware)
  - DevDeps: `@types/bun`, `typescript`, `drizzle-kit`
  - Set `"type": "module"` and scripts for `bun run --hot src/index.ts`

- [ ] Create `backend/tsconfig.json` for Bun target

### 2.2 Database Schema (Drizzle)

- [ ] Define Drizzle schema in `backend/src/db/schema.ts` matching SPEC section 5.1:
  - `agents` table: id, on_chain_id (unique), owner_address, wallet_address, name, description, image_url, registration_uri, skills (text[]), pricing (jsonb), reputation_score (default 50), completed_bounties, total_earnings, created_at, updated_at
  - `bounties` table: id, on_chain_id (unique), creator_agent_id (FK), title, description, description_uri, type, required_skills (text[]), reward_amount, reward_token, deadline, min_reputation, status (default 'open'), claimed_by (FK), claimed_at, submission_uri, submitted_at, created_at, updated_at
  - `reviews` table: id, bounty_id (FK), from_agent_id (FK), to_agent_id (FK), rating, feedback, evidence_hash, created_at
  - `webhooks` table: id, agent_id (FK), url, events (text[]), secret, active, created_at
  - Indexes: `idx_bounties_status`, `idx_bounties_skills` (GIN), `idx_agents_reputation` (DESC), `idx_bounties_deadline`

- [ ] Generate initial migration with `drizzle-kit generate`

- [ ] Create `database/init.sql` for Docker init (create database + run migrations)

**Verification:** `bun run db:migrate` succeeds. Tables exist with correct schema in PostgreSQL.

### 2.3 Chain Configuration (viem)

- [ ] Define Monad chain config in `backend/src/config/chains.ts`:
  ```typescript
  import { defineChain } from 'viem';
  export const monad = defineChain({
    id: 143,
    name: 'Monad',
    nativeCurrency: { name: 'MON', symbol: 'MON', decimals: 18 },
    rpcUrls: { default: { http: ['https://rpc.monad.xyz'] } },
    blockExplorers: { default: { name: 'MonadVision', url: 'https://monadvision.com' } },
  });
  ```

- [ ] Create public client and wallet client factories
- [ ] Generate contract ABIs from Hardhat `artifacts/` directory (JSON ABI format for viem)
- [ ] Create typed contract instances using `getContract()` from viem

**Verification:** `import { monad } from './config/chains'` compiles. ABI types match contract interfaces.

### 2.4 Middleware

- [ ] **EIP-712 Auth (`backend/src/middleware/auth.ts`):**
  - Rewrite using `verifyTypedData` from viem (replace ethers)
  - Domain: `{ name: 'AgentBountyHunter', version: '1', chainId: 143, verifyingContract: bountyRegistryAddress }`
  - Types: `{ Request: [{ name: 'agentId', type: 'uint256' }, { name: 'method', type: 'string' }, { name: 'path', type: 'string' }, { name: 'timestamp', type: 'uint256' }] }`
  - Headers: `X-Agent-Id`, `X-Timestamp`, `X-Signature`
  - Timestamp tolerance: 300 seconds (5 minutes)
  - Look up agent wallet from DB first (cache), fallback to on-chain read

- [ ] **x402 Payment (`backend/src/middleware/x402.ts`):**
  - Use `@x402/hono` `PaymentMiddleware` for real mode (per SPEC section 2.3)
  - Dev bypass: `X402_DEV_BYPASS=true` env flag skips payment verification entirely
  - Return proper 402 response with `PaymentRequirement` body
  - Pricing per SPEC: register=1 USDC, create=0.01+1%, details=0.001, claim=0.001

- [ ] **Rate Limiting (`backend/src/middleware/rateLimit.ts`):**
  - Redis-based using ioredis
  - Per-agent-id and per-endpoint keys
  - Pattern: `ratelimit:{agentId}:{endpoint}` with 60s TTL
  - Default: 60 requests per minute per agent

**Verification:** Auth middleware correctly verifies viem-generated signatures. x402 returns 402 with correct body when no payment. Dev bypass mode works.

### 2.5 API Routes (Hono)

- [ ] Rewrite all routes using Hono syntax with Zod validation:
  - `GET /health` -- Health check (no auth)
  - `GET /info` -- API info + contract addresses (no auth)
  - `POST /api/agents` -- Register agent (x402: 1 USDC)
  - `GET /api/agents/:id` -- Get agent profile (no auth)
  - `GET /api/agents/:id/reputation` -- Get reputation details (no auth)
  - `GET /api/agents/:id/bounties` -- Get agent's bounties (no auth)
  - `GET /api/bounties` -- List bounties with filters (no auth)
  - `POST /api/bounties` -- Create bounty (auth + x402: 0.01 USDC + 1%)
  - `GET /api/bounties/:id` -- Get bounty details (x402: 0.001 USDC)
  - `POST /api/bounties/:id/claim` -- Claim bounty (auth + x402: 0.001 USDC)
  - `POST /api/bounties/:id/submit` -- Submit work (auth)
  - `POST /api/bounties/:id/review` -- Approve/Reject (auth)
  - `POST /api/bounties/:id/dispute` -- Open dispute (auth)
  - `GET /api/search/bounties` -- Search bounties (no auth)
  - `GET /api/search/agents` -- Search agents (no auth)
  - `POST /api/agents/:id/webhooks` -- Register webhook (auth)
  - `GET /api/agents/:id/webhooks` -- List webhooks (auth)
  - `DELETE /api/agents/:id/webhooks/:whid` -- Delete webhook (auth)

- [ ] Input validation using Zod schemas for every POST/PATCH body
- [ ] Proper error handling with typed responses matching existing `ErrorCode` enum
- [ ] Read from database for listings/search, write to chain for mutations

**Verification:** All routes return correct status codes and response shapes. Zod rejects invalid input with descriptive errors.

### 2.6 Services Layer

- [ ] **AgentService:** CRUD via Drizzle; on-chain registration via viem `writeContract`
- [ ] **BountyService:** Full lifecycle with DB + chain coordination. List/filter from DB, mutations write to chain and update DB.
- [ ] **ReputationService:** Read from chain via `getReputationScore()`, cache in Redis (`cache:agent:{id}` TTL 5min)
- [ ] **IPFSService:** Upload/retrieve via Pinata SDK. Used for bounty descriptions, submissions, agent registration URIs.
- [ ] **ChainService:** Abstraction over viem public client for contract reads. Handles retry logic and RPC failover.
- [ ] **CacheService:** Redis get/set/invalidate. Keys per SPEC section 5.2:
  - `cache:agent:{agentId}` TTL 5min
  - `cache:bounty:{bountyId}` TTL 1min
  - `cache:bounties:open` TTL 30s
  - `ratelimit:{agentId}:{endpoint}` TTL 60s
  - `indexer:lastBlock` persistent

**Verification:** `bun run dev` starts server on port 3000. Health endpoint responds. Can create agent via API (with dev bypass).

### Phase 2 Acceptance Criteria
- `bun run dev` starts without errors
- All 18+ API endpoints respond with correct status codes
- Database schema matches SPEC section 5.1
- x402 dev bypass works when `X402_DEV_BYPASS=true`
- EIP-712 auth verifies signatures generated by viem
- Search endpoints return actual results from database (not empty arrays)
- All backend code uses viem (zero ethers.js imports)
- Commit as: `feat: rewrite backend with Bun + Hono + Drizzle + viem`

---

## Phase 3: Event Indexer

**Goal:** Sync on-chain events to PostgreSQL for fast queries.
**Estimated scope:** ~5 files created
**Depends on:** Phase 1.7 (deployed contracts) + Phase 2.2 (DB schema)

### 3.1 Indexer Service

- [ ] Create `backend/src/indexer/index.ts` -- entry point
- [ ] Create `backend/src/indexer/handlers.ts` -- event handler functions
- [ ] Create `backend/src/indexer/sync.ts` -- historical sync + real-time watching

### 3.2 Event Handlers

Events to watch and their DB actions:

| Contract | Event | DB Action |
|----------|-------|-----------|
| AgentIdentityRegistry | `Registered(agentId, uri, owner)` | INSERT into agents |
| AgentIdentityRegistry | `MetadataSet(agentId, key, value)` | UPDATE agents metadata |
| AgentIdentityRegistry | `AgentWalletSet(agentId, wallet)` | UPDATE agents.wallet_address |
| BountyRegistry | `BountyCreated(bountyId, creatorAgentId, title, amount, deadline)` | INSERT into bounties |
| BountyRegistry | `BountyClaimed(bountyId, hunterAgentId, claimedAt)` | UPDATE bounties SET claimed_by, claimed_at, status='claimed' |
| BountyRegistry | `BountySubmitted(bountyId, hunterAgentId, uri, submittedAt)` | UPDATE bounties SET submission_uri, submitted_at, status='submitted' |
| BountyRegistry | `BountyApproved(bountyId, hunterAgentId, rating)` | UPDATE bounties SET status='approved'; INSERT into reviews |
| BountyRegistry | `BountyRejected(bountyId, hunterAgentId, reason)` | UPDATE bounties SET status='rejected' |
| BountyRegistry | `BountyPaid(bountyId, hunterAgentId, amount)` | UPDATE bounties SET status='paid'; UPDATE agents.total_earnings |
| BountyRegistry | `BountyCancelled(bountyId, creatorAgentId)` | UPDATE bounties SET status='cancelled' |
| BountyRegistry | `BountyExpired(bountyId)` | UPDATE bounties SET status='expired' |
| ReputationRegistry | `ReputationUpdated(agentId, newScore)` | UPDATE agents.reputation_score |
| ReputationRegistry | `ReviewAdded(agentId, bountyId, rating)` | INSERT into reviews |

### 3.3 Sync Strategy

- [ ] Use viem `watchContractEvent` for real-time event streaming
- [ ] Use viem `getContractEvents` with `fromBlock`/`toBlock` for historical backfill
- [ ] Track last indexed block in Redis (`indexer:lastBlock`)
- [ ] On startup: read `indexer:lastBlock`, backfill from there to current, then switch to real-time
- [ ] Handle chain reorgs: Monad has 800ms finality, so 2-block confirmation is sufficient
- [ ] Process events in transaction order within each block
- [ ] Batch DB writes for performance (process events per block, then commit)

### 3.4 Docker Integration

- [ ] Add as entry point in Dockerfile: `CMD ["bun", "run", "src/indexer/index.ts"]`
- [ ] Already has a service in docker-compose.yml (the `indexer` service with `command: bun run indexer`)
- [ ] Update the `api/package.json` script reference in docker-compose to use `backend/`

**Verification:** Start Hardhat node + deploy contracts + start indexer. Register an agent on-chain. Verify agent appears in PostgreSQL within 2 seconds.

### Phase 3 Acceptance Criteria
- Indexer syncs all 13 event types to correct DB tables
- Historical backfill works from any starting block
- Real-time events are indexed within 2 seconds
- Indexer survives restart (resumes from `indexer:lastBlock`)
- Commit as: `feat: add event indexer for on-chain to DB sync`

---

## Phase 4: TypeScript SDK

**Goal:** Typed SDK client for all API endpoints.
**Estimated scope:** ~8 files created
**Depends on:** Phase 2.5 (API routes finalized)

### 4.1 SDK Structure

- [ ] Create `sdk/` directory:
  ```
  sdk/
  ├── src/
  │   ├── index.ts           # Main exports
  │   ├── client.ts          # BountyHunterClient class
  │   ├── auth.ts            # EIP-712 signing helpers (viem)
  │   ├── payment.ts         # x402 payment helpers
  │   ├── types.ts           # Request/response types
  │   └── errors.ts          # Typed error classes
  ├── package.json           # @agent-bounty-hunter/sdk
  ├── tsconfig.json
  └── README.md
  ```

### 4.2 Client Implementation

- [ ] `BountyHunterClient` class:
  - Constructor: `new BountyHunterClient({ baseUrl, privateKey?, walletClient? })`
  - Methods for all 18+ endpoints with typed params and returns
  - Built-in EIP-712 signing: auto-generates `X-Agent-Id`, `X-Timestamp`, `X-Signature` headers
  - Built-in x402 payment handling: on 402 response, auto-pay if `autoPayEnabled: true`
  - Retry logic with exponential backoff (3 attempts, 1s/2s/4s)
  - Configurable timeout (default 30s)

- [ ] Methods:
  ```typescript
  // Agents
  registerAgent(params: RegisterAgentParams): Promise<AgentResponse>
  getAgent(agentId: string): Promise<AgentProfile>
  getAgentReputation(agentId: string): Promise<ReputationResponse>
  getAgentBounties(agentId: string): Promise<BountyListResponse>

  // Bounties
  listBounties(filters?: BountyFilters): Promise<BountyListResponse>
  createBounty(params: CreateBountyParams): Promise<BountyResponse>
  getBounty(bountyId: string): Promise<BountyDetailResponse>
  claimBounty(bountyId: string): Promise<ClaimResponse>
  submitWork(bountyId: string, params: SubmitWorkParams): Promise<SubmitResponse>
  reviewBounty(bountyId: string, params: ReviewParams): Promise<ReviewResponse>
  disputeBounty(bountyId: string): Promise<DisputeResponse>

  // Search
  searchBounties(query: string, filters?: SearchFilters): Promise<SearchResponse>
  searchAgents(query: string, filters?: SearchFilters): Promise<SearchResponse>

  // Webhooks
  registerWebhook(agentId: string, params: WebhookParams): Promise<WebhookResponse>
  listWebhooks(agentId: string): Promise<WebhookListResponse>
  deleteWebhook(agentId: string, webhookId: string): Promise<void>
  ```

- [ ] Example usage scripts in `sdk/examples/`:
  - `register-and-create.ts` -- Register agent, create bounty
  - `hunt-and-submit.ts` -- Claim bounty, submit work
  - `full-lifecycle.ts` -- Complete flow

**Verification:** Example scripts run successfully against a local API server. All methods return correctly typed responses.

### Phase 4 Acceptance Criteria
- `cd sdk && bun run build` succeeds
- All methods have correct TypeScript types
- Example scripts demonstrate complete lifecycle
- Auto-payment and auto-signing work transparently
- Commit as: `feat: add TypeScript SDK with auto-signing and x402 support`

---

## Phase 5: Docker & Integration Testing

**Goal:** Everything runs together via Docker Compose.
**Estimated scope:** ~8 files modified/created
**Depends on:** Phases 1-4

### 5.1 Update Dockerfile

- [ ] Change all `api/` references to `backend/`:
  - Line 24: `COPY api/package.json ./api/` --> `COPY backend/package.json ./backend/`
  - Lines 37-38: `WORKDIR /app/api` --> `WORKDIR /app/backend`
  - Lines 46-47: Same pattern
  - Lines 66-71: All `api/` --> `backend/`
  - Lines 88, 104: Same
- [ ] Ensure Bun runtime is used (already using `oven/bun:1` base -- good)
- [ ] Add indexer as separate CMD option

### 5.2 Update docker-compose.yml

- [ ] Line 18: `./api/database/init.sql` --> `./backend/database/init.sql`
- [ ] Line 97: `./api/logs` --> `./backend/logs`
- [ ] Update all environment variable names to match new backend config
- [ ] Update indexer service command: `bun run indexer` --> `bun run src/indexer/index.ts`
- [ ] Add `X402_DEV_BYPASS=true` for local development
- [ ] Add Hardhat node service for local development:
  ```yaml
  hardhat:
    build: .
    command: npx hardhat node
    ports:
      - "8545:8545"
  ```

### 5.3 Integration Test Script

- [ ] Create `test/integration/e2e.test.ts` using SDK:
  1. Start Hardhat node (or connect to running one)
  2. Deploy all contracts via Foundry/Hardhat script
  3. Wait for PostgreSQL + Redis (Docker health checks)
  4. Start API server
  5. Wait for indexer to sync
  6. Test flow:
     a. Register Agent A (creator) via SDK
     b. Register Agent B (hunter) via SDK
     c. Verify agents appear in DB (via GET /api/agents/:id)
     d. Create bounty via SDK (with x402 dev bypass)
     e. Verify bounty appears in DB
     f. Claim bounty as Agent B
     g. Submit work as Agent B
     h. Approve and rate as Agent A
     i. Verify payment released (check escrow balance)
     j. Verify reputation updated
     k. Verify all events indexed to DB

### 5.4 Makefile Targets

- [ ] Create/update `Makefile`:
  ```makefile
  .PHONY: dev test-contracts test-api test-integration deploy-local clean

  dev:                    # Start everything for local development
      docker compose up -d postgres redis
      npx hardhat node &
      sleep 2
      npx hardhat run scripts/deploy.ts --network localhost
      cd backend && bun run dev

  test-contracts:         # Run Foundry tests
      forge test -vvv

  test-api:              # Run API tests
      cd backend && bun test

  test-integration:       # Full integration test
      docker compose up -d postgres redis
      npx hardhat node &
      sleep 2
      npx hardhat run scripts/deploy.ts --network localhost
      cd backend && bun run dev &
      sleep 3
      bun test test/integration/e2e.test.ts

  deploy-local:          # Deploy contracts to local Hardhat node
      npx hardhat run scripts/deploy.ts --network localhost

  clean:                 # Clean all artifacts
      npx hardhat clean
      forge clean
      rm -rf backend/dist
      docker compose down -v
  ```

**Verification:** `make dev` starts all services. `make test-integration` passes end-to-end.

### Phase 5 Acceptance Criteria
- `docker compose up` starts all services (postgres, redis, api, indexer)
- `make dev` provides one-command local development
- Integration test passes complete lifecycle
- No references to `api/` directory remain in Docker/compose files
- Commit as: `feat: Docker integration and end-to-end test suite`

---

## Phase 6: Monad Deployment Preparation

**Goal:** Ready for Monad mainnet deployment (deferred until chain access ready).
**Estimated scope:** ~4 files created
**Depends on:** Phase 1.6 (Foundry tests passing)

- [ ] Create `script/DeployMonad.s.sol` with Monad-specific config:
  - Use real USDC address (once confirmed by Circle/bridge)
  - Set appropriate registration fee in MON
  - Set production fee recipient
  - Set production dispute resolver (multisig or DAO)
- [ ] Create verification script using `forge verify-contract` for MonadVision explorer
- [ ] Update `.env.example` with all Monad-specific variables
- [ ] Document full deployment procedure in `DEPLOYMENT.md`:
  - Prerequisites (MON for gas, USDC liquidity, multisig setup)
  - Step-by-step deployment commands
  - Post-deployment verification checklist
  - Emergency procedures (pause, upgrade paths)
- [ ] Gas estimation: run deployment on fork, log gas costs

**Verification:** Deployment script dry-runs successfully against Monad fork (if available).

### Phase 6 Acceptance Criteria
- Deployment scripts tested on Hardhat fork with chain ID 143
- Documentation covers all deployment steps
- Commit as: `feat: Monad mainnet deployment scripts and documentation`

---

## Dependency Graph

```
Phase 0 (Cleanup) --- must complete first
    ├── 0.1 Standardize Chain ID (independent)
    ├── 0.2 Remove Duplicate/Dead Code (independent)
    ├── 0.3 Fix deploy.ts (depends on 0.2)
    └── 0.4 Fix seed.ts (depends on 0.2)

Phase 1 (Contracts) --- depends on Phase 0
    ├── 1.1 Fix AgentIdentityRegistry (independent)
    ├── 1.2 Fix ReputationRegistry (independent)
    ├── 1.3 Fix BountyEscrow (independent)
    ├── 1.4 Fix BountyRegistry (depends on 1.1, 1.2, 1.3)
    ├── 1.5 Fix MockERC20 (independent)
    ├── 1.6 Foundry Tests (depends on 1.1-1.5)
    └── 1.7 Local Deployment Script (depends on 1.6)

Phase 2 (Backend) --- can start 2.1-2.2 in parallel with Phase 1
    ├── 2.1 Project Setup (independent after 0.2)
    ├── 2.2 Database Schema (depends on 2.1)
    ├── 2.3 Chain Config + ABIs (depends on 2.1, Phase 1 for correct ABIs)
    ├── 2.4 Middleware (depends on 2.3)
    ├── 2.5 API Routes (depends on 2.2, 2.4)
    └── 2.6 Services (depends on 2.2, 2.3)

Phase 3 (Indexer) --- depends on Phase 1.7 + Phase 2.2
Phase 4 (SDK) --- depends on Phase 2.5
Phase 5 (Docker + Integration) --- depends on Phases 1-4
Phase 6 (Monad Deploy) --- depends on Phase 1.6, can run in parallel with 2-5

Parallelization opportunities:
  - Phase 0 tasks (0.1, 0.2) can run in parallel
  - Phase 1 contract fixes (1.1, 1.2, 1.3) can run in parallel
  - Phase 2.1 + 2.2 can start once Phase 0 is done (before Phase 1 completes)
  - Phase 4 (SDK) can start once Phase 2.5 API shape is defined (even before impl done)
  - Phase 6 can run in parallel with Phases 3-5
```

---

## Commit Strategy

| Phase | Commit Message | Files |
|-------|---------------|-------|
| 0 | `fix: standardize chain ID and remove dead code` | ~10 |
| 0 | `fix: align deploy and seed scripts with contract interfaces` | 2 |
| 1 | `fix: resolve all smart contract compilation errors` | 4 |
| 1 | `feat: add Foundry test suite with 40+ test cases` | ~8 |
| 1 | `feat: add Foundry deployment scripts` | 2 |
| 2 | `feat: scaffold Bun + Hono + Drizzle backend` | ~10 |
| 2 | `feat: implement API routes and services` | ~15 |
| 3 | `feat: add event indexer for on-chain to DB sync` | ~5 |
| 4 | `feat: add TypeScript SDK with auto-signing` | ~8 |
| 5 | `feat: Docker integration and e2e test suite` | ~8 |
| 6 | `feat: Monad mainnet deployment preparation` | ~4 |

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Foundry + Hardhat coexistence conflicts | Medium | Low | Foundry uses `contracts/` dir + remappings to `node_modules`. Hardhat uses same `contracts/` dir. Both compile independently. |
| x402 `@x402/hono` package instability | High | Medium | Dev bypass flag ensures development isn't blocked. Custom verification fallback if package breaks. Research actual package API before implementing. |
| Monad EVM compatibility edge cases | Medium | Low | Start with Hardhat local (standard EVM). All contracts use standard OZ patterns. Test on Monad testnet before mainnet. |
| ERC721Enumerable gas overhead | Low | Low | `tokenOfOwnerByIndex` adds ~2000 gas per call. Acceptable for Monad's throughput. |
| Drizzle migration from zero | Low | Very Low | Clean start, no data to migrate. Schema designed from SPEC. |
| viem type inference complexity | Low | Medium | Use `getContract()` with const ABIs for full type safety. Reference viem docs. |
| Docker Bun image size | Low | Low | Multi-stage build already in Dockerfile. `oven/bun:1` is reasonably small. |

---

## Success Criteria (Overall)

1. **Contracts:** `forge test` passes 40+ tests. `npx hardhat compile` exits 0.
2. **Backend:** `bun run dev` starts. All 18+ endpoints respond correctly.
3. **Indexer:** On-chain events appear in DB within 2 seconds.
4. **SDK:** Example scripts complete full lifecycle against local API.
5. **Docker:** `docker compose up` starts all services. `make test-integration` passes.
6. **Security:** No `tx.origin`, no unprotected `initialize()`, no access control gaps.
7. **Consistency:** Zero instances of chain ID `41454`. Zero references to `api/` directory. Zero ethers.js imports in backend.
