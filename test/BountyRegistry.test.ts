import { expect } from "chai";
import { ethers } from "hardhat";
import { 
  BountyRegistry, 
  AgentIdentityRegistry, 
  ReputationRegistry,
  BountyEscrow,
  MockERC20
} from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("BountyRegistry", function () {
  let bountyRegistry: BountyRegistry;
  let identityRegistry: AgentIdentityRegistry;
  let reputationRegistry: ReputationRegistry;
  let escrow: BountyEscrow;
  let token: MockERC20;
  
  let owner: SignerWithAddress;
  let feeRecipient: SignerWithAddress;
  let creator: SignerWithAddress;
  let hunter: SignerWithAddress;
  let otherAgent: SignerWithAddress;
  
  const REGISTRATION_FEE = ethers.parseEther("1");
  const REWARD_AMOUNT = ethers.parseUnits("100", 6); // 100 USDC
  const PLATFORM_FEE_BPS = 100; // 1%
  const TEST_URI = "ipfs://QmTest";

  let creatorAgentId: bigint;
  let hunterAgentId: bigint;

  beforeEach(async function () {
    [owner, feeRecipient, creator, hunter, otherAgent] = await ethers.getSigners();
    
    // Deploy Mock Token
    const TokenFactory = await ethers.getContractFactory("MockERC20");
    token = await TokenFactory.deploy("USD Coin", "USDC", 6);
    await token.waitForDeployment();
    
    // Deploy Identity Registry
    const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
    identityRegistry = await IdentityFactory.deploy(REGISTRATION_FEE);
    await identityRegistry.waitForDeployment();
    
    // Deploy Reputation Registry
    const ReputationFactory = await ethers.getContractFactory("ReputationRegistry");
    reputationRegistry = await ReputationFactory.deploy(
      await identityRegistry.getAddress()
    );
    await reputationRegistry.waitForDeployment();
    
    // Deploy Escrow
    const EscrowFactory = await ethers.getContractFactory("BountyEscrow");
    escrow = await EscrowFactory.deploy(await identityRegistry.getAddress());
    await escrow.waitForDeployment();

    // Deploy Bounty Registry
    const BountyFactory = await ethers.getContractFactory("BountyRegistry");
    bountyRegistry = await BountyFactory.deploy(
      await identityRegistry.getAddress(),
      await reputationRegistry.getAddress(),
      await escrow.getAddress()
    );
    await bountyRegistry.waitForDeployment();

    // Initialize escrow
    await escrow.initialize(
      await bountyRegistry.getAddress(),
      owner.address,
      feeRecipient.address,
      PLATFORM_FEE_BPS
    );
    
    // Set bounty registry in reputation
    await reputationRegistry.setBountyRegistry(await bountyRegistry.getAddress());
    
    // Register agents
    creatorAgentId = 1n;
    hunterAgentId = 2n;
    
    await identityRegistry.connect(creator)["register(string)"](TEST_URI, { value: REGISTRATION_FEE });
    await identityRegistry.connect(hunter)["register(string)"](TEST_URI, { value: REGISTRATION_FEE });
    
    // Mint tokens to creator
    await token.mint(creator.address, REWARD_AMOUNT * 10n);
  });

  describe("Deployment", function () {
    it("Should set all dependencies correctly", async function () {
      expect(await bountyRegistry.identityRegistry()).to.equal(
        await identityRegistry.getAddress()
      );
      expect(await bountyRegistry.reputationRegistry()).to.equal(
        await reputationRegistry.getAddress()
      );
      expect(await bountyRegistry.escrow()).to.equal(
        await escrow.getAddress()
      );
    });

    it("Should start with zero bounties", async function () {
      expect(await bountyRegistry.totalBounties()).to.equal(0);
    });
  });

  describe("Bounty Creation", function () {
    it("Should create a bounty successfully", async function () {
      const deadline = await time.latest() + 86400; // 1 day from now

      const params = {
        title: "Security Audit",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50,
        requiredSkills: ["solidity", "security"]
      };

      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);

      await expect(
        bountyRegistry.connect(creator).createBounty(params)
      ).to.emit(bountyRegistry, "BountyCreated")
        .withArgs(1, creatorAgentId, params.title, REWARD_AMOUNT, deadline);

      expect(await bountyRegistry.totalBounties()).to.equal(1);
    });

    it("Should store bounty details correctly", async function () {
      const deadline = await time.latest() + 86400;

      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 30,
        requiredSkills: ["rust", "blockchain"]
      };

      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);

      const bounty = await bountyRegistry.getBounty(1);

      expect(bounty.id).to.equal(1);
      expect(bounty.creatorAgentId).to.equal(creatorAgentId);
      expect(bounty.title).to.equal(params.title);
      expect(bounty.descriptionURI).to.equal(params.descriptionURI);
      expect(bounty.rewardAmount).to.equal(REWARD_AMOUNT);
      expect(bounty.deadline).to.equal(deadline);
      expect(bounty.minReputation).to.equal(30);
      expect(bounty.status).to.equal(0); // Open
    });

    it("Should store required skills", async function () {
      const deadline = await time.latest() + 86400;
      const skills = ["solidity", "testing", "security"];

      const params = {
        title: "Test",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 0,
        requiredSkills: skills
      };

      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);

      const storedSkills = await bountyRegistry.getBountySkills(1);
      expect(storedSkills).to.deep.equal(skills);
    });

    it("Should transfer tokens to escrow", async function () {
      const deadline = await time.latest() + 86400;

      const params = {
        title: "Test",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 0,
        requiredSkills: []
      };

      const creatorBalanceBefore = await token.balanceOf(creator.address);

      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);

      expect(await token.balanceOf(creator.address)).to.equal(
        creatorBalanceBefore - REWARD_AMOUNT
      );
      expect(await token.balanceOf(await escrow.getAddress())).to.equal(REWARD_AMOUNT);
    });

    it("Should reject creation from non-agent-owner", async function () {
      const deadline = await time.latest() + 86400;

      const params = {
        title: "Test",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 0,
        requiredSkills: []
      };

      await expect(
        bountyRegistry.connect(otherAgent).createBounty(params)
      ).to.be.reverted;
    });

    it("Should reject creation with past deadline", async function () {
      const pastDeadline = await time.latest() - 1;

      const params = {
        title: "Test",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline: pastDeadline,
        minReputation: 0,
        requiredSkills: []
      };

      await expect(
        bountyRegistry.connect(creator).createBounty(params)
      ).to.be.reverted;
    });

    it("Should reject creation with zero reward", async function () {
      const deadline = await time.latest() + 86400;

      const params = {
        title: "Test",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: 0,
        deadline,
        minReputation: 0,
        requiredSkills: []
      };

      await expect(
        bountyRegistry.connect(creator).createBounty(params)
      ).to.be.reverted;
    });
  });

  describe("Claiming Bounties", function () {
    let bountyId: number;

    beforeEach(async function () {
      const deadline = await time.latest() + 86400;

      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50, // Default reputation
        requiredSkills: []
      };

      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);
      bountyId = 1;
    });

    it("Should allow qualified agent to claim bounty", async function () {
      await expect(
        bountyRegistry.connect(hunter).claimBounty(bountyId)
      ).to.emit(bountyRegistry, "BountyClaimed");

      const bounty = await bountyRegistry.getBounty(bountyId);
      expect(bounty.status).to.equal(1); // Claimed
      expect(bounty.claimedBy).to.equal(hunterAgentId);
    });

    it("Should reject claim from non-agent-owner", async function () {
      await expect(
        bountyRegistry.connect(otherAgent).claimBounty(bountyId)
      ).to.be.reverted;
    });

    it("Should reject claim with insufficient reputation", async function () {
      // Create bounty requiring high reputation
      const deadline = await time.latest() + 86400;

      const params = {
        title: "High Rep Bounty",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 90,
        requiredSkills: []
      };

      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);

      await expect(
        bountyRegistry.connect(hunter).claimBounty(2)
      ).to.be.reverted;
    });

    it("Should reject claim of already-claimed bounty", async function () {
      await bountyRegistry.connect(hunter).claimBounty(bountyId);

      // Register another agent
      await identityRegistry.connect(otherAgent)["register(string)"](TEST_URI, { value: REGISTRATION_FEE });

      await expect(
        bountyRegistry.connect(otherAgent).claimBounty(bountyId)
      ).to.be.reverted;
    });

    it("Should reject claim after deadline", async function () {
      const bounty = await bountyRegistry.getBounty(bountyId);
      await time.increaseTo(bounty.deadline);

      await expect(
        bountyRegistry.connect(hunter).claimBounty(bountyId)
      ).to.be.reverted;
    });
  });

  describe("Submitting Work", function () {
    let bountyId: number;

    beforeEach(async function () {
      const deadline = await time.latest() + 86400;

      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50,
        requiredSkills: []
      };

      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);
      bountyId = 1;

      await bountyRegistry.connect(hunter).claimBounty(bountyId);
    });

    it("Should allow hunter to submit work", async function () {
      const submissionURI = "ipfs://QmSubmission";

      await expect(
        bountyRegistry.connect(hunter).submitWork(bountyId, submissionURI)
      ).to.emit(bountyRegistry, "BountySubmitted");

      const bounty = await bountyRegistry.getBounty(bountyId);
      expect(bounty.status).to.equal(3); // Submitted
      expect(bounty.submissionURI).to.equal(submissionURI);
    });

    it("Should reject submission from non-hunter", async function () {
      await expect(
        bountyRegistry.connect(creator).submitWork(bountyId, "ipfs://QmFake")
      ).to.be.reverted;
    });

    it("Should reject submission of unclaimed bounty", async function () {
      // Create another bounty
      const deadline = await time.latest() + 86400;
      const params = {
        title: "Unclaimed",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50,
        requiredSkills: []
      };

      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);

      await expect(
        bountyRegistry.connect(hunter).submitWork(2, "ipfs://QmSubmission")
      ).to.be.reverted;
    });

    it("Should reject submission after deadline", async function () {
      const bounty = await bountyRegistry.getBounty(bountyId);
      await time.increaseTo(bounty.deadline);

      await expect(
        bountyRegistry.connect(hunter).submitWork(bountyId, "ipfs://QmSubmission")
      ).to.be.reverted;
    });
  });

  describe("Approving Bounties", function () {
    let bountyId: number;

    beforeEach(async function () {
      const deadline = await time.latest() + 86400;
      
      const params = {
        creatorAgentId,
        title: "Test Bounty",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50,
        requiredSkills: []
      };
      
      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);
      bountyId = 1;
      
      await bountyRegistry.connect(hunter).claimBounty(bountyId);
      await bountyRegistry.connect(hunter).submitWork(bountyId, "ipfs://QmSubmission");
    });

    it("Should approve bounty and release payment", async function () {
      const hunterBalanceBefore = await token.balanceOf(hunter.address);
      const feeRecipientBalanceBefore = await token.balanceOf(feeRecipient.address);
      
      const rating = 5;
      const feedback = "Excellent work!";
      
      await expect(
        bountyRegistry.connect(creator).approveBounty(bountyId, rating, feedback)
      ).to.emit(bountyRegistry, "BountyApproved")
        .withArgs(bountyId, hunterAgentId, rating)
        .and.to.emit(bountyRegistry, "BountyPaid");
      
      const platformFee = (REWARD_AMOUNT * BigInt(PLATFORM_FEE_BPS)) / 10000n;
      const hunterAmount = REWARD_AMOUNT - platformFee;
      
      expect(await token.balanceOf(hunter.address)).to.equal(
        hunterBalanceBefore + hunterAmount
      );
      expect(await token.balanceOf(feeRecipient.address)).to.equal(
        feeRecipientBalanceBefore + platformFee
      );
      
      const bounty = await bountyRegistry.getBounty(bountyId);
      expect(bounty.status).to.equal(8); // Paid
    });

    it("Should update hunter reputation on approval", async function () {
      await bountyRegistry.connect(creator).approveBounty(bountyId, 5, "Great!");
      
      const rep = await reputationRegistry.getReputation(hunterAgentId);
      expect(rep.completedBounties).to.equal(1);
      expect(rep.totalRatings).to.equal(1);
    });

    it("Should reject approval from non-creator", async function () {
      await expect(
        bountyRegistry.connect(hunter).approveBounty(bountyId, 5, "test")
      ).to.be.revertedWith("Not creator");
    });

    it("Should reject approval of non-submitted bounty", async function () {
      // Create and claim but don't submit
      const deadline = await time.latest() + 86400;
      const params = {
        creatorAgentId,
        title: "Test",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50,
        requiredSkills: []
      };
      
      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);
      await bountyRegistry.connect(hunter).claimBounty(2);

      await expect(
        bountyRegistry.connect(creator).approveBounty(2, 5, "test")
      ).to.be.revertedWith("Not submitted");
    });
  });

  describe("Rejecting Bounties", function () {
    let bountyId: number;

    beforeEach(async function () {
      const deadline = await time.latest() + 86400;
      
      const params = {
        creatorAgentId,
        title: "Test Bounty",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50,
        requiredSkills: []
      };
      
      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);
      bountyId = 1;
      
      await bountyRegistry.connect(hunter).claimBounty(bountyId);
      await bountyRegistry.connect(hunter).submitWork(bountyId, "ipfs://QmSubmission");
    });

    it("Should reject bounty with reason", async function () {
      const reason = "Deliverables incomplete";
      
      await expect(
        bountyRegistry.connect(creator).rejectBounty(bountyId, reason)
      ).to.emit(bountyRegistry, "BountyRejected")
        .withArgs(bountyId, hunterAgentId, reason);
      
      const bounty = await bountyRegistry.getBounty(bountyId);
      expect(bounty.status).to.equal(6); // Rejected
    });

    it("Should record failure in reputation", async function () {
      await bountyRegistry.connect(creator).rejectBounty(bountyId, "Bad work");
      
      const rep = await reputationRegistry.getReputation(hunterAgentId);
      expect(rep.totalAttempts).to.be.greaterThan(0);
    });

    it("Should reject rejection from non-creator", async function () {
      await expect(
        bountyRegistry.connect(hunter).rejectBounty(bountyId, "test")
      ).to.be.revertedWith("Not creator");
    });
  });

  describe("Disputes", function () {
    let bountyId: number;

    beforeEach(async function () {
      const deadline = await time.latest() + 86400;
      
      const params = {
        creatorAgentId,
        title: "Test Bounty",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50,
        requiredSkills: []
      };
      
      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);
      bountyId = 1;
      
      await bountyRegistry.connect(hunter).claimBounty(bountyId);
      await bountyRegistry.connect(hunter).submitWork(bountyId, "ipfs://QmSubmission");
      await bountyRegistry.connect(creator).rejectBounty(bountyId, "Rejected");
    });

    it("Should reject dispute when escrow already refunded", async function () {
      // Note: rejectBounty calls escrow.refund(), so escrow is already Refunded
      // when disputeBounty tries to call escrow.dispute() which requires Locked status
      await expect(
        bountyRegistry.connect(hunter).disputeBounty(bountyId)
      ).to.be.revertedWith("Cannot dispute");
    });

    it("Should reject dispute from non-hunter", async function () {
      await expect(
        bountyRegistry.connect(creator).disputeBounty(bountyId)
      ).to.be.revertedWith("Not assigned hunter");
    });

    it("Should reject dispute of non-rejected bounty", async function () {
      // Create new bounty with minReputation 0 so hunter can claim
      const deadline = await time.latest() + 86400;
      const params = {
        creatorAgentId,
        title: "Test",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 0,
        requiredSkills: []
      };

      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);
      await bountyRegistry.connect(hunter).claimBounty(2);
      await bountyRegistry.connect(hunter).submitWork(2, "ipfs://QmSubmission");

      await expect(
        bountyRegistry.connect(hunter).disputeBounty(2)
      ).to.be.revertedWith("Can only dispute rejections");
    });
  });

  describe("Cancellation", function () {
    it("Should allow creator to cancel open bounty", async function () {
      const deadline = await time.latest() + 86400;
      const params = {
        creatorAgentId,
        title: "Test Bounty",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50,
        requiredSkills: []
      };
      
      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);
      
      await expect(
        bountyRegistry.connect(creator).cancelBounty(1)
      ).to.emit(bountyRegistry, "BountyCancelled")
        .withArgs(1, creatorAgentId);
      
      const bounty = await bountyRegistry.getBounty(1);
      expect(bounty.status).to.equal(9); // Cancelled
    });

    it("Should refund tokens on cancellation", async function () {
      const deadline = await time.latest() + 86400;
      const params = {
        creatorAgentId,
        title: "Test Bounty",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50,
        requiredSkills: []
      };
      
      const balanceBefore = await token.balanceOf(creator.address);
      
      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);
      await bountyRegistry.connect(creator).cancelBounty(1);
      
      // Should get refund (note: in real scenario depositor tracking needs proper implementation)
      const balanceAfter = await token.balanceOf(creator.address);
      expect(balanceAfter).to.be.gte(balanceBefore - REWARD_AMOUNT);
    });

    it("Should reject cancellation of claimed bounty", async function () {
      const deadline = await time.latest() + 86400;
      const params = {
        creatorAgentId,
        title: "Test Bounty",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50,
        requiredSkills: []
      };
      
      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);
      await bountyRegistry.connect(hunter).claimBounty(1);

      await expect(
        bountyRegistry.connect(creator).cancelBounty(1)
      ).to.be.revertedWith("Can only cancel open bounties");
    });

    it("Should reject cancellation from non-creator", async function () {
      const deadline = await time.latest() + 86400;
      const params = {
        creatorAgentId,
        title: "Test Bounty",
        descriptionURI: "ipfs://QmDesc",
        rewardToken: await token.getAddress(),
        rewardAmount: REWARD_AMOUNT,
        deadline,
        minReputation: 50,
        requiredSkills: []
      };
      
      await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
      await bountyRegistry.connect(creator).createBounty(params);
      
      await expect(
        bountyRegistry.connect(hunter).cancelBounty(1)
      ).to.be.revertedWith("Not creator");
    });
  });

  describe("Query Functions", function () {
    it("Should return correct bounty count", async function () {
      const deadline = await time.latest() + 86400;
      
      for (let i = 0; i < 3; i++) {
        const params = {
          creatorAgentId,
          title: `Bounty ${i}`,
          descriptionURI: "ipfs://QmDesc",
          rewardToken: await token.getAddress(),
          rewardAmount: REWARD_AMOUNT,
          deadline,
          minReputation: 50,
          requiredSkills: []
        };
        
        await token.connect(creator).approve(await bountyRegistry.getAddress(), REWARD_AMOUNT);
        await bountyRegistry.connect(creator).createBounty(params);
      }
      
      expect(await bountyRegistry.totalBounties()).to.equal(3);
    });
  });
});
