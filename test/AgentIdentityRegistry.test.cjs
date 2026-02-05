const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("AgentIdentityRegistry", function () {
  let identityRegistry;
  let owner, agent1, agent2, wallet1;

  beforeEach(async function () {
    [owner, agent1, agent2, wallet1] = await ethers.getSigners();
    
    const AgentIdentityRegistry = await ethers.getContractFactory("AgentIdentityRegistry");
    identityRegistry = await AgentIdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();
  });

  describe("Agent Registration", function () {
    it("Should register a new agent", async function () {
      const agentURI = "ipfs://QmTest123";
      
      const tx = await identityRegistry.connect(agent1).register(agentURI);
      await tx.wait();
      
      const agentId = 1n;
      expect(await identityRegistry.ownerOf(agentId)).to.equal(agent1.address);
      expect(await identityRegistry.tokenURI(agentId)).to.equal(agentURI);
      expect(await identityRegistry.totalAgents()).to.equal(1n);
    });

    it("Should register with metadata", async function () {
      const agentURI = "ipfs://QmTest123";
      const metadata = [
        { key: "skill", value: ethers.toUtf8Bytes("coding") },
        { key: "pricing", value: ethers.toUtf8Bytes("100") },
      ];
      
      const tx = await identityRegistry.connect(agent1).registerWithMetadata(agentURI, metadata);
      await tx.wait();
      
      const agentId = 1n;
      const skill = await identityRegistry.getMetadata(agentId, "skill");
      expect(ethers.toUtf8String(skill)).to.equal("coding");
    });

    it("Should set agent wallet on registration", async function () {
      const tx = await identityRegistry.connect(agent1).register("ipfs://QmTest");
      await tx.wait();
      
      const agentId = 1n;
      expect(await identityRegistry.getAgentWallet(agentId)).to.equal(agent1.address);
    });

    it("Should prevent setting agentWallet via metadata", async function () {
      const metadata = [
        { key: "agentWallet", value: ethers.toUtf8Bytes(wallet1.address) },
      ];
      
      await expect(
        identityRegistry.connect(agent1).registerWithMetadata("ipfs://QmTest", metadata)
      ).to.be.revertedWith("Cannot set agentWallet via metadata");
    });
  });

  describe("Metadata Management", function () {
    let agentId;

    beforeEach(async function () {
      await identityRegistry.connect(agent1).register("ipfs://QmTest");
      agentId = 1n;
    });

    it("Should set and get metadata", async function () {
      await identityRegistry.connect(agent1).setMetadata(
        agentId, 
        "skill", 
        ethers.toUtf8Bytes("development")
      );
      
      const skill = await identityRegistry.getMetadata(agentId, "skill");
      expect(ethers.toUtf8String(skill)).to.equal("development");
    });

    it("Should batch set metadata", async function () {
      const entries = [
        { key: "skill1", value: ethers.toUtf8Bytes("coding") },
        { key: "skill2", value: ethers.toUtf8Bytes("design") },
      ];
      
      await identityRegistry.connect(agent1).setMetadataBatch(agentId, entries);
      
      const skill1 = await identityRegistry.getMetadata(agentId, "skill1");
      const skill2 = await identityRegistry.getMetadata(agentId, "skill2");
      expect(ethers.toUtf8String(skill1)).to.equal("coding");
      expect(ethers.toUtf8String(skill2)).to.equal("design");
    });

    it("Should only allow owner to set metadata", async function () {
      await expect(
        identityRegistry.connect(agent2).setMetadata(agentId, "skill", ethers.toUtf8Bytes("hacking"))
      ).to.be.revertedWith("Not authorized");
    });
  });

  describe("Wallet Management", function () {
    let agentId;

    beforeEach(async function () {
      await identityRegistry.connect(agent1).register("ipfs://QmTest");
      agentId = 1n;
    });

    it("Should unset agent wallet", async function () {
      await identityRegistry.connect(agent1).unsetAgentWallet(agentId);
      expect(await identityRegistry.getAgentWallet(agentId)).to.equal(ethers.ZeroAddress);
    });

    it("Should clear wallet on transfer", async function () {
      await identityRegistry.connect(agent1).transferFrom(agent1.address, agent2.address, agentId);
      expect(await identityRegistry.getAgentWallet(agentId)).to.equal(ethers.ZeroAddress);
    });
  });

  describe("View Functions", function () {
    it("Should get agent ID by owner", async function () {
      await identityRegistry.connect(agent1).register("ipfs://QmTest1");
      await identityRegistry.connect(agent1).register("ipfs://QmTest2");
      
      const agentId = await identityRegistry.getAgentIdByOwner(agent1.address);
      expect(agentId).to.equal(1n); // Returns first
    });

    it("Should get all agent IDs by owner", async function () {
      await identityRegistry.connect(agent1).register("ipfs://QmTest1");
      await identityRegistry.connect(agent1).register("ipfs://QmTest2");
      
      const agentIds = await identityRegistry.getAgentIdsByOwner(agent1.address);
      expect(agentIds.length).to.equal(2);
      expect(agentIds[0]).to.equal(1n);
      expect(agentIds[1]).to.equal(2n);
    });

    it("Should return 0 for non-existent owner", async function () {
      const agentId = await identityRegistry.getAgentIdByOwner(agent2.address);
      expect(agentId).to.equal(0n);
    });
  });
});
