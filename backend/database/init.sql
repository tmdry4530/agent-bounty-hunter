-- Agent Bounty Hunter Database Initialization
-- This file is run on first PostgreSQL container startup

-- Create database (handled by POSTGRES_DB env var, but just in case)
-- CREATE DATABASE agent_bounty_hunter;

-- Use the database
\c agent_bounty_hunter;

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id SERIAL PRIMARY KEY,
    on_chain_id INTEGER NOT NULL UNIQUE,
    owner_address TEXT NOT NULL,
    wallet_address TEXT NOT NULL,
    name TEXT,
    description TEXT,
    image_url TEXT,
    registration_uri TEXT NOT NULL,
    skills TEXT[],
    pricing JSONB,
    reputation_score INTEGER DEFAULT 50,
    completed_bounties INTEGER DEFAULT 0,
    total_earnings TEXT DEFAULT '0',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on reputation score (descending for leaderboard queries)
CREATE INDEX IF NOT EXISTS idx_agents_reputation ON agents (reputation_score DESC);

-- Bounties table
CREATE TABLE IF NOT EXISTS bounties (
    id SERIAL PRIMARY KEY,
    on_chain_id INTEGER NOT NULL UNIQUE,
    creator_agent_id INTEGER REFERENCES agents(id),
    title TEXT NOT NULL,
    description TEXT,
    description_uri TEXT NOT NULL,
    type TEXT,
    required_skills TEXT[],
    reward_amount TEXT NOT NULL,
    reward_token TEXT NOT NULL,
    deadline TIMESTAMP NOT NULL,
    min_reputation INTEGER DEFAULT 0,
    status TEXT DEFAULT 'open',
    claimed_by INTEGER REFERENCES agents(id),
    claimed_at TIMESTAMP,
    submission_uri TEXT,
    submitted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for bounties
CREATE INDEX IF NOT EXISTS idx_bounties_status ON bounties (status);
CREATE INDEX IF NOT EXISTS idx_bounties_deadline ON bounties (deadline);

-- Reviews table
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    bounty_id INTEGER REFERENCES bounties(id),
    from_agent_id INTEGER REFERENCES agents(id),
    to_agent_id INTEGER REFERENCES agents(id),
    rating INTEGER NOT NULL,
    feedback TEXT,
    evidence_hash TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks table
CREATE TABLE IF NOT EXISTS webhooks (
    id SERIAL PRIMARY KEY,
    agent_id INTEGER REFERENCES agents(id),
    url TEXT NOT NULL,
    events TEXT[],
    secret TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create function for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for auto-updating updated_at
DROP TRIGGER IF EXISTS update_agents_updated_at ON agents;
CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bounties_updated_at ON bounties;
CREATE TRIGGER update_bounties_updated_at
    BEFORE UPDATE ON bounties
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (for non-superuser access if needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Done
SELECT 'Database initialized successfully' AS status;
