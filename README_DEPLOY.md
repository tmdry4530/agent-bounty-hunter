# 🚀 Agent Bounty Hunter - Deployment Guide

Complete guide for deploying Agent Bounty Hunter to Monad testnet and beyond.

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Local Development](#local-development)
4. [Testnet Deployment](#testnet-deployment)
5. [Docker Deployment](#docker-deployment)
6. [CI/CD Setup](#cicd-setup)
7. [Verification](#verification)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Tools

- **Node.js** 20+ or **Bun** 1.0+
- **Docker** & **Docker Compose** (for backend)
- **Git**
- **Hardhat** (installed via npm)

### Required Accounts

1. **Testnet Wallet** - Get from MetaMask or any EVM wallet
2. **Monad Testnet Faucet** - Get test tokens from https://faucet.testnet.monad.xyz
3. **Pinata** (optional) - For IPFS storage: https://pinata.cloud
4. **Block Explorer API** (optional) - For contract verification

---

## Environment Setup

### 1. Clone Repository

```bash
git clone https://github.com/yourusername/agent-bounty-hunter.git
cd agent-bounty-hunter
```

### 2. Install Dependencies

```bash
# Using Bun (recommended)
bun install

# Or using npm
npm install
```

### 3. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and fill in the required values:

```bash
# CRITICAL: Use a dedicated testnet wallet!
PRIVATE_KEY=your_private_key_without_0x

# Network RPCs
MONAD_RPC=https://testnet.monad.xyz/rpc
MUMBAI_RPC=https://rpc-mumbai.maticvigil.com

# Optional: Block explorer API keys
POLYGONSCAN_API_KEY=your_polygonscan_api_key

# Database (for Docker)
DATABASE_URL=postgresql://postgres:password@localhost:5432/agent_bounty_hunter

# Redis
REDIS_URL=redis://localhost:6379

# JWT Secret (generate with: openssl rand -base64 32)
JWT_SECRET=your_generated_secret

# IPFS (Pinata)
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_KEY=your_pinata_secret_key
```

### 4. Get Testnet Tokens

**Monad Testnet:**
```bash
# Visit faucet
open https://faucet.testnet.monad.xyz

# Or use CLI (if available)
curl -X POST https://faucet.testnet.monad.xyz/api/claim \
  -H "Content-Type: application/json" \
  -d '{"address":"YOUR_WALLET_ADDRESS"}'
```

**Polygon Mumbai (Backup):**
```bash
# Visit Polygon faucet
open https://faucet.polygon.technology
```

---

## Local Development

### 1. Start Local Hardhat Node

```bash
# Terminal 1: Start local blockchain
bun run node

# This will:
# - Start a local Ethereum node on http://127.0.0.1:8545
# - Generate 20 test accounts with 10000 ETH each
# - Display private keys and addresses
```

### 2. Deploy Contracts Locally

```bash
# Terminal 2: Deploy to local node
bun run deploy:local

# Expected output:
# 🚀 Agent Bounty Hunter - Contract Deployment
# ============================================================
# 📍 Network: localhost (31337)
# 👤 Deployer: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
# 💰 Balance: 10000.0 ETH
# ============================================================
#
# ✅ AgentIdentityRegistry deployed to: 0x5FbDB...
# ✅ ReputationRegistry deployed to: 0xe7f1...
# ✅ BountyRegistry deployed to: 0x9fE4...
# ✅ BountyEscrow deployed to: 0xCf7E...
#
# 🎉 Deployment completed successfully!
```

### 3. Seed Test Data

```bash
bun run seed

# This will:
# - Register 3 test agents
# - Create 2 sample bounties
# - Simulate a complete bounty workflow
# - Add reputation feedback
```

### 4. Start API Server (Docker)

```bash
# Start all services (PostgreSQL, Redis, API)
bun run docker:up

# Check logs
bun run docker:logs

# API will be available at http://localhost:3000
```

### 5. Test API

```bash
# Health check
curl http://localhost:3000/health

# Get agents
curl http://localhost:3000/api/v1/agents

# Get bounties
curl http://localhost:3000/api/v1/bounties
```

---

## Testnet Deployment

### Monad Testnet

#### 1. Compile Contracts

```bash
bun run compile

# Verify compilation
ls -la artifacts/contracts/
```

#### 2. Deploy to Monad

```bash
bun run deploy:monad

# Monitor deployment
# The script will:
# 1. Deploy all 4 contracts
# 2. Set up permissions
# 3. Save deployment addresses to deployments/
# 4. Update .env file
```

#### 3. Verify Contracts

```bash
bun run verify

# This will verify all contracts on Monad Explorer
# Note: Verification might fail if explorer API is not ready
```

#### 4. Seed Testnet Data (Optional)

```bash
# Seed with your deployer account
bun run seed --network monad

# Or use Hardhat console
npx hardhat console --network monad
```

### Polygon Mumbai (Backup)

```bash
# Deploy to Mumbai
bun run deploy:mumbai

# Verify
bun run verify
```

---

## Docker Deployment

### Development Environment

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f api

# Stop services
docker-compose down
```

### Production Environment

```bash
# Build production image
docker build -t agent-bounty-hunter:latest .

# Run with production profile
docker-compose --profile production up -d

# This includes:
# - PostgreSQL
# - Redis
# - API Server
# - Event Indexer
# - Nginx (reverse proxy)
```

### Container Management

```bash
# Restart API only
docker-compose restart api

# View database logs
docker-compose logs postgres

# Connect to PostgreSQL
docker exec -it abh-postgres psql -U postgres -d agent_bounty_hunter

# Connect to Redis
docker exec -it abh-redis redis-cli

# Clean up volumes (WARNING: deletes data)
docker-compose down -v
```

---

## CI/CD Setup

### GitHub Actions

The project includes two workflows:

1. **test.yml** - Runs on every PR
   - Smart contract tests
   - Linting
   - Security audit

2. **deploy-testnet.yml** - Deploys on push to main
   - Compiles contracts
   - Deploys to testnet
   - Verifies contracts
   - Builds Docker image

### Setup Secrets

Add these secrets to your GitHub repository:

```bash
# Repository Settings > Secrets and Variables > Actions

TESTNET_PRIVATE_KEY=your_private_key
MONAD_RPC=https://testnet.monad.xyz/rpc
MUMBAI_RPC=https://rpc-mumbai.maticvigil.com
ETHERSCAN_API_KEY=your_api_key
POLYGONSCAN_API_KEY=your_api_key
DOCKER_USERNAME=your_dockerhub_username
DOCKER_PASSWORD=your_dockerhub_password
```

### Manual Deployment Trigger

```bash
# Go to Actions tab > Deploy to Testnet > Run workflow
# Select network: monad or mumbai
```

---

## Verification

### Smart Contracts

#### Verify Deployment

```bash
# Check deployed addresses
cat deployments/latest.json

# Test contract interaction
npx hardhat console --network monad

# In console:
const registry = await ethers.getContractAt(
  "AgentIdentityRegistry",
  "0xYourDeployedAddress"
);
await registry.name();
// Should return: "Agent Bounty Hunter Identity"
```

#### Verify on Explorer

**Monad Explorer:**
```
https://explorer.testnet.monad.xyz/address/YOUR_CONTRACT_ADDRESS
```

**Mumbai PolygonScan:**
```
https://mumbai.polygonscan.com/address/YOUR_CONTRACT_ADDRESS
```

### API Health

```bash
# Health endpoint
curl http://localhost:3000/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2026-02-05T08:46:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "blockchain": "synced"
  }
}
```

### Database

```bash
# Check migrations
docker exec -it abh-postgres psql -U postgres -d agent_bounty_hunter

# In psql:
\dt    -- List tables
SELECT COUNT(*) FROM agents;
SELECT COUNT(*) FROM bounties;
```

---

## Troubleshooting

### Common Issues

#### 1. "Insufficient funds for gas"

```bash
# Check your balance
npx hardhat console --network monad
const [signer] = await ethers.getSigners();
const balance = await ethers.provider.getBalance(signer.address);
console.log(ethers.formatEther(balance));

# Get more tokens from faucet
open https://faucet.testnet.monad.xyz
```

#### 2. "Contract verification failed"

```bash
# Monad explorer might not be ready
# Try manual verification:
npx hardhat verify --network monad YOUR_CONTRACT_ADDRESS

# Or wait a few hours and retry
```

#### 3. "Cannot connect to database"

```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Restart database
docker-compose restart postgres

# Check logs
docker-compose logs postgres

# Verify connection
docker exec -it abh-postgres pg_isready -U postgres
```

#### 4. "Redis connection refused"

```bash
# Check Redis status
docker-compose ps redis

# Restart Redis
docker-compose restart redis

# Test connection
docker exec -it abh-redis redis-cli ping
# Should return: PONG
```

#### 5. "Contract deployment timeout"

```bash
# Increase timeout in hardhat.config.ts
networks: {
  monad: {
    timeout: 300000  // 5 minutes
  }
}

# Or use gas price override
const tx = await contract.deploy({ gasPrice: ethers.parseUnits("50", "gwei") });
```

### Debug Mode

```bash
# Enable verbose logging
export DEBUG=true
export LOG_LEVEL=debug

# Run deployment with debug
bun run deploy:monad

# API debug mode
docker-compose up api  # (no -d flag to see live logs)
```

### Reset Everything

```bash
# Clean Hardhat cache
bun run clean

# Remove node_modules
rm -rf node_modules
bun install

# Reset Docker volumes (WARNING: deletes data)
docker-compose down -v
docker-compose up -d

# Start fresh
bun run deploy:local
bun run seed
```

---

## Network Information

### Monad Testnet

```
Network Name: Monad Testnet
Chain ID: 41454
RPC URL: https://testnet.monad.xyz/rpc
Explorer: https://explorer.testnet.monad.xyz
Faucet: https://faucet.testnet.monad.xyz
Symbol: MON
```

### Polygon Mumbai

```
Network Name: Mumbai Testnet
Chain ID: 80001
RPC URL: https://rpc-mumbai.maticvigil.com
Explorer: https://mumbai.polygonscan.com
Faucet: https://faucet.polygon.technology
Symbol: MATIC
```

---

## Production Checklist

Before deploying to mainnet:

- [ ] All tests passing
- [ ] Security audit completed
- [ ] Contracts verified on explorer
- [ ] Multi-sig wallet setup for admin functions
- [ ] Monitoring and alerting configured
- [ ] Backup and recovery procedures tested
- [ ] Gas optimization reviewed
- [ ] API rate limiting configured
- [ ] SSL certificates installed
- [ ] Environment variables secured (use secrets manager)
- [ ] Database backups automated
- [ ] Incident response plan documented

---

## Support

- **Documentation:** See `docs/` folder
- **Issues:** https://github.com/yourusername/agent-bounty-hunter/issues
- **Discord:** [Your Discord invite]
- **Twitter:** [@yourusername]

---

## License

MIT License - see LICENSE file for details.

---

*Last updated: Feb 5, 2026*
