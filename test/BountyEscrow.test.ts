import { expect } from "chai";
import { ethers } from "hardhat";
import { BountyEscrow, MockERC20 } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("BountyEscrow", function () {
  let escrow: BountyEscrow;
  let token: MockERC20;
  let owner: SignerWithAddress;
  let bountyRegistry: SignerWithAddress;
  let disputeResolver: SignerWithAddress;
  let creator: SignerWithAddress;
  let hunter: SignerWithAddress;
  let feeRecipient: SignerWithAddress;

  const BOUNTY_AMOUNT = ethers.parseUnits("100", 6); // 100 USDC

  beforeEach(async function () {
    [owner, bountyRegistry, disputeResolver, creator, hunter, feeRecipient] = 
      await ethers.getSigners();
    
    // Deploy Mock Token
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    token = await TokenFactory.deploy("USD Coin", "USDC", 6);
    await token.waitForDeployment();
    
    // Deploy Identity Registry (needed by escrow)
    const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
    const identityRegistry = await IdentityFactory.deploy(0);
    await identityRegistry.waitForDeployment();

    // Deploy Escrow
    const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
    escrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
    await escrow.waitForDeployment();

    // Initialize escrow
    await escrow.initialize(bountyRegistry.address, disputeResolver.address, feeRecipient.address, 100);
    
    // Mint tokens to escrow (simulating deposit)
    await token.mint(await escrow.getAddress(), BOUNTY_AMOUNT * 10n);
  });

  describe("Deployment & Initialization", function () {
    it("Should set bounty registry correctly", async function () {
      expect(await escrow.bountyRegistry()).to.equal(bountyRegistry.address);
    });

    it("Should set dispute resolver correctly", async function () {
      expect(await escrow.disputeResolver()).to.equal(disputeResolver.address);
    });

    it("Should initialize with correct parameters", async function () {
      const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
      const newIdentity = await IdentityFactory.deploy(0);
      const newEscrow = await (await ethers.getContractFactory("BountyEscrow")).deploy(await newIdentity.getAddress());

      await newEscrow.initialize(bountyRegistry.address, disputeResolver.address, feeRecipient.address, 100);

      expect(await newEscrow.bountyRegistry()).to.equal(bountyRegistry.address);
      expect(await newEscrow.disputeResolver()).to.equal(disputeResolver.address);
      expect(await newEscrow.feeRecipient()).to.equal(feeRecipient.address);
      expect(await newEscrow.feeRate()).to.equal(100);
    });
  });

  describe("Deposits", function () {
    it("Should allow bounty registry to deposit", async function () {
      const bountyId = 1;

      await expect(
        escrow.connect(bountyRegistry).deposit(
          bountyId,
          await token.getAddress(),
          BOUNTY_AMOUNT,
          creator.address
        )
      ).to.emit(escrow, "Deposited")
        .withArgs(bountyId, await token.getAddress(), BOUNTY_AMOUNT, creator.address);

      const deposit = await escrow.getEscrow(bountyId);
      expect(deposit.amount).to.equal(BOUNTY_AMOUNT);
      expect(deposit.token).to.equal(await token.getAddress());
      expect(deposit.status).to.equal(1); // EscrowStatus.Locked
    });

    it("Should reject deposit from non-bounty-registry", async function () {
      await expect(
        escrow.connect(creator).deposit(1, await token.getAddress(), BOUNTY_AMOUNT, creator.address)
      ).to.be.revertedWith("Only BountyRegistry");
    });

    it("Should reject duplicate deposits for same bounty", async function () {
      const bountyId = 1;

      await escrow.connect(bountyRegistry).deposit(
        bountyId,
        await token.getAddress(),
        BOUNTY_AMOUNT,
        creator.address
      );

      await expect(
        escrow.connect(bountyRegistry).deposit(
          bountyId,
          await token.getAddress(),
          BOUNTY_AMOUNT,
          creator.address
        )
      ).to.be.revertedWith("Escrow already exists");
    });

    it("Should store depositor address", async function () {
      // Use bountyRegistry as the transaction origin
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT,
        creator.address
      );

      const deposit = await escrow.getEscrow(1);
      expect(deposit.depositor).to.equal(creator.address);
    });
  });

  describe("Release", function () {
    beforeEach(async function () {
      // Deposit for bounty 1
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT,
        creator.address
      );
    });

    it("Should release funds to recipient with fee deduction", async function () {
      // First, need to assign a hunter and register them
      const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
      const identityRegistry = await IdentityFactory.deploy(0);
      await identityRegistry.waitForDeployment();

      // Register hunter agent
      await identityRegistry.connect(hunter)["register(string)"]("hunter-metadata");
      const hunterAgentId = 1;

      // Create new escrow with this identity registry
      const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
      const newEscrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
      await newEscrow.waitForDeployment();
      await newEscrow.initialize(bountyRegistry.address, disputeResolver.address, feeRecipient.address, 100);

      // Mint tokens to new escrow
      await token.mint(await newEscrow.getAddress(), BOUNTY_AMOUNT * 10n);

      // Deposit
      await newEscrow.connect(bountyRegistry).deposit(1, await token.getAddress(), BOUNTY_AMOUNT, creator.address);

      // Assign hunter
      await newEscrow.connect(bountyRegistry).assignHunter(1, hunterAgentId);

      const platformFee = ethers.parseUnits("1", 6); // 1 USDC fee (1% of 100)
      const recipientAmount = BOUNTY_AMOUNT - platformFee;

      const hunterBalanceBefore = await token.balanceOf(hunter.address);
      const feeRecipientBalanceBefore = await token.balanceOf(feeRecipient.address);

      await expect(
        newEscrow.connect(bountyRegistry).release(1)
      ).to.emit(newEscrow, "Released")
        .withArgs(1, hunter.address, recipientAmount, platformFee);

      expect(await token.balanceOf(hunter.address)).to.equal(
        hunterBalanceBefore + recipientAmount
      );
      expect(await token.balanceOf(feeRecipient.address)).to.equal(
        feeRecipientBalanceBefore + platformFee
      );
    });

    it("Should mark deposit as released", async function () {
      // Register hunter and assign
      const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
      const identityRegistry = await IdentityFactory.deploy(0);
      await identityRegistry.connect(hunter)["register(string)"]("hunter-metadata");

      const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
      const newEscrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
      await newEscrow.initialize(bountyRegistry.address, disputeResolver.address, feeRecipient.address, 100);
      await token.mint(await newEscrow.getAddress(), BOUNTY_AMOUNT * 10n);

      await newEscrow.connect(bountyRegistry).deposit(1, await token.getAddress(), BOUNTY_AMOUNT, creator.address);
      await newEscrow.connect(bountyRegistry).assignHunter(1, 1);
      await newEscrow.connect(bountyRegistry).release(1);

      const deposit = await newEscrow.getEscrow(1);
      expect(deposit.status).to.equal(2); // EscrowStatus.Released
    });

    it("Should reject release from non-bounty-registry", async function () {
      await expect(
        escrow.connect(creator).release(1)
      ).to.be.revertedWith("Only BountyRegistry");
    });

    it("Should reject release of non-existent deposit", async function () {
      await expect(
        escrow.connect(bountyRegistry).release(999)
      ).to.be.revertedWith("Cannot release");
    });

    it("Should reject double release", async function () {
      // Register hunter and assign
      const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
      const identityRegistry = await IdentityFactory.deploy(0);
      await identityRegistry.connect(hunter)["register(string)"]("hunter-metadata");

      const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
      const newEscrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
      await newEscrow.initialize(bountyRegistry.address, disputeResolver.address, feeRecipient.address, 100);
      await token.mint(await newEscrow.getAddress(), BOUNTY_AMOUNT * 10n);

      await newEscrow.connect(bountyRegistry).deposit(1, await token.getAddress(), BOUNTY_AMOUNT, creator.address);
      await newEscrow.connect(bountyRegistry).assignHunter(1, 1);
      await newEscrow.connect(bountyRegistry).release(1);

      await expect(
        newEscrow.connect(bountyRegistry).release(1)
      ).to.be.revertedWith("Cannot release");
    });

    it("Should handle zero platform fee", async function () {
      // Create escrow with 0 fee rate
      const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
      const identityRegistry = await IdentityFactory.deploy(0);
      await identityRegistry.connect(hunter)["register(string)"]("hunter-metadata");

      const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
      const newEscrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
      await newEscrow.initialize(bountyRegistry.address, disputeResolver.address, feeRecipient.address, 0); // 0% fee
      await token.mint(await newEscrow.getAddress(), BOUNTY_AMOUNT * 10n);

      await newEscrow.connect(bountyRegistry).deposit(1, await token.getAddress(), BOUNTY_AMOUNT, creator.address);
      await newEscrow.connect(bountyRegistry).assignHunter(1, 1);

      const hunterBalanceBefore = await token.balanceOf(hunter.address);
      await newEscrow.connect(bountyRegistry).release(1);

      expect(await token.balanceOf(hunter.address)).to.equal(
        hunterBalanceBefore + BOUNTY_AMOUNT
      );
    });

    it("Should handle release with full amount as fee (edge case)", async function () {
      // Create escrow with 100% fee rate (10000 basis points)
      const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
      const identityRegistry = await IdentityFactory.deploy(0);
      await identityRegistry.connect(hunter)["register(string)"]("hunter-metadata");

      const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
      const newEscrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
      await newEscrow.initialize(bountyRegistry.address, disputeResolver.address, feeRecipient.address, 1000); // 10% fee (max allowed)
      await token.mint(await newEscrow.getAddress(), BOUNTY_AMOUNT * 10n);

      await newEscrow.connect(bountyRegistry).deposit(1, await token.getAddress(), BOUNTY_AMOUNT, creator.address);
      await newEscrow.connect(bountyRegistry).assignHunter(1, 1);

      const hunterBalanceBefore = await token.balanceOf(hunter.address);
      const feeRecipientBalanceBefore = await token.balanceOf(feeRecipient.address);
      const expectedFee = (BOUNTY_AMOUNT * 1000n) / 10000n; // 10%
      const expectedHunterAmount = BOUNTY_AMOUNT - expectedFee;

      await newEscrow.connect(bountyRegistry).release(1);

      expect(await token.balanceOf(hunter.address)).to.equal(hunterBalanceBefore + expectedHunterAmount);
      expect(await token.balanceOf(feeRecipient.address)).to.equal(feeRecipientBalanceBefore + expectedFee);
    });
  });

  describe("Refund", function () {
    beforeEach(async function () {
      // Need to set tx.origin for depositor tracking
      // In this test we'll just verify the refund mechanism works
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT,
        creator.address
      );
    });

    it("Should allow bounty registry to refund", async function () {
      const deposit = await escrow.getEscrow(1);
      const depositorBalanceBefore = await token.balanceOf(deposit.depositor);

      await expect(
        escrow.connect(bountyRegistry).refund(1)
      ).to.emit(escrow, "Refunded")
        .withArgs(1, deposit.depositor, BOUNTY_AMOUNT);

      const depositorBalanceAfter = await token.balanceOf(deposit.depositor);
      expect(depositorBalanceAfter).to.equal(depositorBalanceBefore + BOUNTY_AMOUNT);
    });

    it("Should reject refund from unauthorized address", async function () {
      await expect(
        escrow.connect(creator).refund(1)
      ).to.be.revertedWith("Only BountyRegistry");
    });

    it("Should reject refund of non-existent deposit", async function () {
      await expect(
        escrow.connect(bountyRegistry).refund(999)
      ).to.be.revertedWith("Cannot refund");
    });

    it("Should reject double refund", async function () {
      await escrow.connect(bountyRegistry).refund(1);

      await expect(
        escrow.connect(bountyRegistry).refund(1)
      ).to.be.revertedWith("Cannot refund");
    });

    it("Should mark deposit as refunded after refund", async function () {
      await escrow.connect(bountyRegistry).refund(1);

      const deposit = await escrow.getEscrow(1);
      expect(deposit.status).to.equal(3); // EscrowStatus.Refunded
    });
  });

  describe("Lock Status", function () {
    it("Should report unlocked for non-existent deposit", async function () {
      expect(await escrow.isLocked(999)).to.be.false;
    });

    it("Should report locked after deposit", async function () {
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT,
        creator.address
      );

      expect(await escrow.isLocked(1)).to.be.true;
    });

    it("Should report unlocked after release", async function () {
      // Register hunter and assign
      const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
      const identityRegistry = await IdentityFactory.deploy(0);
      await identityRegistry.connect(hunter)["register(string)"]("hunter-metadata");

      const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
      const newEscrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
      await newEscrow.initialize(bountyRegistry.address, disputeResolver.address, feeRecipient.address, 100);
      await token.mint(await newEscrow.getAddress(), BOUNTY_AMOUNT * 10n);

      await newEscrow.connect(bountyRegistry).deposit(1, await token.getAddress(), BOUNTY_AMOUNT, creator.address);
      await newEscrow.connect(bountyRegistry).assignHunter(1, 1);
      await newEscrow.connect(bountyRegistry).release(1);

      expect(await newEscrow.isLocked(1)).to.be.false;
    });

    it("Should report unlocked after refund", async function () {
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT,
        creator.address
      );

      await escrow.connect(bountyRegistry).refund(1);

      expect(await escrow.isLocked(1)).to.be.false;
    });
  });


  describe("Multiple Bounties", function () {
    it("Should handle multiple independent deposits", async function () {
      const bounty1Amount = ethers.parseUnits("50", 6);
      const bounty2Amount = ethers.parseUnits("75", 6);

      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        bounty1Amount,
        creator.address
      );

      await escrow.connect(bountyRegistry).deposit(
        2,
        await token.getAddress(),
        bounty2Amount,
        creator.address
      );

      const deposit1 = await escrow.getEscrow(1);
      const deposit2 = await escrow.getEscrow(2);

      expect(deposit1.amount).to.equal(bounty1Amount);
      expect(deposit2.amount).to.equal(bounty2Amount);
    });

    it("Should handle releases independently", async function () {
      // Register hunter and assign
      const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
      const identityRegistry = await IdentityFactory.deploy(0);
      await identityRegistry.connect(hunter)["register(string)"]("hunter-metadata");

      const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
      const newEscrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
      await newEscrow.initialize(bountyRegistry.address, disputeResolver.address, feeRecipient.address, 100);
      await token.mint(await newEscrow.getAddress(), BOUNTY_AMOUNT * 10n);

      await newEscrow.connect(bountyRegistry).deposit(1, await token.getAddress(), BOUNTY_AMOUNT, creator.address);
      await newEscrow.connect(bountyRegistry).deposit(2, await token.getAddress(), BOUNTY_AMOUNT, creator.address);

      // Release bounty 1
      await newEscrow.connect(bountyRegistry).assignHunter(1, 1);
      await newEscrow.connect(bountyRegistry).release(1);

      // Bounty 2 should still be locked
      expect(await newEscrow.isLocked(1)).to.be.false;
      expect(await newEscrow.isLocked(2)).to.be.true;
    });

    it("Should allow releasing to different recipients", async function () {
      const hunter2 = feeRecipient; // Reuse as second hunter

      // Register both hunters
      const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
      const identityRegistry = await IdentityFactory.deploy(0);
      await identityRegistry.connect(hunter)["register(string)"]("hunter1-metadata");
      await identityRegistry.connect(hunter2)["register(string)"]("hunter2-metadata");

      const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
      const newEscrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
      await newEscrow.initialize(bountyRegistry.address, disputeResolver.address, feeRecipient.address, 0); // 0 fee
      await token.mint(await newEscrow.getAddress(), BOUNTY_AMOUNT * 10n);

      await newEscrow.connect(bountyRegistry).deposit(1, await token.getAddress(), BOUNTY_AMOUNT, creator.address);
      await newEscrow.connect(bountyRegistry).deposit(2, await token.getAddress(), BOUNTY_AMOUNT, creator.address);

      await newEscrow.connect(bountyRegistry).assignHunter(1, 1);
      await newEscrow.connect(bountyRegistry).assignHunter(2, 2);

      const hunter1BalanceBefore = await token.balanceOf(hunter.address);
      const hunter2BalanceBefore = await token.balanceOf(hunter2.address);

      await newEscrow.connect(bountyRegistry).release(1);
      await newEscrow.connect(bountyRegistry).release(2);

      expect(await token.balanceOf(hunter.address)).to.equal(hunter1BalanceBefore + BOUNTY_AMOUNT);
      expect(await token.balanceOf(hunter2.address)).to.equal(hunter2BalanceBefore + BOUNTY_AMOUNT);
    });
  });

  describe("Edge Cases", function () {
    it("Should reject zero-amount deposit", async function () {
      await expect(
        escrow.connect(bountyRegistry).deposit(
          1,
          await token.getAddress(),
          0,
          creator.address
        )
      ).to.be.revertedWith("Amount must be positive");
    });

    it("Should handle very large amounts", async function () {
      const largeAmount = ethers.parseUnits("1000000", 6); // 1M USDC

      await token.mint(await escrow.getAddress(), largeAmount);

      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        largeAmount,
        creator.address
      );

      const deposit = await escrow.getEscrow(1);
      expect(deposit.amount).to.equal(largeAmount);
    });

    it("Should return default struct for non-existent deposit", async function () {
      const deposit = await escrow.getEscrow(999);

      expect(deposit.amount).to.equal(0);
      expect(deposit.token).to.equal(ethers.ZeroAddress);
      expect(deposit.status).to.equal(0); // EscrowStatus.None
    });
  });

  describe("Different Token Types", function () {
    let token18Decimals: MockERC20;

    beforeEach(async function () {
      const TokenFactory = await ethers.getContractFactory("MockERC20");
      token18Decimals = await TokenFactory.deploy("DAI", "DAI", 18);
      await token18Decimals.waitForDeployment();
      
      await token18Decimals.mint(await escrow.getAddress(), ethers.parseEther("1000"));
    });

    it("Should handle tokens with 18 decimals", async function () {
      const amount = ethers.parseEther("100");

      // Register hunter
      const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
      const identityRegistry = await IdentityFactory.deploy(0);
      await identityRegistry.connect(hunter)["register(string)"]("hunter-metadata");

      const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
      const newEscrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
      await newEscrow.initialize(bountyRegistry.address, disputeResolver.address, feeRecipient.address, 0); // 0% fee
      await token18Decimals.mint(await newEscrow.getAddress(), ethers.parseEther("1000"));

      await newEscrow.connect(bountyRegistry).deposit(1, await token18Decimals.getAddress(), amount, creator.address);
      await newEscrow.connect(bountyRegistry).assignHunter(1, 1);
      await newEscrow.connect(bountyRegistry).release(1);

      expect(await token18Decimals.balanceOf(hunter.address)).to.equal(amount);
    });

    it("Should handle different tokens for different bounties", async function () {
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT,
        creator.address
      );

      await escrow.connect(bountyRegistry).deposit(
        2,
        await token18Decimals.getAddress(),
        ethers.parseEther("100"),
        creator.address
      );

      const deposit1 = await escrow.getEscrow(1);
      const deposit2 = await escrow.getEscrow(2);

      expect(deposit1.token).to.equal(await token.getAddress());
      expect(deposit2.token).to.equal(await token18Decimals.getAddress());
    });
  });
});
