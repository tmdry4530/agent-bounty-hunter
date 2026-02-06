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
    console.log("📝 [1/5] Registering test agents...");

    // Get registration fee
    const registrationFee = await identityRegistry.registrationFee();

    // Creator Agent
    const creatorURI = "ipfs://QmCreator123/metadata.json";
    const tx1 = await identityRegistry.connect(creator)["register(string)"](creatorURI, { value: registrationFee });
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
    const tx2 = await identityRegistry.connect(hunter1)["register(string)"](hunter1URI, { value: registrationFee });
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
    const tx3 = await identityRegistry.connect(hunter2)["register(string)"](hunter2URI, { value: registrationFee });
    await tx3.wait();
    const hunter2AgentId = 3;
    console.log(`   ✅ Hunter2 Agent registered (ID: ${hunter2AgentId})`);

    await identityRegistry.connect(hunter2).setMetadata(
      hunter2AgentId,
      "skills",
      ethers.toUtf8Bytes(JSON.stringify(["typescript", "api-development", "testing"]))
    );
    console.log();

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
    console.log();

    // ============ 3. Create Test Bounties ============
    console.log("📝 [3/5] Creating test bounties...");

    const reward1 = ethers.parseUnits("10", USDC_DECIMALS); // 10 USDC
    const reward2 = ethers.parseUnits("25", USDC_DECIMALS); // 25 USDC

    // Bounty 1: Security Audit
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
    await tx4.wait();
    const bounty1Id = 1;
    console.log(`   ✅ Bounty #${bounty1Id} created: Security Audit (10 USDC)`);

    // Bounty 2: API Development
    const bountyParams2 = {
      title: "REST API Development",
      descriptionURI: "ipfs://QmBounty2/details.json",
      rewardToken: usdcAddress,
      rewardAmount: reward2,
      deadline: Math.floor(Date.now() / 1000) + 86400 * 14, // 14 days
      minReputation: 0,
      requiredSkills: ["typescript", "api-development"]
    };

    const tx5 = await bountyRegistry.connect(creator).createBounty(bountyParams2);
    await tx5.wait();
    const bounty2Id = 2;
    console.log(`   ✅ Bounty #${bounty2Id} created: API Development (25 USDC)`);
    console.log();

    // ============ 4. Claim and Submit Bounty ============
    console.log("📝 [4/5] Simulating bounty workflow...");

    // Hunter1 claims Bounty #1
    const tx6 = await bountyRegistry.connect(hunter1).claimBounty(bounty1Id);
    await tx6.wait();
    console.log(`   ✅ Bounty #${bounty1Id} claimed by Hunter1`);

    // Hunter1 submits work
    const submissionURI = "ipfs://QmSubmission1/report.json";
    const tx7 = await bountyRegistry.connect(hunter1).submitWork(bounty1Id, submissionURI);
    await tx7.wait();
    console.log(`   ✅ Hunter1 submitted work for Bounty #${bounty1Id}`);

    // Creator approves and pays (with rating and feedback)
    const tx8 = await bountyRegistry.connect(creator).approveBounty(
      bounty1Id,
      5, // 5-star rating
      "ipfs://QmFeedback1/comment.json"
    );
    await tx8.wait();
    console.log(`   ✅ Bounty #${bounty1Id} approved and paid`);
    console.log();

    // ============ 5. Verify Final State ============
    console.log("📝 [5/5] Verifying final state...");

    // Check hunter1 reputation
    const hunter1Reputation = await reputationRegistry.getReputationScore(hunter1AgentId);
    console.log(`   ✅ Hunter1 reputation: ${hunter1Reputation}`);

    // Check bounty statuses
    const bounty1 = await bountyRegistry.getBounty(bounty1Id);
    const bounty2 = await bountyRegistry.getBounty(bounty2Id);
    console.log(`   ✅ Bounty #${bounty1Id} status: ${getStatusName(Number(bounty1.status))}`);
    console.log(`   ✅ Bounty #${bounty2Id} status: ${getStatusName(Number(bounty2.status))}`);
    console.log();

    // ============ 6. Print Summary ============
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
      tokenAddress: usdcAddress,
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

function getStatusName(status: number): string {
  const statuses = [
    "Open", "Claimed", "InProgress", "Submitted", "UnderReview",
    "Approved", "Rejected", "Disputed", "Paid", "Cancelled", "Expired"
  ];
  return statuses[status] || "Unknown";
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
  console.log("\nToken:");
  console.log(`  Mock USDC: ${data.tokenAddress}`);
  console.log("=".repeat(60));
}

// Run seeding
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
