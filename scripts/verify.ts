import { run } from "hardhat";
import * as fs from "fs";
import * as path from "path";

interface DeploymentData {
  network: string;
  chainId: number;
  deployer: string;
  contracts: {
    AgentIdentityRegistry: string;
    ReputationRegistry: string;
    BountyRegistry: string;
    BountyEscrow: string;
  };
}

async function main() {
  console.log("\n🔍 Agent Bounty Hunter - Contract Verification");
  console.log("=".repeat(60));

  // Load latest deployment
  const deploymentPath = path.join(__dirname, "..", "deployments", "latest.json");
  
  if (!fs.existsSync(deploymentPath)) {
    console.error("❌ No deployment found. Run 'npm run deploy' first.");
    process.exit(1);
  }

  const deployment: DeploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  
  console.log(`📍 Network: ${deployment.network} (${deployment.chainId})`);
  console.log(`👤 Deployer: ${deployment.deployer}`);
  console.log("=".repeat(60));
  console.log();

  const errors: string[] = [];

  try {
    // ============ 1. Verify AgentIdentityRegistry ============
    console.log("📝 [1/4] Verifying AgentIdentityRegistry...");
    try {
      await run("verify:verify", {
        address: deployment.contracts.AgentIdentityRegistry,
        constructorArguments: [0], // 0 wei registration fee
      });
      console.log(`   ✅ AgentIdentityRegistry verified`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`   ℹ️  AgentIdentityRegistry already verified`);
      } else {
        console.error(`   ❌ Failed to verify AgentIdentityRegistry:`, error.message);
        errors.push(`AgentIdentityRegistry: ${error.message}`);
      }
    }
    console.log();

    // ============ 2. Verify ReputationRegistry ============
    console.log("📝 [2/4] Verifying ReputationRegistry...");
    try {
      await run("verify:verify", {
        address: deployment.contracts.ReputationRegistry,
        constructorArguments: [deployment.contracts.AgentIdentityRegistry],
      });
      console.log(`   ✅ ReputationRegistry verified`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`   ℹ️  ReputationRegistry already verified`);
      } else {
        console.error(`   ❌ Failed to verify ReputationRegistry:`, error.message);
        errors.push(`ReputationRegistry: ${error.message}`);
      }
    }
    console.log();

    // ============ 3. Verify BountyEscrow ============
    console.log("📝 [3/4] Verifying BountyEscrow...");
    try {
      await run("verify:verify", {
        address: deployment.contracts.BountyEscrow,
        constructorArguments: [deployment.contracts.AgentIdentityRegistry],
      });
      console.log(`   ✅ BountyEscrow verified`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`   ℹ️  BountyEscrow already verified`);
      } else {
        console.error(`   ❌ Failed to verify BountyEscrow:`, error.message);
        errors.push(`BountyEscrow: ${error.message}`);
      }
    }
    console.log();

    // ============ 4. Verify BountyRegistry ============
    console.log("📝 [4/4] Verifying BountyRegistry...");
    try {
      await run("verify:verify", {
        address: deployment.contracts.BountyRegistry,
        constructorArguments: [
          deployment.contracts.AgentIdentityRegistry,
          deployment.contracts.ReputationRegistry,
          deployment.contracts.BountyEscrow,
        ],
      });
      console.log(`   ✅ BountyRegistry verified`);
    } catch (error: any) {
      if (error.message.includes("Already Verified")) {
        console.log(`   ℹ️  BountyRegistry already verified`);
      } else {
        console.error(`   ❌ Failed to verify BountyRegistry:`, error.message);
        errors.push(`BountyRegistry: ${error.message}`);
      }
    }
    console.log();

    // ============ 5. Print Summary ============
    console.log("=".repeat(60));
    if (errors.length === 0) {
      console.log("✅ All contracts verified successfully!");
    } else {
      console.log(`⚠️  Verification completed with ${errors.length} error(s):`);
      errors.forEach((err, i) => {
        console.log(`   ${i + 1}. ${err}`);
      });
    }
    console.log("=".repeat(60));
    console.log();

    // Print explorer links
    printExplorerLinks(deployment);

  } catch (error) {
    console.error("\n❌ Verification process failed:", error);
    process.exit(1);
  }
}

function printExplorerLinks(deployment: DeploymentData) {
  let explorerUrl = "";
  
  // Determine explorer URL based on network
  switch (deployment.chainId) {
    case 10143: // Monad Testnet
      explorerUrl = "https://testnet.monadexplorer.com";
      break;
    case 80001: // Polygon Mumbai
      explorerUrl = "https://mumbai.polygonscan.com";
      break;
    case 1: // Ethereum Mainnet
      explorerUrl = "https://etherscan.io";
      break;
    case 137: // Polygon Mainnet
      explorerUrl = "https://polygonscan.com";
      break;
    default:
      console.log("⚠️  Unknown network, cannot generate explorer links");
      return;
  }

  console.log("🔗 Explorer Links:");
  console.log(`   AgentIdentityRegistry: ${explorerUrl}/address/${deployment.contracts.AgentIdentityRegistry}`);
  console.log(`   ReputationRegistry:    ${explorerUrl}/address/${deployment.contracts.ReputationRegistry}`);
  console.log(`   BountyRegistry:        ${explorerUrl}/address/${deployment.contracts.BountyRegistry}`);
  console.log(`   BountyEscrow:          ${explorerUrl}/address/${deployment.contracts.BountyEscrow}`);
  console.log();
}

// Run verification
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
