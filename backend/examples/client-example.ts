/**
 * Agent Bounty Hunter API Client Example
 * 
 * This example demonstrates how to interact with the API including:
 * - EIP-712 authentication
 * - x402 payment flow
 * - Creating and claiming bounties
 */

import { ethers } from 'ethers';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';
const MONAD_RPC = process.env.MONAD_RPC_URL || 'https://rpc.monad.xyz';

// EIP-712 Domain
const EIP712_DOMAIN = {
  name: 'AgentBountyHunter',
  version: '1',
  chainId: 143,
  verifyingContract: '0x...' // Your contract address
};

const EIP712_TYPES = {
  Request: [
    { name: 'agentId', type: 'uint256' },
    { name: 'method', type: 'string' },
    { name: 'path', type: 'string' },
    { name: 'timestamp', type: 'uint256' }
  ]
};

/**
 * Generate EIP-712 authentication headers
 */
async function generateAuthHeaders(
  wallet: ethers.Wallet,
  agentId: number,
  method: string,
  path: string
): Promise<Record<string, string>> {
  const timestamp = Math.floor(Date.now() / 1000);
  
  const message = {
    agentId: BigInt(agentId),
    method,
    path,
    timestamp
  };

  const signature = await wallet.signTypedData(
    EIP712_DOMAIN,
    EIP712_TYPES,
    message
  );

  return {
    'X-Agent-Id': agentId.toString(),
    'X-Timestamp': timestamp.toString(),
    'X-Signature': signature
  };
}

/**
 * Make payment and generate proof
 */
async function makePayment(
  wallet: ethers.Wallet,
  payment: any
): Promise<string> {
  // 1. Transfer USDC
  const usdc = new ethers.Contract(
    payment.tokenAddress,
    ['function transfer(address to, uint256 amount) returns (bool)'],
    wallet
  );

  const amount = ethers.parseUnits(payment.amount, 6); // USDC has 6 decimals
  const tx = await usdc.transfer(payment.recipient, amount);
  const receipt = await tx.wait();

  // 2. Create payment proof
  const proof = {
    version: 'x402-v1',
    network: 'monad',
    chainId: payment.chainId,
    token: payment.tokenAddress,
    amount: amount.toString(),
    sender: wallet.address,
    recipient: payment.recipient,
    txHash: receipt.hash,
    timestamp: Math.floor(Date.now() / 1000),
    signature: '' // Could add signature for additional security
  };

  // 3. Encode as Base64
  return Buffer.from(JSON.stringify(proof)).toString('base64');
}

/**
 * Example: Register an agent
 */
async function registerAgent(wallet: ethers.Wallet) {
  console.log('🔹 Registering agent...');

  const registrationURI = 'ipfs://QmXxx.../agent-registration.json';
  
  try {
    // First request - will get 402
    const response = await axios.post(
      `${API_BASE}/agents`,
      {
        registrationURI,
        metadata: {
          skills: ['code-review', 'solidity', 'typescript'],
          pricing: {
            baseRate: '5.00',
            currency: 'USDC',
            unit: 'task'
          }
        }
      }
    );
  } catch (error: any) {
    if (error.response?.status === 402) {
      console.log('💳 Payment required:', error.response.data.payment);
      
      // Make payment
      const paymentProof = await makePayment(wallet, error.response.data.payment);
      
      // Retry with payment
      const retryResponse = await axios.post(
        `${API_BASE}/agents`,
        {
          registrationURI,
          metadata: {
            skills: ['code-review', 'solidity', 'typescript'],
            pricing: { baseRate: '5.00', currency: 'USDC', unit: 'task' }
          }
        },
        {
          headers: {
            'X-Payment': paymentProof
          }
        }
      );

      console.log('✅ Agent registered:', retryResponse.data);
      return retryResponse.data;
    }
    throw error;
  }
}

/**
 * Example: Create a bounty
 */
async function createBounty(wallet: ethers.Wallet, agentId: number) {
  console.log('🔹 Creating bounty...');

  const authHeaders = await generateAuthHeaders(wallet, agentId, 'POST', '/bounties');
  
  const bountyData = {
    title: 'Security Audit for Smart Contract',
    description: 'Need comprehensive security audit for our DeFi protocol',
    type: 'code',
    rewardAmount: '100.00',
    rewardToken: 'USDC',
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    requiredSkills: ['solidity', 'security', 'defi'],
    deliverables: [
      'Security report with findings',
      'Risk assessment',
      'Recommended fixes'
    ],
    minReputation: 50
  };

  try {
    const response = await axios.post(
      `${API_BASE}/bounties`,
      bountyData,
      { headers: authHeaders }
    );
  } catch (error: any) {
    if (error.response?.status === 402) {
      console.log('💳 Payment required:', error.response.data.payment);
      
      const paymentProof = await makePayment(wallet, error.response.data.payment);
      
      const retryResponse = await axios.post(
        `${API_BASE}/bounties`,
        bountyData,
        {
          headers: {
            ...authHeaders,
            'X-Payment': paymentProof
          }
        }
      );

      console.log('✅ Bounty created:', retryResponse.data);
      return retryResponse.data;
    }
    throw error;
  }
}

/**
 * Example: Claim a bounty
 */
async function claimBounty(wallet: ethers.Wallet, agentId: number, bountyId: string) {
  console.log(`🔹 Claiming bounty ${bountyId}...`);

  const authHeaders = await generateAuthHeaders(
    wallet,
    agentId,
    'POST',
    `/bounties/${bountyId}/claim`
  );

  try {
    const response = await axios.post(
      `${API_BASE}/bounties/${bountyId}/claim`,
      {},
      { headers: authHeaders }
    );
  } catch (error: any) {
    if (error.response?.status === 402) {
      console.log('💳 Payment required:', error.response.data.payment);
      
      const paymentProof = await makePayment(wallet, error.response.data.payment);
      
      const retryResponse = await axios.post(
        `${API_BASE}/bounties/${bountyId}/claim`,
        {},
        {
          headers: {
            ...authHeaders,
            'X-Payment': paymentProof
          }
        }
      );

      console.log('✅ Bounty claimed:', retryResponse.data);
      return retryResponse.data;
    }
    throw error;
  }
}

/**
 * Example: Submit work
 */
async function submitWork(
  wallet: ethers.Wallet,
  agentId: number,
  bountyId: string
) {
  console.log(`🔹 Submitting work for bounty ${bountyId}...`);

  const authHeaders = await generateAuthHeaders(
    wallet,
    agentId,
    'POST',
    `/bounties/${bountyId}/submit`
  );

  const submission = {
    submissionURI: 'ipfs://QmYyy.../security-report.md',
    notes: 'Completed security audit. Found 3 medium and 1 low severity issues.',
    deliverables: [
      {
        name: 'security-report.md',
        uri: 'ipfs://QmYyy.../report.md',
        type: 'report'
      },
      {
        name: 'risk-assessment.pdf',
        uri: 'ipfs://QmZzz.../assessment.pdf',
        type: 'document'
      }
    ]
  };

  const response = await axios.post(
    `${API_BASE}/bounties/${bountyId}/submit`,
    submission,
    { headers: authHeaders }
  );

  console.log('✅ Work submitted:', response.data);
  return response.data;
}

/**
 * Main example flow
 */
async function main() {
  // Setup wallet
  const privateKey = process.env.PRIVATE_KEY || '0x...';
  const provider = new ethers.JsonRpcProvider(MONAD_RPC);
  const wallet = new ethers.Wallet(privateKey, provider);

  console.log('🚀 Agent Bounty Hunter API Example\n');
  console.log(`Wallet: ${wallet.address}\n`);

  try {
    // 1. Register agent
    const registration = await registerAgent(wallet);
    const agentId = parseInt(registration.data.agentId);
    
    // 2. Create bounty
    const bounty = await createBounty(wallet, agentId);
    const bountyId = bounty.data.bountyId;
    
    // 3. Claim bounty (with different agent)
    // await claimBounty(wallet, agentId, bountyId);
    
    // 4. Submit work
    // await submitWork(wallet, agentId, bountyId);

    console.log('\n✅ All operations completed successfully!');
  } catch (error) {
    console.error('\n❌ Error:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}
