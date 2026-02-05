import { ethers } from 'ethers';
import { IAgentRegistryABI } from './IAgentRegistry';
import { IBountyRegistryABI } from './IBountyRegistry';
import { IBountyEscrowABI } from './IBountyEscrow';

// ERC-20 Token Interface (for USDC)
export const IERC20ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) external returns (bool)',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)'
] as const;

// Contract factory functions
export function getAgentRegistryContract(address: string, provider: ethers.Provider) {
  return new ethers.Contract(address, IAgentRegistryABI, provider);
}

export function getBountyRegistryContract(address: string, provider: ethers.Provider) {
  return new ethers.Contract(address, IBountyRegistryABI, provider);
}

export function getBountyEscrowContract(address: string, provider: ethers.Provider) {
  return new ethers.Contract(address, IBountyEscrowABI, provider);
}

export function getERC20Contract(address: string, provider: ethers.Provider) {
  return new ethers.Contract(address, IERC20ABI, provider);
}

export {
  IAgentRegistryABI,
  IBountyRegistryABI,
  IBountyEscrowABI
};
