const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("BountyEscrow", function () {
  let identityRegistry, escrow, mockToken;
  let owner, bountyRegistry, disputeResolver, feeRecipient;
  let creator, hunter;

  beforeEach(async function () {
    [owner, bountyRegistry, disputeResolver, feeRecipient, creator, hunter] = 
      await ethers.getSigners();
    
    // Deploy mock ERC20
    const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    mockToken = await MockERC20.deploy("Test Token", "TEST");
    await mockToken.waitForDeployment();
    
    // Deploy Identity Registry
    const AgentIdentityRegistry = await ethers.getContractFactory("AgentIdentityRegistry");
    identityRegistry = await AgentIdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();
    
    // Deploy Escrow
    const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
    escrow = await BountyEscrow.deploy(await identityRegistry.getAddress());
    await escrow.waitForDeployment();
    
    // Initialize escrow
    await escrow.initialize(
      bountyRegistry.address,
      disputeResolver.address,
      feeRecipient.address,
      100 // 1% fee
    );
    
    // Register agents
    await identityRegistry.connect(creator).register("ipfs://creator");
    await identityRegistry.connect(hunter).register("ipfs://hunter");
    
    // Mint tokens
    await mockToken.mint(await escrow.getAddress(), ethers.parseEther("1000"));
  });

  describe("Initialization", function () {
    it("Should initialize with correct addresses", async function () {
      expect(await escrow.bountyRegistry()).to.equal(bountyRegistry.address);
      expect(await escrow.disputeResolver()).to.equal(disputeResolver.address);
      expect(await escrow.feeRecipient()).to.equal(feeRecipient.address);
      expect(await escrow.feeRate()).to.equal(100n);
    });

    it("Should prevent double initialization", async function () {
      await expect(
        escrow.initialize(
          bountyRegistry.address,
          disputeResolver.address,
          feeRecipient.address,
          100
        )
      ).to.be.revertedWith("Already initialized");
    });
  });

  describe("Deposit", function () {
    it("Should deposit funds", async function () {
      const bountyId = 1n;
      const amount = ethers.parseEther("100");
      
      await escrow.connect(bountyRegistry).deposit(
        bountyId,
        await mockToken.getAddress(),
        amount
      );
      
      const [token, lockedAmount] = await escrow.getEscrowBalance(bountyId);
      expect(token).to.equal(await mockToken.getAddress());
      expect(lockedAmount).to.equal(amount);
      expect(await escrow.isLocked(bountyId)).to.be.true;
    });

    it("Should only allow bounty registry to deposit", async function () {
      await expect(
        escrow.connect(creator).deposit(1n, await mockToken.getAddress(), 100n)
      ).to.be.revertedWith("Only BountyRegistry");
    });

    it("Should prevent duplicate deposits", async function () {
      const bountyId = 1n;
      const amount = ethers.parseEther("100");
      
      await escrow.connect(bountyRegistry).deposit(
        bountyId,
        await mockToken.getAddress(),
        amount
      );
      
      await expect(
        escrow.connect(bountyRegistry).deposit(
          bountyId,
          await mockToken.getAddress(),
          amount
        )
      ).to.be.revertedWith("Escrow already exists");
    });

    it("Should track total locked value", async function () {
      const amount = ethers.parseEther("100");
      
      await escrow.connect(bountyRegistry).deposit(1n, await mockToken.getAddress(), amount);
      await escrow.connect(bountyRegistry).deposit(2n, await mockToken.getAddress(), amount);
      
      const totalLocked = await escrow.getTotalLocked(await mockToken.getAddress());
      expect(totalLocked).to.equal(amount * 2n);
    });
  });

  describe("Hunter Assignment", function () {
    beforeEach(async function () {
      await escrow.connect(bountyRegistry).deposit(
        1n,
        await mockToken.getAddress(),
        ethers.parseEther("100")
      );
    });

    it("Should assign hunter", async function () {
      await escrow.connect(bountyRegistry).assignHunter(1n, 2n); // Hunter is agent #2
      
      const escrowInfo = await escrow.getEscrow(1n);
      expect(escrowInfo.hunterAgentId).to.equal(2n);
    });

    it("Should only allow bounty registry to assign", async function () {
      await expect(
        escrow.connect(creator).assignHunter(1n, 2n)
      ).to.be.revertedWith("Only BountyRegistry");
    });
  });

  describe("Release", function () {
    beforeEach(async function () {
      const amount = ethers.parseEther("100");
      await escrow.connect(bountyRegistry).deposit(
        1n,
        await mockToken.getAddress(),
        amount
      );
      await escrow.connect(bountyRegistry).assignHunter(1n, 2n);
    });

    it("Should release funds to hunter", async function () {
      const amount = ethers.parseEther("100");
      const fee = await escrow.calculateFee(amount);
      const hunterAmount = amount - fee;
      
      const hunterBalanceBefore = await mockToken.balanceOf(hunter.address);
      const feeBalanceBefore = await mockToken.balanceOf(feeRecipient.address);
      
      await escrow.connect(bountyRegistry).release(1n);
      
      const hunterBalanceAfter = await mockToken.balanceOf(hunter.address);
      const feeBalanceAfter = await mockToken.balanceOf(feeRecipient.address);
      
      expect(hunterBalanceAfter - hunterBalanceBefore).to.equal(hunterAmount);
      expect(feeBalanceAfter - feeBalanceBefore).to.equal(fee);
      expect(await escrow.isLocked(1n)).to.be.false;
    });

    it("Should require hunter assignment", async function () {
      await escrow.connect(bountyRegistry).deposit(
        2n,
        await mockToken.getAddress(),
        ethers.parseEther("100")
      );
      
      await expect(
        escrow.connect(bountyRegistry).release(2n)
      ).to.be.revertedWith("No hunter assigned");
    });

    it("Should only allow bounty registry to release", async function () {
      await expect(
        escrow.connect(creator).release(1n)
      ).to.be.revertedWith("Only BountyRegistry");
    });
  });

  describe("Refund", function () {
    beforeEach(async function () {
      await escrow.connect(bountyRegistry).deposit(
        1n,
        await mockToken.getAddress(),
        ethers.parseEther("100")
      );
    });

    it("Should refund to depositor", async function () {
      const amount = ethers.parseEther("100");
      const creatorBalanceBefore = await mockToken.balanceOf(creator.address);
      
      await escrow.connect(bountyRegistry).refund(1n);
      
      const creatorBalanceAfter = await mockToken.balanceOf(creator.address);
      expect(creatorBalanceAfter - creatorBalanceBefore).to.equal(amount);
      expect(await escrow.isLocked(1n)).to.be.false;
    });

    it("Should only allow bounty registry to refund", async function () {
      await expect(
        escrow.connect(creator).refund(1n)
      ).to.be.revertedWith("Only BountyRegistry");
    });
  });

  describe("Disputes", function () {
    beforeEach(async function () {
      await escrow.connect(bountyRegistry).deposit(
        1n,
        await mockToken.getAddress(),
        ethers.parseEther("100")
      );
      await escrow.connect(bountyRegistry).assignHunter(1n, 2n);
    });

    it("Should mark escrow as disputed", async function () {
      await escrow.connect(bountyRegistry).dispute(1n);
      
      expect(await escrow.isDisputed(1n)).to.be.true;
      expect(await escrow.isLocked(1n)).to.be.true; // Still locked
    });

    it("Should resolve dispute in favor of hunter", async function () {
      await escrow.connect(bountyRegistry).dispute(1n);
      
      const hunterBalanceBefore = await mockToken.balanceOf(hunter.address);
      await escrow.connect(disputeResolver).resolveDispute(1n, true);
      const hunterBalanceAfter = await mockToken.balanceOf(hunter.address);
      
      expect(hunterBalanceAfter).to.be.gt(hunterBalanceBefore);
      expect(await escrow.isLocked(1n)).to.be.false;
    });

    it("Should resolve dispute in favor of creator", async function () {
      await escrow.connect(bountyRegistry).dispute(1n);
      
      const creatorBalanceBefore = await mockToken.balanceOf(creator.address);
      await escrow.connect(disputeResolver).resolveDispute(1n, false);
      const creatorBalanceAfter = await mockToken.balanceOf(creator.address);
      
      expect(creatorBalanceAfter).to.be.gt(creatorBalanceBefore);
      expect(await escrow.isLocked(1n)).to.be.false;
    });

    it("Should only allow dispute resolver to resolve", async function () {
      await escrow.connect(bountyRegistry).dispute(1n);
      
      await expect(
        escrow.connect(creator).resolveDispute(1n, true)
      ).to.be.revertedWith("Only DisputeResolver");
    });
  });

  describe("View Functions", function () {
    it("Should calculate fee correctly", async function () {
      const amount = ethers.parseEther("100");
      const fee = await escrow.calculateFee(amount);
      expect(fee).to.equal(ethers.parseEther("1")); // 1%
    });

    it("Should get escrow status", async function () {
      await escrow.connect(bountyRegistry).deposit(
        1n,
        await mockToken.getAddress(),
        ethers.parseEther("100")
      );
      
      const status = await escrow.getStatus(1n);
      expect(status).to.equal(1); // EscrowStatus.Locked
    });
  });

  describe("Events", function () {
    it("Should emit Deposited event", async function () {
      const amount = ethers.parseEther("100");
      
      await expect(
        escrow.connect(bountyRegistry).deposit(1n, await mockToken.getAddress(), amount)
      ).to.emit(escrow, "Deposited")
        .withArgs(1n, await mockToken.getAddress(), amount, bountyRegistry.address);
    });

    it("Should emit Released event", async function () {
      const amount = ethers.parseEther("100");
      await escrow.connect(bountyRegistry).deposit(1n, await mockToken.getAddress(), amount);
      await escrow.connect(bountyRegistry).assignHunter(1n, 2n);
      
      await expect(
        escrow.connect(bountyRegistry).release(1n)
      ).to.emit(escrow, "Released");
    });

    it("Should emit Refunded event", async function () {
      await escrow.connect(bountyRegistry).deposit(
        1n,
        await mockToken.getAddress(),
        ethers.parseEther("100")
      );
      
      await expect(
        escrow.connect(bountyRegistry).refund(1n)
      ).to.emit(escrow, "Refunded");
    });

    it("Should emit Disputed event", async function () {
      await escrow.connect(bountyRegistry).deposit(
        1n,
        await mockToken.getAddress(),
        ethers.parseEther("100")
      );
      
      await expect(
        escrow.connect(bountyRegistry).dispute(1n)
      ).to.emit(escrow, "Disputed")
        .withArgs(1n);
    });
  });
});
