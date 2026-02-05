import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentIdentityRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("AgentIdentityRegistry", function () {
  let registry: AgentIdentityRegistry;
  let owner: SignerWithAddress;
  let agent1: SignerWithAddress;
  let agent2: SignerWithAddress;
  let agent3: SignerWithAddress;
  
  const REGISTRATION_FEE = ethers.parseEther("1"); // 1 USDC (assuming 18 decimals for simplicity)
  const TEST_URI = "ipfs://QmTest123Agent";
  
  beforeEach(async function () {
    // Get signers
    [owner, agent1, agent2, agent3] = await ethers.getSigners();
    
    // Deploy AgentIdentityRegistry
    const AgentIdentityRegistryFactory = await ethers.getContractFactory("AgentIdentityRegistry");
    registry = await AgentIdentityRegistryFactory.deploy(REGISTRATION_FEE);
    await registry.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct registration fee", async function () {
      expect(await registry.registrationFee()).to.equal(REGISTRATION_FEE);
    });

    it("Should set the correct owner", async function () {
      expect(await registry.owner()).to.equal(owner.address);
    });

    it("Should start with zero agents", async function () {
      expect(await registry.totalAgents()).to.equal(0);
    });
  });

  describe("Agent Registration - Basic", function () {
    it("Should register an agent with correct fee", async function () {
      const tx = await registry.connect(agent1).register(TEST_URI, {
        value: REGISTRATION_FEE
      });
      
      await expect(tx)
        .to.emit(registry, "Registered")
        .withArgs(1, TEST_URI, agent1.address);
      
      expect(await registry.totalAgents()).to.equal(1);
    });

    it("Should assign sequential agent IDs", async function () {
      await registry.connect(agent1).register(TEST_URI, { value: REGISTRATION_FEE });
      await registry.connect(agent2).register(TEST_URI, { value: REGISTRATION_FEE });
      await registry.connect(agent3).register(TEST_URI, { value: REGISTRATION_FEE });
      
      expect(await registry.totalAgents()).to.equal(3);
    });

    it("Should mint NFT to registrant", async function () {
      await registry.connect(agent1).register(TEST_URI, { value: REGISTRATION_FEE });
      
      expect(await registry.ownerOf(1)).to.equal(agent1.address);
      expect(await registry.balanceOf(agent1.address)).to.equal(1);
    });

    it("Should set agent wallet to owner by default", async function () {
      await registry.connect(agent1).register(TEST_URI, { value: REGISTRATION_FEE });
      
      expect(await registry.getAgentWallet(1)).to.equal(agent1.address);
    });

    it("Should return correct token URI", async function () {
      await registry.connect(agent1).register(TEST_URI, { value: REGISTRATION_FEE });
      
      expect(await registry.tokenURI(1)).to.equal(TEST_URI);
    });

    it("Should reject registration with insufficient fee", async function () {
      await expect(
        registry.connect(agent1).register(TEST_URI, {
          value: REGISTRATION_FEE - 1n
        })
      ).to.be.revertedWithCustomError(registry, "InsufficientFee");
    });

    it("Should allow registration with excess fee", async function () {
      const excessFee = REGISTRATION_FEE + ethers.parseEther("0.5");
      
      await expect(
        registry.connect(agent1).register(TEST_URI, { value: excessFee })
      ).to.not.be.reverted;
    });
  });

  describe("Agent Registration - With Metadata", function () {
    it("Should register agent with initial metadata", async function () {
      const metadata = [
        { key: "name", value: ethers.toUtf8Bytes("TestAgent") },
        { key: "version", value: ethers.toUtf8Bytes("1.0.0") }
      ];
      
      const tx = await registry.connect(agent1)["register(string,(string,bytes)[])"](
        TEST_URI,
        metadata,
        { value: REGISTRATION_FEE }
      );
      
      await expect(tx)
        .to.emit(registry, "MetadataSet")
        .withArgs(1, "name", ethers.toUtf8Bytes("TestAgent"));
      
      const storedName = await registry.getMetadata(1, "name");
      expect(ethers.toUtf8String(storedName)).to.equal("TestAgent");
    });

    it("Should emit events for all metadata entries", async function () {
      const metadata = [
        { key: "skill1", value: ethers.toUtf8Bytes("solidity") },
        { key: "skill2", value: ethers.toUtf8Bytes("rust") },
        { key: "skill3", value: ethers.toUtf8Bytes("python") }
      ];
      
      const tx = await registry.connect(agent1)["register(string,(string,bytes)[])"](
        TEST_URI,
        metadata,
        { value: REGISTRATION_FEE }
      );
      
      await expect(tx).to.emit(registry, "MetadataSet");
      
      const skill1 = await registry.getMetadata(1, "skill1");
      expect(ethers.toUtf8String(skill1)).to.equal("solidity");
    });
  });

  describe("Metadata Management", function () {
    beforeEach(async function () {
      // Register an agent first
      await registry.connect(agent1).register(TEST_URI, { value: REGISTRATION_FEE });
    });

    it("Should allow owner to set metadata", async function () {
      const key = "description";
      const value = ethers.toUtf8Bytes("A helpful AI agent");
      
      await expect(
        registry.connect(agent1).setMetadata(1, key, value)
      ).to.emit(registry, "MetadataSet")
        .withArgs(1, key, value);
      
      const stored = await registry.getMetadata(1, key);
      expect(ethers.toUtf8String(stored)).to.equal("A helpful AI agent");
    });

    it("Should reject metadata update from non-owner", async function () {
      await expect(
        registry.connect(agent2).setMetadata(1, "key", ethers.toUtf8Bytes("value"))
      ).to.be.revertedWithCustomError(registry, "UnauthorizedAccess");
    });

    it("Should allow updating existing metadata", async function () {
      const key = "status";
      await registry.connect(agent1).setMetadata(1, key, ethers.toUtf8Bytes("active"));
      await registry.connect(agent1).setMetadata(1, key, ethers.toUtf8Bytes("inactive"));
      
      const stored = await registry.getMetadata(1, key);
      expect(ethers.toUtf8String(stored)).to.equal("inactive");
    });

    it("Should handle multiple metadata keys independently", async function () {
      await registry.connect(agent1).setMetadata(1, "key1", ethers.toUtf8Bytes("value1"));
      await registry.connect(agent1).setMetadata(1, "key2", ethers.toUtf8Bytes("value2"));
      
      expect(ethers.toUtf8String(await registry.getMetadata(1, "key1"))).to.equal("value1");
      expect(ethers.toUtf8String(await registry.getMetadata(1, "key2"))).to.equal("value2");
    });
  });

  describe("Agent Wallet Management", function () {
    beforeEach(async function () {
      await registry.connect(agent1).register(TEST_URI, { value: REGISTRATION_FEE });
    });

    it("Should update agent wallet with valid signature", async function () {
      const newWallet = agent2.address;
      const deadline = await time.latest() + 3600; // 1 hour from now
      
      // Create EIP-712 signature
      const domain = {
        name: "AgentIdentityRegistry",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await registry.getAddress()
      };
      
      const types = {
        SetAgentWallet: [
          { name: "agentId", type: "uint256" },
          { name: "newWallet", type: "address" },
          { name: "deadline", type: "uint256" }
        ]
      };
      
      const value = {
        agentId: 1,
        newWallet: newWallet,
        deadline: deadline
      };
      
      const signature = await agent1.signTypedData(domain, types, value);
      
      await expect(
        registry.setAgentWallet(1, newWallet, deadline, signature)
      ).to.emit(registry, "AgentWalletSet")
        .withArgs(1, newWallet);
      
      expect(await registry.getAgentWallet(1)).to.equal(newWallet);
    });

    it("Should reject expired signature", async function () {
      const newWallet = agent2.address;
      const deadline = await time.latest() - 1; // Already expired
      
      const domain = {
        name: "AgentIdentityRegistry",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await registry.getAddress()
      };
      
      const types = {
        SetAgentWallet: [
          { name: "agentId", type: "uint256" },
          { name: "newWallet", type: "address" },
          { name: "deadline", type: "uint256" }
        ]
      };
      
      const value = {
        agentId: 1,
        newWallet: newWallet,
        deadline: deadline
      };
      
      const signature = await agent1.signTypedData(domain, types, value);
      
      await expect(
        registry.setAgentWallet(1, newWallet, deadline, signature)
      ).to.be.revertedWithCustomError(registry, "ExpiredSignature");
    });

    it("Should reject signature from non-owner", async function () {
      const newWallet = agent2.address;
      const deadline = await time.latest() + 3600;
      
      const domain = {
        name: "AgentIdentityRegistry",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await registry.getAddress()
      };
      
      const types = {
        SetAgentWallet: [
          { name: "agentId", type: "uint256" },
          { name: "newWallet", type: "address" },
          { name: "deadline", type: "uint256" }
        ]
      };
      
      const value = {
        agentId: 1,
        newWallet: newWallet,
        deadline: deadline
      };
      
      // Sign with agent2 instead of agent1 (the owner)
      const signature = await agent2.signTypedData(domain, types, value);
      
      await expect(
        registry.setAgentWallet(1, newWallet, deadline, signature)
      ).to.be.revertedWithCustomError(registry, "InvalidSignature");
    });
  });

  describe("Agent URI Management", function () {
    beforeEach(async function () {
      await registry.connect(agent1).register(TEST_URI, { value: REGISTRATION_FEE });
    });

    it("Should allow owner to update URI", async function () {
      const newURI = "ipfs://QmNewUri456";
      
      await expect(
        registry.connect(agent1).setAgentURI(1, newURI)
      ).to.emit(registry, "AgentURIUpdated")
        .withArgs(1, newURI);
      
      expect(await registry.tokenURI(1)).to.equal(newURI);
    });

    it("Should reject URI update from non-owner", async function () {
      await expect(
        registry.connect(agent2).setAgentURI(1, "ipfs://QmHack")
      ).to.be.revertedWithCustomError(registry, "UnauthorizedAccess");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update registration fee", async function () {
      const newFee = ethers.parseEther("2");
      
      await expect(
        registry.connect(owner).setRegistrationFee(newFee)
      ).to.emit(registry, "RegistrationFeeUpdated")
        .withArgs(newFee);
      
      expect(await registry.registrationFee()).to.equal(newFee);
    });

    it("Should reject fee update from non-owner", async function () {
      await expect(
        registry.connect(agent1).setRegistrationFee(ethers.parseEther("2"))
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });

    it("Should allow owner to withdraw fees", async function () {
      // Register multiple agents
      await registry.connect(agent1).register(TEST_URI, { value: REGISTRATION_FEE });
      await registry.connect(agent2).register(TEST_URI, { value: REGISTRATION_FEE });
      
      const contractBalance = await ethers.provider.getBalance(await registry.getAddress());
      expect(contractBalance).to.equal(REGISTRATION_FEE * 2n);
      
      const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);
      
      const tx = await registry.connect(owner).withdraw();
      const receipt = await tx.wait();
      const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
      
      const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);
      
      expect(ownerBalanceAfter).to.equal(
        ownerBalanceBefore + contractBalance - gasUsed
      );
    });

    it("Should reject withdrawal from non-owner", async function () {
      await expect(
        registry.connect(agent1).withdraw()
      ).to.be.revertedWithCustomError(registry, "OwnableUnauthorizedAccount");
    });
  });

  describe("ERC-721 Compliance", function () {
    beforeEach(async function () {
      await registry.connect(agent1).register(TEST_URI, { value: REGISTRATION_FEE });
    });

    it("Should support NFT transfers", async function () {
      await registry.connect(agent1).transferFrom(agent1.address, agent2.address, 1);
      
      expect(await registry.ownerOf(1)).to.equal(agent2.address);
      expect(await registry.balanceOf(agent1.address)).to.equal(0);
      expect(await registry.balanceOf(agent2.address)).to.equal(1);
    });

    it("Should maintain agent wallet after transfer", async function () {
      const originalWallet = await registry.getAgentWallet(1);
      
      await registry.connect(agent1).transferFrom(agent1.address, agent2.address, 1);
      
      // Wallet should remain the same after NFT transfer
      expect(await registry.getAgentWallet(1)).to.equal(originalWallet);
    });

    it("Should allow new owner to update metadata after transfer", async function () {
      await registry.connect(agent1).transferFrom(agent1.address, agent2.address, 1);
      
      // agent2 is now the NFT owner
      await expect(
        registry.connect(agent2).setMetadata(1, "key", ethers.toUtf8Bytes("value"))
      ).to.not.be.reverted;
      
      // agent1 should no longer be able to update
      await expect(
        registry.connect(agent1).setMetadata(1, "key2", ethers.toUtf8Bytes("value2"))
      ).to.be.revertedWithCustomError(registry, "UnauthorizedAccess");
    });
  });

  describe("Edge Cases & Error Handling", function () {
    it("Should revert when querying non-existent agent", async function () {
      await expect(
        registry.tokenURI(999)
      ).to.be.revertedWithCustomError(registry, "InvalidAgentId");
    });

    it("Should handle empty metadata gracefully", async function () {
      await registry.connect(agent1).register(TEST_URI, { value: REGISTRATION_FEE });
      
      const emptyData = await registry.getMetadata(1, "nonexistent");
      expect(emptyData).to.equal("0x");
    });

    it("Should allow same user to register multiple agents", async function () {
      await registry.connect(agent1).register(TEST_URI, { value: REGISTRATION_FEE });
      await registry.connect(agent1).register("ipfs://QmOther", { value: REGISTRATION_FEE });
      
      expect(await registry.balanceOf(agent1.address)).to.equal(2);
      expect(await registry.ownerOf(1)).to.equal(agent1.address);
      expect(await registry.ownerOf(2)).to.equal(agent1.address);
    });
  });
});
