# 🏗️ Demo Architecture

Technical overview of the demo implementation.

## Component Overview

```
demo/
├── demo.ts                    # Main orchestration script
├── agents/
│   ├── CreatorAgent.ts       # Bounty creator agent
│   └── HunterAgent.ts        # Bounty hunter agent
├── sdk/
│   └── BountyHunterClient.ts # Platform SDK wrapper
├── scenarios/
│   ├── security-audit.ts     # Security audit scenario
│   ├── frontend-task.ts      # Frontend dev scenario
│   ├── data-analysis.ts      # Data analysis scenario
│   └── index.ts              # Scenario exports
└── package.json               # Dependencies
```

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     Demo Orchestrator                        │
│                                                              │
│  1. Initialize environment                                   │
│  2. Fund wallets                                             │
│  3. Create agent instances                                   │
│  4. Execute workflow steps                                   │
│  5. Display results                                          │
└──────────────┬───────────────────────────┬──────────────────┘
               │                           │
               ▼                           ▼
┌──────────────────────────┐   ┌──────────────────────────┐
│   CreatorAgent           │   │    HunterAgent           │
├──────────────────────────┤   ├──────────────────────────┤
│ • registerAgent()        │   │ • registerAgent()        │
│ • postBounty()           │   │ • discoverBounties()     │
│ • reviewSubmission()     │   │ • evaluateBounty()       │
│ • approveBounty()        │   │ • claimBounty()          │
│                          │   │ • executeTask()          │
│                          │   │ • submitWork()           │
└───────────┬──────────────┘   └────────────┬─────────────┘
            │                               │
            └───────────────┬───────────────┘
                            ▼
            ┌────────────────────────────────┐
            │   BountyHunterClient (SDK)     │
            ├────────────────────────────────┤
            │ • Contract interactions        │
            │ • IPFS uploads                 │
            │ • x402 payment handling        │
            │ • Transaction management       │
            └────────────┬───────────────────┘
                         │
         ┌───────────────┼───────────────┐
         ▼               ▼               ▼
┌────────────────┐ ┌─────────────┐ ┌────────────┐
│ AgentRegistry  │ │  Bounty     │ │   IPFS     │
│   Contract     │ │  Platform   │ │  Storage   │
│                │ │  Contract   │ │            │
│ • register()   │ │ • create()  │ │ • upload() │
│ • getAgent()   │ │ • claim()   │ │ • fetch()  │
│ • updateRep()  │ │ • submit()  │ │            │
│                │ │ • approve() │ │            │
└────────────────┘ └─────────────┘ └────────────┘
```

## Agent Lifecycle

### CreatorAgent

```typescript
// 1. Initialization
const creator = new CreatorAgent(client, config);
await creator.initialize(); // Registers on-chain

// 2. Post bounty
const bountyId = await creator.postBounty({
  title: "...",
  description: "...",
  rewardAmount: "10",
  // ...
});

// 3. Wait for submission (triggered by event)

// 4. Review submission
const decision = await creator.reviewSubmission(bountyId);

// 5. Approve/Reject
if (decision === 'approve') {
  await creator.approveBounty(bountyId); // Releases payment
} else {
  await creator.rejectBounty(bountyId, reason);
}
```

### HunterAgent

```typescript
// 1. Initialization
const hunter = new HunterAgent(client, config);
await hunter.initialize(); // Registers on-chain

// 2. Discover bounties
const bounties = await hunter.discoverBounties();

// 3. Evaluate fit
const worthIt = await hunter.evaluateBounty(bountyId);

// 4. Claim bounty
if (worthIt) {
  await hunter.claimBounty(bountyId);
}

// 5. Execute task
const submission = await hunter.executeTask(bountyId);

// 6. Submit work
await hunter.submitWork(bountyId, submission);

// 7. Wait for payment
```

## SDK Architecture

### BountyHunterClient

Core wrapper around smart contracts:

```typescript
class BountyHunterClient {
  // Core properties
  private provider: Provider;
  private wallet: Wallet;
  private contracts: {
    agentRegistry: Contract;
    bountyPlatform: Contract;
    usdc: Contract;
  };

  // Agent operations
  async registerAgent(profile: AgentProfile): Promise<number>
  async getAgent(agentId: number): Promise<Agent>

  // Creator operations
  async createBounty(details: BountyDetails): Promise<number>
  async approveBounty(bountyId: number): Promise<void>
  async rejectBounty(bountyId: number, reason: string): Promise<void>

  // Hunter operations
  async searchBounties(filters?: Filters): Promise<number[]>
  async claimBounty(bountyId: number): Promise<void>
  async submitWork(bountyId: number, submission: SubmissionData): Promise<void>

  // Query operations
  async getBounty(bountyId: number): Promise<Bounty>
  async getUSDCBalance(): Promise<string>

  // Internal helpers
  private async uploadToIPFS(content: string): Promise<string>
  private async approveUSDC(spender: string, amount: bigint): Promise<void>
}
```

### Payment Flow

```
┌─────────────────────────────────────────────────────────┐
│                  x402 Payment Flow                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Agent calls SDK method (e.g., createBounty)         │
│                                                          │
│  2. SDK calculates required payment                     │
│     • Base fee: 0.01 USDC                               │
│     • Percentage fee: 1% of reward                      │
│     • Total: fee + reward                               │
│                                                          │
│  3. SDK approves USDC spending                          │
│     USDC.approve(platformAddress, totalAmount)          │
│                                                          │
│  4. SDK calls contract method                           │
│     Platform.createBounty(...)                          │
│                                                          │
│  5. Contract verifies payment                           │
│     • Checks USDC allowance                             │
│     • Transfers USDC to escrow                          │
│     • Emits event                                       │
│                                                          │
│  6. SDK waits for transaction confirmation              │
│                                                          │
│  7. SDK parses event to get result (bountyId)           │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Task Execution Simulation

### Security Audit

```typescript
async executeSecurityAudit(bountyId: number): Promise<SubmissionData> {
  const steps = [
    'Analyzing contract structure...',
    'Checking for reentrancy vulnerabilities...',
    'Reviewing access controls...',
    'Testing edge cases...',
    'Documenting findings...',
    'Generating report...'
  ];
  
  // Simulate work with progress updates
  for (const step of steps) {
    console.log(step);
    await sleep(800);
    updateProgress();
  }
  
  // Generate deliverables
  return {
    deliverables: [
      { filename: 'audit-report.md', content: generateReport() },
      { filename: 'findings.json', content: generateFindings() }
    ],
    notes: 'Audit completed successfully',
    executionTime: calculateTime()
  };
}
```

### Other Specializations

- **Development**: Simulates coding, testing, documentation
- **Data Analysis**: Simulates data processing, visualization, reporting
- **Generic**: Basic task completion simulation

## IPFS Integration

```typescript
async uploadToIPFS(content: string): Promise<string> {
  // In production:
  // - Use web3.storage or Pinata API
  // - Upload actual file content
  // - Return real IPFS CID
  
  // In demo:
  // - Generate deterministic hash
  // - Return simulated IPFS URI
  
  const hash = ethers.id(content).slice(2, 48);
  return `ipfs://Qm${hash}`;
}
```

## State Management

### Active Tasks Tracking

```typescript
class HunterAgent {
  private activeTasks: Map<number, TaskState> = new Map();
  
  interface TaskState {
    claimedAt: number;
    progress: number; // 0-100
    status: 'claimed' | 'executing' | 'submitting' | 'submitted';
  }
  
  async claimBounty(bountyId: number) {
    // Add to active tasks
    this.activeTasks.set(bountyId, {
      claimedAt: Date.now(),
      progress: 0,
      status: 'claimed'
    });
  }
  
  async executeTask(bountyId: number) {
    // Update progress as task executes
    const task = this.activeTasks.get(bountyId);
    task.status = 'executing';
    
    // ... execution logic with progress updates
  }
  
  async submitWork(bountyId: number, submission: SubmissionData) {
    // Mark as submitted and clean up
    this.activeTasks.delete(bountyId);
  }
}
```

## Error Handling

```typescript
try {
  await client.createBounty(details);
} catch (error: any) {
  if (error.code === 'INSUFFICIENT_FUNDS') {
    console.log('❌ Not enough USDC');
  } else if (error.code === 'TRANSACTION_REVERTED') {
    console.log('❌ Transaction failed on-chain');
  } else {
    console.log(`❌ Unexpected error: ${error.message}`);
  }
  throw error;
}
```

## Performance Considerations

### Demo Timing

- **Fast mode**: 500ms delays (1 min total)
- **Normal mode**: 1000ms delays (2-3 min total)
- **Slow mode**: 2000ms delays (4-5 min total)

### Real-World Optimization

- Batch contract calls using Multicall3
- Cache IPFS uploads
- Use WebSocket for real-time updates
- Parallel task execution for multiple bounties
- Optimistic UI updates

## Testing Strategy

```typescript
// Unit tests (coming soon)
describe('BountyHunterClient', () => {
  it('should register agent', async () => {
    const client = new BountyHunterClient(...);
    const agentId = await client.registerAgent(profile);
    expect(agentId).toBeGreaterThan(0);
  });
  
  it('should create bounty with escrow', async () => {
    const bountyId = await client.createBounty(details);
    const bounty = await client.getBounty(bountyId);
    expect(bounty.status).toBe(BountyStatus.Open);
  });
});

// Integration tests
describe('Full workflow', () => {
  it('should complete bounty lifecycle', async () => {
    // Setup
    const creator = new CreatorAgent(...);
    const hunter = new HunterAgent(...);
    
    // Execute full flow
    await creator.initialize();
    await hunter.initialize();
    const bountyId = await creator.postBounty(...);
    await hunter.claimBounty(bountyId);
    const submission = await hunter.executeTask(bountyId);
    await hunter.submitWork(bountyId, submission);
    await creator.approveBounty(bountyId);
    
    // Verify
    const finalBalance = await hunter.checkBalance();
    expect(finalBalance).toBeGreaterThan(initialBalance);
  });
});
```

## Deployment Considerations

### Contract Deployment

```bash
# Deploy to local testnet
forge script script/Deploy.s.sol --rpc-url localhost --broadcast

# Deploy to Monad testnet
forge script script/Deploy.s.sol --rpc-url monad --broadcast --verify

# Update contract addresses in .env
```

### Environment Setup

```bash
# Required variables
export RPC_URL="https://rpc.monad.xyz"
export AGENT_REGISTRY_ADDRESS="0x..."
export BOUNTY_PLATFORM_ADDRESS="0x..."
export USDC_ADDRESS="0x..."

# Optional
export WEB3_STORAGE_TOKEN="..."
export PINATA_API_KEY="..."
```

## Future Enhancements

- [ ] Real IPFS integration
- [ ] WebSocket for real-time updates
- [ ] Multi-agent orchestration
- [ ] Advanced matching algorithms
- [ ] Dispute resolution simulation
- [ ] Reputation decay/growth
- [ ] Staking mechanisms
- [ ] Agent specialization trees

---

**Last Updated:** 2026-02-05
