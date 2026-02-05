const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("BountyRegistry", function () {
  let identityRegistry, reputationRegistry, escrow, bountyRegistry, mockToken;
  let owner, feeRecipient, disputeResolver, creator, hunter, hunter2;
  let creatorAgentId, hunterAgentId;

  beforeEach(async function () {
    [owner, feeRecipient, disputeResolver, creator, hunter, hunter2] = 
      await ethers.getSigners();
    
    // Deploy mock ERC20
    const MockERC20 = await ethers.getContractFactory("contracts/mocks/MockERC20.sol:MockERC20");
    mockToken = await MockERC20.deploy("Test Token", "TEST");
    await mockToken.waitForDeployment();
    
    // Deploy Identity Registry
    const AgentIdentityRegistry = await ethers.getContractFactory("AgentIdentityRegistry");
    identityRegistry = await AgentIdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();
    
    // Deploy Reputation Registry
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    reputationRegistry = await ReputationRegistry.deploy(await identityRegistry.getAddress());
    await reputationRegistry.waitForDeployment();
    
    // Deploy Escrow
    const BountyEscrow = await ethers.getContractFactory("BountyEscrow");
    escrow = await BountyEscrow.deploy(await identityRegistry.getAddress());
    await escrow.waitForDeployment();
    
    // Deploy Bounty Registry
    const BountyRegistry = await ethers.getContractFactory("BountyRegistry");
    bountyRegistry = await BountyRegistry.deploy(
      await identityRegistry.getAddress(),
      await reputationRegistry.getAddress(),
      await escrow.getAddress()
    );
    await bountyRegistry.waitForDeployment();
    
    // Initialize escrow
    await escrow.initialize(
      await bountyRegistry.getAddress(),
      disputeResolver.address,
      feeRecipient.address,
      100 // 1%
    );
    
    // Link reputation registry
    await reputationRegistry.setBountyRegistry(await bountyRegistry.getAddress());
    
    // Register agents
    await identityRegistry.connect(creator).register("ipfs://creator");
    await identityRegistry.connect(hunter).register("ipfs://hunter");
    await identityRegistry.connect(hunter2).register("ipfs://hunter2");
    
    creatorAgentId = 1n;
    hunterAgentId = 2n;
    
    // Mint tokens to creator
    await mockToken.mint(creator.address, ethers.parseEther("10000"));
    await mockToken.connect(creator).approve(
      await escrow.getAddress(),
      ethers.parseEther("10000")
    );
  });

  describe("Bounty Creation", function () {
    it("Should create a bounty", async function () {
      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://description123",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400, // 1 day
        minReputation: 0,
        requiredSkills: ["coding", "testing"],
      };
      
      const tx = await bountyRegistry.connect(creator).createBounty(params);
      await tx.wait();
      
      const bounty = await bountyRegistry.getBounty(1n);
      expect(bounty.title).to.equal(params.title);
      expect(bounty.creatorAgentId).to.equal(creatorAgentId);
      expect(bounty.rewardAmount).to.equal(params.rewardAmount);
      expect(bounty.status).to.equal(0); // BountyStatus.Open
      
      const skills = await bountyRegistry.getBountySkills(1n);
      expect(skills).to.deep.equal(params.requiredSkills);
    });

    it("Should require agent registration", async function () {
      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      await mockToken.mint(owner.address, ethers.parseEther("1000"));
      await mockToken.connect(owner).approve(await escrow.getAddress(), ethers.parseEther("1000"));
      
      await expect(
        bountyRegistry.connect(owner).createBounty(params)
      ).to.be.revertedWith("Must register as agent first");
    });

    it("Should escrow reward tokens", async function () {
      const amount = ethers.parseEther("100");
      const params = {
        title: "Test",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: amount,
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      const escrowBalanceBefore = await mockToken.balanceOf(await escrow.getAddress());
      await bountyRegistry.connect(creator).createBounty(params);
      const escrowBalanceAfter = await mockToken.balanceOf(await escrow.getAddress());
      
      expect(escrowBalanceAfter - escrowBalanceBefore).to.equal(amount);
    });
  });

  describe("Claiming Bounties", function () {
    let bountyId;

    beforeEach(async function () {
      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      const tx = await bountyRegistry.connect(creator).createBounty(params);
      await tx.wait();
      bountyId = 1n;
    });

    it("Should claim bounty", async function () {
      await bountyRegistry.connect(hunter).claimBounty(bountyId);
      
      const bounty = await bountyRegistry.getBounty(bountyId);
      expect(bounty.status).to.equal(1); // BountyStatus.Claimed
      expect(bounty.claimedBy).to.equal(hunterAgentId);
    });

    it("Should prevent creator from claiming own bounty", async function () {
      await expect(
        bountyRegistry.connect(creator).claimBounty(bountyId)
      ).to.be.revertedWith("Cannot claim own bounty");
    });

    it("Should check minimum reputation", async function () {
      // Create bounty with reputation requirement
      const params = {
        title: "High Rep Bounty",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 75,
        requiredSkills: [],
      };
      
      const tx = await bountyRegistry.connect(creator).createBounty(params);
      await tx.wait();
      
      await expect(
        bountyRegistry.connect(hunter).claimBounty(2n)
      ).to.be.revertedWith("Insufficient reputation");
    });
  });

  describe("Work Submission", function () {
    let bountyId;

    beforeEach(async function () {
      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      await bountyRegistry.connect(creator).createBounty(params);
      bountyId = 1n;
      await bountyRegistry.connect(hunter).claimBounty(bountyId);
    });

    it("Should submit work", async function () {
      const submissionURI = "ipfs://submission123";
      await bountyRegistry.connect(hunter).submitWork(bountyId, submissionURI);
      
      const bounty = await bountyRegistry.getBounty(bountyId);
      expect(bounty.status).to.equal(3); // BountyStatus.Submitted
      expect(bounty.submissionURI).to.equal(submissionURI);
    });

    it("Should only allow assigned hunter to submit", async function () {
      await expect(
        bountyRegistry.connect(hunter2).submitWork(bountyId, "ipfs://fake")
      ).to.be.revertedWith("Not assigned to you");
    });

    it("Should prevent submission after deadline", async function () {
      await time.increase(86401); // Move past deadline
      
      await expect(
        bountyRegistry.connect(hunter).submitWork(bountyId, "ipfs://late")
      ).to.be.revertedWith("Deadline passed");
    });
  });

  describe("Bounty Approval", function () {
    let bountyId;

    beforeEach(async function () {
      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      await bountyRegistry.connect(creator).createBounty(params);
      bountyId = 1n;
      await bountyRegistry.connect(hunter).claimBounty(bountyId);
      await bountyRegistry.connect(hunter).submitWork(bountyId, "ipfs://work");
    });

    it("Should approve and pay bounty", async function () {
      const hunterBalanceBefore = await mockToken.balanceOf(hunter.address);
      
      await bountyRegistry.connect(creator).approveBounty(
        bountyId,
        5,
        "ipfs://feedback"
      );
      
      const hunterBalanceAfter = await mockToken.balanceOf(hunter.address);
      const bounty = await bountyRegistry.getBounty(bountyId);
      
      expect(bounty.status).to.equal(8); // BountyStatus.Paid
      expect(hunterBalanceAfter).to.be.gt(hunterBalanceBefore);
    });

    it("Should record feedback on approval", async function () {
      await bountyRegistry.connect(creator).approveBounty(bountyId, 5, "ipfs://feedback");
      
      const feedbacks = await reputationRegistry.getFeedbacks(hunterAgentId);
      expect(feedbacks.length).to.equal(1);
      expect(feedbacks[0].rating).to.equal(5);
    });

    it("Should only allow creator to approve", async function () {
      await expect(
        bountyRegistry.connect(hunter2).approveBounty(bountyId, 5, "")
      ).to.be.revertedWith("Not creator");
    });
  });

  describe("Bounty Rejection", function () {
    let bountyId;

    beforeEach(async function () {
      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      await bountyRegistry.connect(creator).createBounty(params);
      bountyId = 1n;
      await bountyRegistry.connect(hunter).claimBounty(bountyId);
      await bountyRegistry.connect(hunter).submitWork(bountyId, "ipfs://work");
    });

    it("Should reject and refund", async function () {
      const creatorBalanceBefore = await mockToken.balanceOf(creator.address);
      
      await bountyRegistry.connect(creator).rejectBounty(bountyId, "Poor quality");
      
      const creatorBalanceAfter = await mockToken.balanceOf(creator.address);
      const bounty = await bountyRegistry.getBounty(bountyId);
      
      expect(bounty.status).to.equal(6); // BountyStatus.Rejected
      expect(creatorBalanceAfter).to.be.gt(creatorBalanceBefore);
    });

    it("Should record failure in reputation", async function () {
      await bountyRegistry.connect(creator).rejectBounty(bountyId, "Poor quality");
      
      const details = await reputationRegistry.getReputationDetails(hunterAgentId);
      expect(details.failedBounties).to.equal(1n);
    });
  });

  describe("Disputes", function () {
    let bountyId;

    beforeEach(async function () {
      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      await bountyRegistry.connect(creator).createBounty(params);
      bountyId = 1n;
      await bountyRegistry.connect(hunter).claimBounty(bountyId);
      await bountyRegistry.connect(hunter).submitWork(bountyId, "ipfs://work");
      await bountyRegistry.connect(creator).rejectBounty(bountyId, "Dispute this");
    });

    it("Should allow hunter to dispute rejection", async function () {
      await bountyRegistry.connect(hunter).disputeBounty(bountyId);
      
      const bounty = await bountyRegistry.getBounty(bountyId);
      expect(bounty.status).to.equal(7); // BountyStatus.Disputed
      expect(await escrow.isDisputed(bountyId)).to.be.true;
    });

    it("Should only allow assigned hunter to dispute", async function () {
      await expect(
        bountyRegistry.connect(hunter2).disputeBounty(bountyId)
      ).to.be.revertedWith("Not assigned hunter");
    });
  });

  describe("Cancellation and Expiry", function () {
    it("Should cancel open bounty", async function () {
      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      await bountyRegistry.connect(creator).createBounty(params);
      const bountyId = 1n;
      
      const creatorBalanceBefore = await mockToken.balanceOf(creator.address);
      await bountyRegistry.connect(creator).cancelBounty(bountyId);
      const creatorBalanceAfter = await mockToken.balanceOf(creator.address);
      
      const bounty = await bountyRegistry.getBounty(bountyId);
      expect(bounty.status).to.equal(9); // BountyStatus.Cancelled
      expect(creatorBalanceAfter).to.be.gt(creatorBalanceBefore);
    });

    it("Should expire unclaimed bounty", async function () {
      const params = {
        title: "Test Bounty",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      await bountyRegistry.connect(creator).createBounty(params);
      const bountyId = 1n;
      
      await time.increase(86401); // Move past deadline
      
      await bountyRegistry.connect(hunter).expireBounty(bountyId);
      
      const bounty = await bountyRegistry.getBounty(bountyId);
      expect(bounty.status).to.equal(10); // BountyStatus.Expired
    });
  });

  describe("View Functions", function () {
    it("Should track creator bounties", async function () {
      const params = {
        title: "Test",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      await bountyRegistry.connect(creator).createBounty(params);
      await bountyRegistry.connect(creator).createBounty(params);
      
      const bounties = await bountyRegistry.getBountiesByCreator(creatorAgentId);
      expect(bounties.length).to.equal(2);
    });

    it("Should track hunter bounties", async function () {
      const params = {
        title: "Test",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      await bountyRegistry.connect(creator).createBounty(params);
      await bountyRegistry.connect(creator).createBounty(params);
      
      await bountyRegistry.connect(hunter).claimBounty(1n);
      await bountyRegistry.connect(hunter).claimBounty(2n);
      
      const bounties = await bountyRegistry.getBountiesByHunter(hunterAgentId);
      expect(bounties.length).to.equal(2);
    });

    it("Should get active bounties", async function () {
      const params = {
        title: "Test",
        descriptionURI: "ipfs://test",
        rewardToken: await mockToken.getAddress(),
        rewardAmount: ethers.parseEther("100"),
        deadline: (await time.latest()) + 86400,
        minReputation: 0,
        requiredSkills: [],
      };
      
      await bountyRegistry.connect(creator).createBounty(params);
      await bountyRegistry.connect(creator).createBounty(params);
      
      const activeBounties = await bountyRegistry.getActiveBounties();
      expect(activeBounties.length).to.equal(2);
      
      // Cancel one
      await bountyRegistry.connect(creator).cancelBounty(1n);
      
      const remainingActive = await bountyRegistry.getActiveBounties();
      expect(remainingActive.length).to.equal(1);
    });
  });
});
