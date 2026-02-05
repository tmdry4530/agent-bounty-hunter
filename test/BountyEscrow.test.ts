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
    
    // Deploy Escrow
    const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
    escrow = await EscrowFactory.deploy();
    await escrow.waitForDeployment();
    
    // Initialize escrow
    await escrow.initialize(bountyRegistry.address, disputeResolver.address);
    
    // Mint tokens to escrow (simulating deposit)
    await token.mint(await escrow.getAddress(), BOUNTY_AMOUNT * 10n);
  });

  describe("Deployment & Initialization", function () {
    it("Should set the correct owner", async function () {
      expect(await escrow.owner()).to.equal(owner.address);
    });

    it("Should set bounty registry correctly", async function () {
      expect(await escrow.bountyRegistry()).to.equal(bountyRegistry.address);
    });

    it("Should set dispute resolver correctly", async function () {
      expect(await escrow.disputeResolver()).to.equal(disputeResolver.address);
    });

    it("Should emit DisputeResolverSet on initialization", async function () {
      const newEscrow = await (await ethers.getContractFactory("BountyEscrow")).deploy();
      
      await expect(
        newEscrow.initialize(bountyRegistry.address, disputeResolver.address)
      ).to.emit(newEscrow, "DisputeResolverSet")
        .withArgs(disputeResolver.address);
    });
  });

  describe("Deposits", function () {
    it("Should allow bounty registry to deposit", async function () {
      const bountyId = 1;
      
      await expect(
        escrow.connect(bountyRegistry).deposit(
          bountyId,
          await token.getAddress(),
          BOUNTY_AMOUNT
        )
      ).to.emit(escrow, "Deposited")
        .withArgs(bountyId, await token.getAddress(), BOUNTY_AMOUNT);
      
      const deposit = await escrow.getDeposit(bountyId);
      expect(deposit.amount).to.equal(BOUNTY_AMOUNT);
      expect(deposit.token).to.equal(await token.getAddress());
      expect(deposit.bountyId).to.equal(bountyId);
      expect(deposit.released).to.be.false;
    });

    it("Should reject deposit from non-bounty-registry", async function () {
      await expect(
        escrow.connect(creator).deposit(1, await token.getAddress(), BOUNTY_AMOUNT)
      ).to.be.revertedWithCustomError(escrow, "UnauthorizedCaller");
    });

    it("Should reject duplicate deposits for same bounty", async function () {
      const bountyId = 1;
      
      await escrow.connect(bountyRegistry).deposit(
        bountyId,
        await token.getAddress(),
        BOUNTY_AMOUNT
      );
      
      await expect(
        escrow.connect(bountyRegistry).deposit(
          bountyId,
          await token.getAddress(),
          BOUNTY_AMOUNT
        )
      ).to.be.revertedWithCustomError(escrow, "AlreadyDeposited");
    });

    it("Should store depositor address", async function () {
      // Use bountyRegistry as the transaction origin
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT
      );
      
      const deposit = await escrow.getDeposit(1);
      // In tests, tx.origin is the same as msg.sender
      expect(deposit.depositor).to.not.equal(ethers.ZeroAddress);
    });
  });

  describe("Release", function () {
    beforeEach(async function () {
      // Deposit for bounty 1
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT
      );
    });

    it("Should release funds to recipient with fee deduction", async function () {
      const platformFee = ethers.parseUnits("1", 6); // 1 USDC fee
      const recipientAmount = BOUNTY_AMOUNT - platformFee;
      
      const hunterBalanceBefore = await token.balanceOf(hunter.address);
      const feeRecipientBalanceBefore = await token.balanceOf(feeRecipient.address);
      
      await expect(
        escrow.connect(bountyRegistry).release(
          1,
          hunter.address,
          platformFee,
          feeRecipient.address
        )
      ).to.emit(escrow, "Released")
        .withArgs(1, hunter.address, recipientAmount);
      
      expect(await token.balanceOf(hunter.address)).to.equal(
        hunterBalanceBefore + recipientAmount
      );
      expect(await token.balanceOf(feeRecipient.address)).to.equal(
        feeRecipientBalanceBefore + platformFee
      );
    });

    it("Should mark deposit as released", async function () {
      await escrow.connect(bountyRegistry).release(
        1,
        hunter.address,
        0,
        feeRecipient.address
      );
      
      const deposit = await escrow.getDeposit(1);
      expect(deposit.released).to.be.true;
    });

    it("Should reject release from non-bounty-registry", async function () {
      await expect(
        escrow.connect(creator).release(1, hunter.address, 0, feeRecipient.address)
      ).to.be.revertedWithCustomError(escrow, "UnauthorizedCaller");
    });

    it("Should reject release of non-existent deposit", async function () {
      await expect(
        escrow.connect(bountyRegistry).release(999, hunter.address, 0, feeRecipient.address)
      ).to.be.revertedWithCustomError(escrow, "NoDeposit");
    });

    it("Should reject double release", async function () {
      await escrow.connect(bountyRegistry).release(
        1,
        hunter.address,
        0,
        feeRecipient.address
      );
      
      await expect(
        escrow.connect(bountyRegistry).release(
          1,
          hunter.address,
          0,
          feeRecipient.address
        )
      ).to.be.revertedWithCustomError(escrow, "AlreadyReleased");
    });

    it("Should handle zero platform fee", async function () {
      const hunterBalanceBefore = await token.balanceOf(hunter.address);
      
      await escrow.connect(bountyRegistry).release(
        1,
        hunter.address,
        0,
        feeRecipient.address
      );
      
      expect(await token.balanceOf(hunter.address)).to.equal(
        hunterBalanceBefore + BOUNTY_AMOUNT
      );
    });

    it("Should handle release with full amount as fee (edge case)", async function () {
      await escrow.connect(bountyRegistry).release(
        1,
        hunter.address,
        BOUNTY_AMOUNT,
        feeRecipient.address
      );
      
      expect(await token.balanceOf(hunter.address)).to.equal(0);
      expect(await token.balanceOf(feeRecipient.address)).to.equal(BOUNTY_AMOUNT);
    });
  });

  describe("Refund", function () {
    beforeEach(async function () {
      // Need to set tx.origin for depositor tracking
      // In this test we'll just verify the refund mechanism works
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT
      );
    });

    it("Should allow bounty registry to refund", async function () {
      const deposit = await escrow.getDeposit(1);
      const depositorBalanceBefore = await token.balanceOf(deposit.depositor);
      
      await expect(
        escrow.connect(bountyRegistry).refund(1)
      ).to.emit(escrow, "Refunded")
        .withArgs(1, deposit.depositor, BOUNTY_AMOUNT);
      
      const depositorBalanceAfter = await token.balanceOf(deposit.depositor);
      expect(depositorBalanceAfter).to.equal(depositorBalanceBefore + BOUNTY_AMOUNT);
    });

    it("Should allow dispute resolver to refund", async function () {
      await expect(
        escrow.connect(disputeResolver).refund(1)
      ).to.emit(escrow, "Refunded");
    });

    it("Should reject refund from unauthorized address", async function () {
      await expect(
        escrow.connect(creator).refund(1)
      ).to.be.revertedWithCustomError(escrow, "UnauthorizedCaller");
    });

    it("Should reject refund of non-existent deposit", async function () {
      await expect(
        escrow.connect(bountyRegistry).refund(999)
      ).to.be.revertedWithCustomError(escrow, "NoDeposit");
    });

    it("Should reject double refund", async function () {
      await escrow.connect(bountyRegistry).refund(1);
      
      await expect(
        escrow.connect(bountyRegistry).refund(1)
      ).to.be.revertedWithCustomError(escrow, "AlreadyReleased");
    });

    it("Should mark deposit as released after refund", async function () {
      await escrow.connect(bountyRegistry).refund(1);
      
      const deposit = await escrow.getDeposit(1);
      expect(deposit.released).to.be.true;
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
        BOUNTY_AMOUNT
      );
      
      expect(await escrow.isLocked(1)).to.be.true;
    });

    it("Should report unlocked after release", async function () {
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT
      );
      
      await escrow.connect(bountyRegistry).release(
        1,
        hunter.address,
        0,
        feeRecipient.address
      );
      
      expect(await escrow.isLocked(1)).to.be.false;
    });

    it("Should report unlocked after refund", async function () {
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT
      );
      
      await escrow.connect(bountyRegistry).refund(1);
      
      expect(await escrow.isLocked(1)).to.be.false;
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update dispute resolver", async function () {
      const newResolver = creator.address;
      
      await expect(
        escrow.connect(owner).setDisputeResolver(newResolver)
      ).to.emit(escrow, "DisputeResolverSet")
        .withArgs(newResolver);
      
      expect(await escrow.disputeResolver()).to.equal(newResolver);
    });

    it("Should reject dispute resolver update from non-owner", async function () {
      await expect(
        escrow.connect(creator).setDisputeResolver(creator.address)
      ).to.be.revertedWithCustomError(escrow, "OwnableUnauthorizedAccount");
    });
  });

  describe("Multiple Bounties", function () {
    it("Should handle multiple independent deposits", async function () {
      const bounty1Amount = ethers.parseUnits("50", 6);
      const bounty2Amount = ethers.parseUnits("75", 6);
      
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        bounty1Amount
      );
      
      await escrow.connect(bountyRegistry).deposit(
        2,
        await token.getAddress(),
        bounty2Amount
      );
      
      const deposit1 = await escrow.getDeposit(1);
      const deposit2 = await escrow.getDeposit(2);
      
      expect(deposit1.amount).to.equal(bounty1Amount);
      expect(deposit2.amount).to.equal(bounty2Amount);
      expect(deposit1.bountyId).to.equal(1);
      expect(deposit2.bountyId).to.equal(2);
    });

    it("Should handle releases independently", async function () {
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT
      );
      
      await escrow.connect(bountyRegistry).deposit(
        2,
        await token.getAddress(),
        BOUNTY_AMOUNT
      );
      
      // Release bounty 1
      await escrow.connect(bountyRegistry).release(
        1,
        hunter.address,
        0,
        feeRecipient.address
      );
      
      // Bounty 2 should still be locked
      expect(await escrow.isLocked(1)).to.be.false;
      expect(await escrow.isLocked(2)).to.be.true;
    });

    it("Should allow releasing to different recipients", async function () {
      const hunter2 = feeRecipient; // Reuse as second hunter
      
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT
      );
      
      await escrow.connect(bountyRegistry).deposit(
        2,
        await token.getAddress(),
        BOUNTY_AMOUNT
      );
      
      await escrow.connect(bountyRegistry).release(
        1,
        hunter.address,
        0,
        ethers.ZeroAddress
      );
      
      await escrow.connect(bountyRegistry).release(
        2,
        hunter2.address,
        0,
        ethers.ZeroAddress
      );
      
      expect(await token.balanceOf(hunter.address)).to.equal(BOUNTY_AMOUNT);
      expect(await token.balanceOf(hunter2.address)).to.equal(BOUNTY_AMOUNT);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero-amount deposit (edge case)", async function () {
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        0
      );
      
      const deposit = await escrow.getDeposit(1);
      expect(deposit.amount).to.equal(0);
    });

    it("Should handle very large amounts", async function () {
      const largeAmount = ethers.parseUnits("1000000", 6); // 1M USDC
      
      await token.mint(await escrow.getAddress(), largeAmount);
      
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        largeAmount
      );
      
      const deposit = await escrow.getDeposit(1);
      expect(deposit.amount).to.equal(largeAmount);
    });

    it("Should return default struct for non-existent deposit", async function () {
      const deposit = await escrow.getDeposit(999);
      
      expect(deposit.amount).to.equal(0);
      expect(deposit.token).to.equal(ethers.ZeroAddress);
      expect(deposit.released).to.be.false;
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
      
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token18Decimals.getAddress(),
        amount
      );
      
      await escrow.connect(bountyRegistry).release(
        1,
        hunter.address,
        0,
        feeRecipient.address
      );
      
      expect(await token18Decimals.balanceOf(hunter.address)).to.equal(amount);
    });

    it("Should handle different tokens for different bounties", async function () {
      await escrow.connect(bountyRegistry).deposit(
        1,
        await token.getAddress(),
        BOUNTY_AMOUNT
      );
      
      await escrow.connect(bountyRegistry).deposit(
        2,
        await token18Decimals.getAddress(),
        ethers.parseEther("100")
      );
      
      const deposit1 = await escrow.getDeposit(1);
      const deposit2 = await escrow.getDeposit(2);
      
      expect(deposit1.token).to.equal(await token.getAddress());
      expect(deposit2.token).to.equal(await token18Decimals.getAddress());
    });
  });
});
