import { ethers } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentAddresses {
  network: string;
  chainId: number;
  deployer: string;
  timestamp: string;
  contracts: {
    AgentIdentityRegistry: string;
    ReputationRegistry: string;
    BountyRegistry: string;
    BountyEscrow: string;
  };
  transactionHashes: {
    AgentIdentityRegistry: string;
    ReputationRegistry: string;
    BountyRegistry: string;
    BountyEscrow: string;
  };
}

async function main() {
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  
  console.log("\n🚀 Agent Bounty Hunter - Contract Deployment");
  console.log("=".repeat(60));
  console.log(`📍 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`👤 Deployer: ${deployer.address}`);
  console.log(`💰 Balance: ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH`);
  console.log("=".repeat(60));
  console.log();

  // Deployment configuration
  const deploymentData: DeploymentAddresses = {
    network: network.name,
    chainId: Number(network.chainId),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AgentIdentityRegistry: "",
      ReputationRegistry: "",
      BountyRegistry: "",
      BountyEscrow: "",
    },
    transactionHashes: {
      AgentIdentityRegistry: "",
      ReputationRegistry: "",
      BountyRegistry: "",
      BountyEscrow: "",
    },
  };

  try {
    // ============ 1. Deploy AgentIdentityRegistry ============
    console.log("📝 [1/4] Deploying AgentIdentityRegistry...");
    const AgentIdentityRegistry = await ethers.getContractFactory("AgentIdentityRegistry");
    const identityRegistry = await AgentIdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();
    const identityAddress = await identityRegistry.getAddress();
    deploymentData.contracts.AgentIdentityRegistry = identityAddress;
    deploymentData.transactionHashes.AgentIdentityRegistry = identityRegistry.deploymentTransaction()?.hash || "";
    
    console.log(`   ✅ AgentIdentityRegistry deployed to: ${identityAddress}`);
    console.log(`   📋 Transaction: ${deploymentData.transactionHashes.AgentIdentityRegistry}`);
    console.log();

    // Wait for a few blocks for better reliability
    await waitForBlocks(2);

    // ============ 2. Deploy ReputationRegistry ============
    console.log("📝 [2/4] Deploying ReputationRegistry...");
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    const reputationRegistry = await ReputationRegistry.deploy(identityAddress);
    await reputationRegistry.waitForDeployment();
    const reputationAddress = await reputationRegistry.getAddress();
    deploymentData.contracts.ReputationRegistry = reputationAddress;
    deploymentData.transactionHashes.ReputationRegistry = reputationRegistry.deploymentTransaction()?.hash || "";
    
    console.log(`   ✅ ReputationRegistry deployed to: ${reputationAddress}`);
    console.log(`   📋 Transaction: ${deploymentData.transactionHashes.ReputationRegistry}`);
    console.log();

    await waitForBlocks(2);

    // ============ 3. Deploy BountyEscrow ============
    console.log("📝 [3/4] Deploying BountyEscrow...");
    const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
    const bountyEscrow = await BountyEscrow.deploy();
    await bountyEscrow.waitForDeployment();
    const escrowAddress = await bountyEscrow.getAddress();
    deploymentData.contracts.BountyEscrow = escrowAddress;
    deploymentData.transactionHashes.BountyEscrow = bountyEscrow.deploymentTransaction()?.hash || "";
    
    console.log(`   ✅ BountyEscrow deployed to: ${escrowAddress}`);
    console.log(`   📋 Transaction: ${deploymentData.transactionHashes.BountyEscrow}`);
    console.log();

    await waitForBlocks(2);

    // ============ 4. Deploy BountyRegistry ============
    console.log("📝 [4/4] Deploying BountyRegistry...");
    const BountyRegistry = await ethers.getContractFactory("BountyRegistry");
    const bountyRegistry = await BountyRegistry.deploy(
      identityAddress,
      reputationAddress,
      escrowAddress
    );
    await bountyRegistry.waitForDeployment();
    const bountyAddress = await bountyRegistry.getAddress();
    deploymentData.contracts.BountyRegistry = bountyAddress;
    deploymentData.transactionHashes.BountyRegistry = bountyRegistry.deploymentTransaction()?.hash || "";
    
    console.log(`   ✅ BountyRegistry deployed to: ${bountyAddress}`);
    console.log(`   📋 Transaction: ${deploymentData.transactionHashes.BountyRegistry}`);
    console.log();

    await waitForBlocks(2);

    // ============ 5. Setup Permissions ============
    console.log("🔐 Setting up permissions...");
    
    // Set BountyRegistry as authorized caller for ReputationRegistry
    const tx1 = await reputationRegistry.setAuthorizedCaller(bountyAddress, true);
    await tx1.wait();
    console.log(`   ✅ BountyRegistry authorized on ReputationRegistry`);
    
    // Set BountyRegistry as authorized caller for BountyEscrow
    const tx2 = await bountyEscrow.setAuthorizedRegistry(bountyAddress);
    await tx2.wait();
    console.log(`   ✅ BountyRegistry authorized on BountyEscrow`);
    console.log();

    // ============ 6. Save Deployment Info ============
    await saveDeploymentInfo(deploymentData);

    // ============ 7. Print Summary ============
    printSummary(deploymentData);

    // ============ 8. Update .env file ============
    updateEnvFile(deploymentData);

    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📝 Next steps:");
    console.log("   1. Verify contracts: npm run verify");
    console.log("   2. Seed test data: npm run seed");
    console.log("   3. Update frontend config with new addresses");
    console.log();

  } catch (error) {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  }
}

// Helper: Wait for N blocks
async function waitForBlocks(n: number) {
  console.log(`   ⏳ Waiting for ${n} blocks...`);
  for (let i = 0; i < n; i++) {
    await ethers.provider.send("evm_mine", []);
  }
}

// Helper: Save deployment info to JSON
async function saveDeploymentInfo(data: DeploymentAddresses) {
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save with network-specific filename
  const filename = `${data.network}-${data.chainId}.json`;
  const filepath = path.join(deploymentsDir, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`💾 Deployment info saved to: deployments/${filename}`);
  
  // Also save as "latest.json" for convenience
  const latestPath = path.join(deploymentsDir, "latest.json");
  fs.writeFileSync(latestPath, JSON.stringify(data, null, 2));
  console.log(`💾 Latest deployment saved to: deployments/latest.json`);
}

// Helper: Print deployment summary
function printSummary(data: DeploymentAddresses) {
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`Network:           ${data.network} (${data.chainId})`);
  console.log(`Deployer:          ${data.deployer}`);
  console.log(`Timestamp:         ${data.timestamp}`);
  console.log();
  console.log("Contract Addresses:");
  console.log(`  AgentIdentityRegistry:  ${data.contracts.AgentIdentityRegistry}`);
  console.log(`  ReputationRegistry:     ${data.contracts.ReputationRegistry}`);
  console.log(`  BountyRegistry:         ${data.contracts.BountyRegistry}`);
  console.log(`  BountyEscrow:           ${data.contracts.BountyEscrow}`);
  console.log("=".repeat(60));
}

// Helper: Update .env file with deployed addresses
function updateEnvFile(data: DeploymentAddresses) {
  const envPath = path.join(__dirname, "..", ".env");
  
  if (!fs.existsSync(envPath)) {
    console.log("⚠️  .env file not found, skipping update");
    return;
  }

  let envContent = fs.readFileSync(envPath, "utf-8");
  
  // Update contract addresses
  envContent = updateEnvVar(envContent, "AGENT_IDENTITY_REGISTRY", data.contracts.AgentIdentityRegistry);
  envContent = updateEnvVar(envContent, "REPUTATION_REGISTRY", data.contracts.ReputationRegistry);
  envContent = updateEnvVar(envContent, "BOUNTY_REGISTRY", data.contracts.BountyRegistry);
  envContent = updateEnvVar(envContent, "BOUNTY_ESCROW", data.contracts.BountyEscrow);
  
  fs.writeFileSync(envPath, envContent);
  console.log("✅ .env file updated with contract addresses");
}

function updateEnvVar(content: string, key: string, value: string): string {
  const regex = new RegExp(`^${key}=.*$`, "m");
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`);
  } else {
    return content + `\n${key}=${value}`;
  }
}

// Run deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
