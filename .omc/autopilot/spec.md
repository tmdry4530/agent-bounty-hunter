# Agent Bounty Hunter Demo Scenario - Technical Specification

## Overview

Create two new files in the `demo/` directory:

| File | Purpose |
|------|---------|
| `demo/demo-scenario.ts` | Full agent-to-agent bounty flow with Alice (Researcher) and Bob (Developer) |
| `demo/mock-server.ts` | In-memory contract simulation for local testing without Monad connection |

## Tech Stack

| Technology | Version | Rationale |
|------------|---------|-----------|
| TypeScript | ^5.3.0 | Already in project, type safety |
| Bun | latest | Already the runtime for demo/ |
| ethers.js | ^6.10.0 | Already a dependency, wallet generation |
| chalk | ^5.3.0 | Already a dependency, colorful console output |

**No new dependencies required.**

## Data Flow

```
1. demo-scenario starts mock-server (if not already running)
2. Generate wallets for Alice & Bob
3. Fund wallets (mock USDC transfer)
4. Register Alice via AgentIdentityRegistry
5. Register Bob via AgentIdentityRegistry
6. Alice creates bounty "Research Monad DeFi protocols" (5 USDC)
7. Bob discovers bounty via getActiveBounties()
8. Bob claims bounty
9. Bob uploads work to IPFS (mock CID)
10. Bob submits work
11. Alice reviews and approves (rating: 5)
12. Escrow releases payment to Bob
13. Reputation updated for both agents
14. Console shows final state
```

## File Specifications

### `demo/demo-scenario.ts`

Main executable demo showing full bounty lifecycle with Alice and Bob personas.

Key features:
- ISO timestamps for all console output
- Colorful output using chalk
- 7-step flow matching user requirements
- Mock IPFS (fake CIDs) by default
- Self-contained with minimal dependencies

### `demo/mock-server.ts`

In-memory simulation of all contracts for local testing.

Key features:
- MockState with agents, bounties, escrow, reputations, balances
- Contract simulators: MockAgentRegistry, MockBountyRegistry, MockEscrow, MockReputationRegistry
- Pre-funded test wallets with 1000 USDC each
- Same contract addresses as existing demo config

## Console Output Format

```
[2024-01-15T10:30:45.123Z] === AGENT BOUNTY HUNTER DEMO ===

[2024-01-15T10:30:45.200Z] STEP 1/7: Register AI Agents
[2024-01-15T10:30:45.250Z] Registering Alice the Researcher...
[2024-01-15T10:30:45.500Z] ✅ Agent #1 registered (0x1234...5678)
...
```

## Color Scheme

| Element | Chalk Style |
|---------|-------------|
| Timestamp | `chalk.gray` |
| Step header | `chalk.bold.magenta` |
| Agent name | `chalk.bold.cyan` |
| Success message | `chalk.green` |
| USDC amounts | `chalk.yellow` |
| IPFS CIDs | `chalk.blue` |

## Package.json Updates

Add scripts:
```json
{
  "scripts": {
    "demo:scenario": "bun run demo-scenario.ts",
    "demo:scenario:mock": "bun run demo-scenario.ts --mock"
  }
}
```

## Execution

```bash
cd demo
bun run demo-scenario.ts
```
