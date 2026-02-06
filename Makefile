.PHONY: help install compile test deploy verify seed clean docker-up docker-down check-network

# Default target
help:
	@echo "🎯 Agent Bounty Hunter - Make Commands"
	@echo "======================================"
	@echo ""
	@echo "📦 Setup:"
	@echo "  make install         - Install dependencies"
	@echo "  make check-network   - Check network connectivity"
	@echo ""
	@echo "🔨 Smart Contracts:"
	@echo "  make compile         - Compile contracts"
	@echo "  make test            - Run tests"
	@echo "  make clean           - Clean artifacts"
	@echo ""
	@echo "🚀 Deployment:"
	@echo "  make deploy          - Deploy to default network"
	@echo "  make deploy-monad    - Deploy to Monad testnet"
	@echo "  make deploy-mumbai   - Deploy to Mumbai testnet"
	@echo "  make deploy-local    - Deploy to local node"
	@echo "  make verify          - Verify contracts"
	@echo "  make seed            - Seed test data"
	@echo ""
	@echo "🐳 Docker:"
	@echo "  make docker-up       - Start all services"
	@echo "  make docker-down     - Stop all services"
	@echo "  make docker-logs     - View logs"
	@echo "  make docker-clean    - Clean volumes (⚠️  deletes data)"
	@echo ""
	@echo "🧪 Local Development:"
	@echo "  make dev             - Start local blockchain + deploy"
	@echo "  make dev-full        - Full setup (docker + backend)"
	@echo "  make docker-dev      - Docker with local hardhat node"
	@echo "  make api             - Start API server"
	@echo "  make indexer         - Start Event Indexer"
	@echo "  make backend-install - Install backend dependencies"
	@echo "  make sdk-install     - Install SDK dependencies"
	@echo "  make sdk-build       - Build SDK"
	@echo "  make integration-test - Run E2E tests"
	@echo ""

# Setup
install:
	@echo "📦 Installing dependencies..."
	bun install

check-network:
	@echo "🔍 Checking network connectivity..."
	./scripts/check-network.sh

# Smart Contracts
compile:
	@echo "🔨 Compiling contracts..."
	bun run compile

test:
	@echo "🧪 Running tests..."
	bun run test

clean:
	@echo "🧹 Cleaning artifacts..."
	bun run clean
	rm -rf node_modules
	rm -rf backend/node_modules
	rm -rf sdk/node_modules

# Deployment
deploy:
	@echo "🚀 Deploying contracts..."
	bun run deploy

deploy-monad:
	@echo "🚀 Deploying to Monad testnet..."
	bun run deploy:monad

deploy-mumbai:
	@echo "🚀 Deploying to Mumbai testnet..."
	bun run deploy:mumbai

deploy-local:
	@echo "🚀 Deploying to local node..."
	bun run deploy:local

verify:
	@echo "✅ Verifying contracts..."
	bun run verify

seed:
	@echo "🌱 Seeding test data..."
	bun run seed

# Docker
docker-up:
	@echo "🐳 Starting Docker services..."
	docker-compose up -d
	@echo "✅ Services started. View logs with 'make docker-logs'"

docker-down:
	@echo "🐳 Stopping Docker services..."
	docker-compose down

docker-logs:
	@echo "📋 Viewing logs (Ctrl+C to exit)..."
	docker-compose logs -f

docker-clean:
	@echo "⚠️  This will delete all data!"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		echo "✅ Cleaned"; \
	fi

# Development
dev: deploy-local seed
	@echo "✅ Local environment ready!"

api:
	@echo "🚀 Starting API server..."
	cd backend && bun run dev

indexer:
	@echo "🔄 Starting Event Indexer..."
	cd backend && bun run indexer

backend-install:
	@echo "📦 Installing backend dependencies..."
	cd backend && bun install

sdk-install:
	@echo "📦 Installing SDK dependencies..."
	cd sdk && bun install

sdk-build:
	@echo "🔨 Building SDK..."
	cd sdk && bun run build

# Full local development setup
dev-full: docker-up backend-install
	@echo "⏳ Waiting for services to be healthy..."
	sleep 5
	@echo "🚀 Starting API in dev mode..."
	cd backend && bun run dev

# Docker with hardhat for local blockchain
docker-dev:
	@echo "🐳 Starting Docker services with local blockchain..."
	docker-compose --profile dev up -d
	@echo "✅ Services started including hardhat node on port 8545"

# Integration test
integration-test:
	@echo "🧪 Running integration tests..."
	bun test test/integration/

# CI/CD
ci-test:
	@echo "🧪 Running CI tests..."
	bun run compile
	bun run test
	bun run lint

# Shortcuts
d: deploy
v: verify
s: seed
t: test
c: compile
