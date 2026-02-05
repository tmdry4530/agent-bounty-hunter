const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());
  
  // 1. Deploy AgentIdentityRegistry
  console.log("\n📝 Deploying AgentIdentityRegistry...");
  const AgentIdentityRegistry = await hre.ethers.getContractFactory("AgentIdentityRegistry");
  const identityRegistry = await AgentIdentityRegistry.deploy();
  await identityRegistry.waitForDeployment();
  const identityAddress = await identityRegistry.getAddress();
  console.log("✅ AgentIdentityRegistry deployed to:", identityAddress);
  
  // 2. Deploy ReputationRegistry
  console.log("\n📊 Deploying ReputationRegistry...");
  const ReputationRegistry = await hre.ethers.getContractFactory("ReputationRegistry");
  const reputationRegistry = await ReputationRegistry.deploy(identityAddress);
  await reputationRegistry.waitForDeployment();
  const reputationAddress = await reputationRegistry.getAddress();
  console.log("✅ ReputationRegistry deployed to:", reputationAddress);
  
  // 3. Deploy BountyEscrow
  console.log("\n💰 Deploying BountyEscrow...");
  const BountyEscrow = await hre.ethers.getContractFactory("BountyEscrow");
  const escrow = await BountyEscrow.deploy(identityAddress);
  await escrow.waitForDeployment();
  const escrowAddress = await escrow.getAddress();
  console.log("✅ BountyEscrow deployed to:", escrowAddress);
  
  // 4. Deploy BountyRegistry
  console.log("\n🎯 Deploying BountyRegistry...");
  const BountyRegistry = await hre.ethers.getContractFactory("BountyRegistry");
  const bountyRegistry = await BountyRegistry.deploy(
    identityAddress,
    reputationAddress,
    escrowAddress
  );
  await bountyRegistry.waitForDeployment();
  const bountyAddress = await bountyRegistry.getAddress();
  console.log("✅ BountyRegistry deployed to:", bountyAddress);
  
  // 5. Link contracts
  console.log("\n🔗 Linking contracts...");
  await reputationRegistry.setBountyRegistry(bountyAddress);
  console.log("✅ ReputationRegistry linked to BountyRegistry");
  
  await escrow.initialize(
    bountyAddress,
    deployer.address, // Use deployer as dispute resolver initially
    deployer.address, // Use deployer as fee recipient initially
    100 // 1% platform fee
  );
  console.log("✅ BountyEscrow initialized");
  
  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📋 DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("AgentIdentityRegistry:", identityAddress);
  console.log("ReputationRegistry:   ", reputationAddress);
  console.log("BountyEscrow:        ", escrowAddress);
  console.log("BountyRegistry:      ", bountyAddress);
  console.log("=".repeat(60));
  
  // Save deployment info
  const fs = require("fs");
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      AgentIdentityRegistry: identityAddress,
      ReputationRegistry: reputationAddress,
      BountyEscrow: escrowAddress,
      BountyRegistry: bountyAddress,
    },
  };
  
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n✅ Deployment info saved to deployment.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
