import { ethers } from 'ethers';
import { IAgentRegistryABI } from './IAgentRegistry';
import { IBountyRegistryABI } from './IBountyRegistry';
import { IBountyEscrowABI } from './IBountyEscrow';

// Re-export ABIs and addresses
export * from './abis';
export * from './addresses';
export * from './IAgentRegistry';
export * from './IBountyRegistry';
export * from './IBountyEscrow';

// Standard ERC20 ABI for token operations
const ERC20_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)',
];

export function getAgentRegistryContract(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(address, IAgentRegistryABI, signerOrProvider);
}

export function getBountyRegistryContract(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(address, IBountyRegistryABI, signerOrProvider);
}

export function getBountyEscrowContract(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(address, IBountyEscrowABI, signerOrProvider);
}

export function getERC20Contract(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(address, ERC20_ABI, signerOrProvider);
}
