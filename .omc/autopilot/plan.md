# Implementation Plan: Demo Scenario Files

## Overview

Create `demo/demo-scenario.ts` and `demo/mock-server.ts` for Agent Bounty Hunter.

## Tasks

### Task 1: Create mock-server.ts
**File**: `demo/mock-server.ts`
**Complexity**: Medium
**Dependencies**: None

Create in-memory contract simulation with:
- MockState interface (agents, bounties, escrow, reputations, balances)
- MockAgentRegistry class (register, getAgent, ownerOf)
- MockBountyRegistry class (createBounty, claimBounty, submitWork, approveBounty, getBounty)
- MockEscrow class (deposit, release, refund)
- MockReputationRegistry class (getReputationScore, recordCompletion)
- MockERC20 class (balanceOf, transfer, approve, transferFrom)
- MockProvider class implementing ethers.Provider interface
- Pre-funded wallets with 1000 USDC
- Export startMockServer() function

### Task 2: Create demo-scenario.ts
**File**: `demo/demo-scenario.ts`
**Complexity**: Medium
**Dependencies**: Task 1

Create executable demo with:
- AgentPersona interface for Alice/Bob
- DemoScenario class with run() method
- Step 1: Register Alice (Researcher) and Bob (Developer)
- Step 2: Alice creates bounty "Research Monad DeFi protocols" (5 USDC)
- Step 3: Bob discovers and claims bounty
- Step 4: Bob submits work (mock IPFS CID)
- Step 5: Alice reviews and approves (rating: 5)
- Step 6: Payment settlement (escrow release)
- Step 7: Display final results (reputation, balances)
- Colorful console output with chalk
- ISO timestamps for all logs
- Self-contained main() entry point

### Task 3: Update package.json
**File**: `demo/package.json`
**Complexity**: Low
**Dependencies**: None

Add scripts:
- "demo:scenario": "bun run demo-scenario.ts"

## Execution Order

1. Task 1 (mock-server.ts) - can start immediately
2. Task 3 (package.json) - can start immediately
3. Task 2 (demo-scenario.ts) - after Task 1 completes

## Acceptance Criteria

1. `bun run demo-scenario.ts` executes without errors
2. All 7 steps display in console with timestamps and colors
3. Final output shows:
   - Alice: Agent #1, creator of bounty
   - Bob: Agent #2, hunter with 5 USDC earned
   - Reputation updates for both agents
4. No external network connections required (pure mock mode)
