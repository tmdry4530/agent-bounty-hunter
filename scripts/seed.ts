import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentData {
  network: string;
  chainId: number;
  contracts: {
    AgentIdentityRegistry: string;
    ReputationRegistry: string;
    BountyRegistry: string;
    BountyEscrow: string;
  };
}

async function main() {
  console.log("\n🌱 Agent Bounty Hunter - Seed Test Data");
  console.log("=".repeat(60));

  // Load deployment
  const deploymentPath = path.join(__dirname, "..", "deployments", "latest.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment found. Run 'npm run deploy' first.");
    process.exit(1);
  }

  const deployment: DeploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const [deployer, creator, hunter1, hunter2] = await ethers.getSigners();

  console.log(`📍 Network: ${deployment.network}`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`👤 Creator:  ${creator.address}`);
  console.log(`👤 Hunter1:  ${hunter1.address}`);
  console.log(`👤 Hunter2:  ${hunter2.address}`);
  console.log("=".repeat(60));
  console.log();

  // Get contract instances
  const identityRegistry = await ethers.getContractAt(
    "AgentIdentityRegistry",
    deployment.contracts.AgentIdentityRegistry
  );
  const bountyRegistry = await ethers.getContractAt(
    "BountyRegistry",
    deployment.contracts.BountyRegistry
  );
  const reputationRegistry = await ethers.getContractAt(
    "ReputationRegistry",
    deployment.contracts.ReputationRegistry
  );

  try {
    // ============ 1. Register Test Agents ============
    console.log("📝 [1/4] Registering test agents...");
    
    // Creator Agent
    const creatorURI = "ipfs://QmCreator123/metadata.json";
    const tx1 = await identityRegistry.connect(creator).register(creatorURI);
    await tx1.wait();
    const creatorAgentId = 1;
    console.log(`   ✅ Creator Agent registered (ID: ${creatorAgentId})`);
    
    // Set creator metadata
    await identityRegistry.connect(creator).setMetadata(
      creatorAgentId,
      "skills",
      ethers.toUtf8Bytes(JSON.stringify(["project-management", "web3"]))
    );
    await identityRegistry.connect(creator).setMetadata(
      creatorAgentId,
      "pricing",
      ethers.toUtf8Bytes(JSON.stringify({ baseRate: "0", currency: "USDC", unit: "task" }))
    );

    // Hunter 1 Agent
    const hunter1URI = "ipfs://QmHunter123/metadata.json";
    const tx2 = await identityRegistry.connect(hunter1).register(hunter1URI);
    await tx2.wait();
    const hunter1AgentId = 2;
    console.log(`   ✅ Hunter1 Agent registered (ID: ${hunter1AgentId})`);
    
    // Set hunter1 metadata
    await identityRegistry.connect(hunter1).setMetadata(
      hunter1AgentId,
      "skills",
      ethers.toUtf8Bytes(JSON.stringify(["solidity", "security-audit", "code-review"]))
    );
    await identityRegistry.connect(hunter1).setMetadata(
      hunter1AgentId,
      "pricing",
      ethers.toUtf8Bytes(JSON.stringify({ baseRate: "10", currency: "USDC", unit: "task" }))
    );

    // Hunter 2 Agent
    const hunter2URI = "ipfs://QmHunter456/metadata.json";
    const tx3 = await identityRegistry.connect(hunter2).register(hunter2URI);
    await tx3.wait();
    const hunter2AgentId = 3;
    console.log(`   ✅ Hunter2 Agent registered (ID: ${hunter2AgentId})`);
    
    await identityRegistry.connect(hunter2).setMetadata(
      hunter2AgentId,
      "skills",
      ethers.toUtf8Bytes(JSON.stringify(["typescript", "api-development", "testing"]))
    );
    console.log();

    // ============ 2. Create Test Bounties ============
    console.log("📝 [2/4] Creating test bounties...");
    
    const USDC_DECIMALS = 6;
    const reward1 = ethers.parseUnits("10", USDC_DECIMALS); // 10 USDC
    const reward2 = ethers.parseUnits("25", USDC_DECIMALS); // 25 USDC
    
    // Use zero address for native token (or deploy mock USDC for testnet)
    const paymentToken = ethers.ZeroAddress;
    
    // Bounty 1: Security Audit
    const bounty1URI = "ipfs://QmBounty1/details.json";
    const tx4 = await bountyRegistry.connect(creator).createBounty(
      creatorAgentId,
      bounty1URI,
      paymentToken,
      reward1,
      Math.floor(Date.now() / 1000) + 86400 * 7, // 7 days deadline
      ["solidity", "security-audit"],
      { value: reward1 } // Send ETH as reward
    );
    await tx4.wait();
    const bounty1Id = 1;
    console.log(`   ✅ Bounty #${bounty1Id} created: Security Audit (10 USDC)`);

    // Bounty 2: API Development
    const bounty2URI = "ipfs://QmBounty2/details.json";
    const tx5 = await bountyRegistry.connect(creator).createBounty(
      creatorAgentId,
      bounty2URI,
      paymentToken,
      reward2,
      Math.floor(Date.now() / 1000) + 86400 * 14, // 14 days deadline
      ["typescript", "api-development"],
      { value: reward2 }
    );
    await tx5.wait();
    const bounty2Id = 2;
    console.log(`   ✅ Bounty #${bounty2Id} created: API Development (25 USDC)`);
    console.log();

    // ============ 3. Claim and Submit Bounty ============
    console.log("📝 [3/4] Simulating bounty workflow...");
    
    // Hunter1 claims Bounty #1
    const tx6 = await bountyRegistry.connect(hunter1).claimBounty(bounty1Id, hunter1AgentId);
    await tx6.wait();
    console.log(`   ✅ Bounty #${bounty1Id} claimed by Hunter1`);
    
    // Hunter1 submits work
    const submissionURI = "ipfs://QmSubmission1/report.json";
    const tx7 = await bountyRegistry.connect(hunter1).submitWork(bounty1Id, hunter1AgentId, submissionURI);
    await tx7.wait();
    console.log(`   ✅ Hunter1 submitted work for Bounty #${bounty1Id}`);
    
    // Creator approves and pays
    const tx8 = await bountyRegistry.connect(creator).approveBounty(bounty1Id, creatorAgentId);
    await tx8.wait();
    console.log(`   ✅ Bounty #${bounty1Id} approved and paid`);
    console.log();

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
    console.log();

    // ============ 5. Print Summary ============
    printSummary({
      agents: [
        { id: creatorAgentId, address: creator.address, role: "Creator" },
        { id: hunter1AgentId, address: hunter1.address, role: "Hunter" },
        { id: hunter2AgentId, address: hunter2.address, role: "Hunter" },
      ],
      bounties: [
        { id: bounty1Id, reward: "10 USDC", status: "Completed" },
        { id: bounty2Id, reward: "25 USDC", status: "Open" },
      ],
    });

    console.log("🎉 Test data seeded successfully!");
    console.log("\n📝 Next steps:");
    console.log("   - Check agents on explorer");
    console.log("   - Test API endpoints with seeded data");
    console.log("   - Start building the demo");
    console.log();

  } catch (error) {
    console.error("\n❌ Seeding failed:", error);
    process.exit(1);
  }
}

function printSummary(data: any) {
  console.log("=".repeat(60));
  console.log("📋 SEED SUMMARY");
  console.log("=".repeat(60));
  console.log("\nAgents:");
  data.agents.forEach((agent: any) => {
    console.log(`  #${agent.id} ${agent.role.padEnd(10)} ${agent.address}`);
  });
  console.log("\nBounties:");
  data.bounties.forEach((bounty: any) => {
    console.log(`  #${bounty.id} ${bounty.reward.padEnd(10)} [${bounty.status}]`);
  });
  console.log("=".repeat(60));
}

// Run seeding
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
