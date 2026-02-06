# ⚡ Quick Start Guide

Get Agent Bounty Hunter running in 5 minutes.

---

## 🚀 Local Development (Fastest)

```bash
# 1. Install dependencies
bun install

# 2. Copy environment
cp .env.example .env

# 3. Start local blockchain (Terminal 1)
bun run node

# 4. Deploy contracts (Terminal 2)
bun run deploy:local

# 5. Seed test data
bun run seed

# 6. Start backend (Terminal 3)
bun run docker:up

# 7. Test API
curl http://localhost:3000/health
```

**Done!** 🎉 Your local environment is ready.

---

## 🌐 Monad Testnet Deployment

```bash
# 1. Get testnet tokens
open https://faucet.testnet.monad.xyz

# 2. Configure .env
PRIVATE_KEY=your_key_here
MONAD_RPC=https://testnet.monad.xyz/rpc

# 3. Check connectivity
./scripts/check-network.sh

# 4. Deploy
bun run deploy:monad

# 5. Verify
bun run verify

# 6. Seed (optional)
bun run seed --network monad
```

**Deployed!** 🚀 Check deployment info in `deployments/latest.json`

---

## 🐳 Docker Only

```bash
# Start everything with Docker
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

---

## 📋 Contract Addresses

After deployment, find addresses in:
- `deployments/latest.json`
- `.env` (auto-updated)

---

## 🔗 Useful Commands

```bash
# Compile contracts
bun run compile

# Run tests
bun run test

# Deploy to Mumbai (backup)
bun run deploy:mumbai

# Clean and rebuild
bun run clean && bun install

# View gas report
REPORT_GAS=true bun run test
```

---

## 📚 Full Documentation

See [README_DEPLOY.md](./README_DEPLOY.md) for complete guide.

---

## ⚠️ Troubleshooting

**"Insufficient funds"**
→ Get tokens from faucet

**"Cannot connect"**
→ Check `MONAD_RPC` in `.env`

**"Deployment failed"**
→ Run `./scripts/check-network.sh`

**Database errors**
→ `docker-compose restart postgres`

---

## 🆘 Need Help?

- See [README_DEPLOY.md](./README_DEPLOY.md) - Full deployment guide
- See `docs/` - Architecture & API docs
- Open an issue on GitHub

---

**Happy hunting!** 🎯
