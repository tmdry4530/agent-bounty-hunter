import { ethers } from "hardhat";

async function main() {
  const [signer] = await ethers.getSigners();
  const address = await signer.getAddress();
  const balance = await ethers.provider.getBalance(address);
  
  console.log(`Address: ${address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
  
  const minBalance = ethers.parseEther("0.1");
  if (balance < minBalance) {
    console.log("⚠️  Warning: Balance is low! Get tokens from faucet.");
    console.log("   Monad: https://faucet.testnet.monad.xyz");
  } else {
    console.log("✅ Balance is sufficient for deployment");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
