#!/bin/bash
# Check network connectivity and account balance

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🔍 Network Connectivity Check"
echo "=============================="
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Copy .env.example to .env and configure it"
    exit 1
fi

# Source .env
source .env

# Check Monad RPC
echo "📡 Checking Monad Testnet..."
if curl -s -X POST -H "Content-Type: application/json" \
    --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
    "$MONAD_RPC" | grep -q "result"; then
    echo -e "${GREEN}✅ Monad RPC is reachable${NC}"
    
    # Get latest block
    BLOCK=$(curl -s -X POST -H "Content-Type: application/json" \
        --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        "$MONAD_RPC" | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    echo "   Latest block: $BLOCK"
else
    echo -e "${RED}❌ Cannot connect to Monad RPC${NC}"
    exit 1
fi

echo ""

# Check wallet balance
if [ -n "$PRIVATE_KEY" ]; then
    echo "💰 Checking wallet balance..."
    npx hardhat run scripts/check-balance.ts --network monad
else
    echo -e "${YELLOW}⚠️  PRIVATE_KEY not set in .env${NC}"
fi

echo ""
echo -e "${GREEN}✅ Network check complete${NC}"
