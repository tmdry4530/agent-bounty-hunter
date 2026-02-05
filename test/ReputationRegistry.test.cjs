const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ReputationRegistry", function () {
  let identityRegistry, reputationRegistry;
  let owner, bountyRegistry, agent1, agent2;

  beforeEach(async function () {
    [owner, bountyRegistry, agent1, agent2] = await ethers.getSigners();
    
    // Deploy Identity Registry
    const AgentIdentityRegistry = await ethers.getContractFactory("AgentIdentityRegistry");
    identityRegistry = await AgentIdentityRegistry.deploy();
    await identityRegistry.waitForDeployment();
    
    // Deploy Reputation Registry
    const ReputationRegistry = await ethers.getContractFactory("ReputationRegistry");
    reputationRegistry = await ReputationRegistry.deploy(await identityRegistry.getAddress());
    await reputationRegistry.waitForDeployment();
    
    // Register agents
    await identityRegistry.connect(agent1).register("ipfs://agent1");
    await identityRegistry.connect(agent2).register("ipfs://agent2");
    
    // Set bounty registry
    await reputationRegistry.setBountyRegistry(bountyRegistry.address);
  });

  describe("Initialization", function () {
    it("Should set bounty registry once", async function () {
      expect(await reputationRegistry.bountyRegistry()).to.equal(bountyRegistry.address);
      
      await expect(
        reputationRegistry.setBountyRegistry(agent1.address)
      ).to.be.revertedWith("Already set");
    });

    it("Should reference identity registry", async function () {
      expect(await reputationRegistry.identityRegistry()).to.equal(
        await identityRegistry.getAddress()
      );
    });
  });

  describe("Feedback Submission", function () {
    it("Should submit feedback", async function () {
      const agentId = 2n; // agent2
      const bountyId = 1n;
      const rating = 5;
      const commentURI = "ipfs://feedback123";
      const proofHash = ethers.keccak256(ethers.toUtf8Bytes("proof"));
      
      await reputationRegistry.connect(bountyRegistry).submitFeedback(
        1n, // from agent1
        agentId,
        bountyId,
        rating,
        commentURI,
        proofHash
      );
      
      const feedbacks = await reputationRegistry.getFeedbacks(agentId);
      expect(feedbacks.length).to.equal(1);
      expect(feedbacks[0].rating).to.equal(rating);
      expect(feedbacks[0].commentURI).to.equal(commentURI);
    });

    it("Should only allow bounty registry to submit", async function () {
      await expect(
        reputationRegistry.connect(agent1).submitFeedback(
          1n, 2n, 1n, 5, "ipfs://test", ethers.ZeroHash
        )
      ).to.be.revertedWith("Only BountyRegistry");
    });

    it("Should reject invalid rating", async function () {
      await expect(
        reputationRegistry.connect(bountyRegistry).submitFeedback(
          1n, 2n, 1n, 6, "ipfs://test", ethers.ZeroHash
        )
      ).to.be.revertedWith("Invalid rating (1-5)");
      
      await expect(
        reputationRegistry.connect(bountyRegistry).submitFeedback(
          1n, 2n, 1n, 0, "ipfs://test", ethers.ZeroHash
        )
      ).to.be.revertedWith("Invalid rating (1-5)");
    });

    it("Should prevent duplicate feedback for same bounty", async function () {
      await reputationRegistry.connect(bountyRegistry).submitFeedback(
        1n, 2n, 1n, 5, "ipfs://test", ethers.ZeroHash
      );
      
      await expect(
        reputationRegistry.connect(bountyRegistry).submitFeedback(
          1n, 2n, 1n, 5, "ipfs://test2", ethers.ZeroHash
        )
      ).to.be.revertedWith("Feedback already submitted");
    });
  });

  describe("Reputation Score Calculation", function () {
    it("Should return default score for new agent", async function () {
      const score = await reputationRegistry.calculateScore(1n);
      expect(score).to.equal(50n); // Default neutral score
    });

    it("Should calculate score based on ratings", async function () {
      const agentId = 2n;
      
      // Submit multiple ratings
      await reputationRegistry.connect(bountyRegistry).submitFeedback(
        1n, agentId, 1n, 5, "", ethers.ZeroHash
      );
      await reputationRegistry.connect(bountyRegistry).submitFeedback(
        1n, agentId, 2n, 4, "", ethers.ZeroHash
      );
      
      const score = await reputationRegistry.calculateScore(agentId);
      expect(score).to.be.gt(50n); // Should be above neutral
    });

    it("Should factor in completion rate", async function () {
      const agentId = 2n;
      
      await reputationRegistry.connect(bountyRegistry).recordCompletion(agentId, 1n, true);
      await reputationRegistry.connect(bountyRegistry).recordCompletion(agentId, 2n, true);
      await reputationRegistry.connect(bountyRegistry).recordCompletion(agentId, 3n, false);
      
      const details = await reputationRegistry.getReputationDetails(agentId);
      expect(details.completedBounties).to.equal(2n);
      expect(details.failedBounties).to.equal(1n);
      
      const completionRate = await reputationRegistry.getCompletionRate(agentId);
      expect(completionRate).to.equal(6666n); // 66.66% in basis points
    });

    it("Should factor in disputes", async function () {
      const agentId = 2n;
      
      await reputationRegistry.connect(bountyRegistry).recordDispute(agentId, 1n, true);
      await reputationRegistry.connect(bountyRegistry).recordDispute(agentId, 2n, false);
      
      const details = await reputationRegistry.getReputationDetails(agentId);
      expect(details.disputesWon).to.equal(1n);
      expect(details.disputesLost).to.equal(1n);
    });
  });

  describe("View Functions", function () {
    beforeEach(async function () {
      const agentId = 2n;
      await reputationRegistry.connect(bountyRegistry).submitFeedback(
        1n, agentId, 1n, 5, "ipfs://feedback1", ethers.ZeroHash
      );
      await reputationRegistry.connect(bountyRegistry).submitFeedback(
        1n, agentId, 2n, 4, "ipfs://feedback2", ethers.ZeroHash
      );
    });

    it("Should get reputation summary", async function () {
      const [score, totalRatings] = await reputationRegistry.getReputation(2n);
      expect(score).to.be.gt(0n);
      expect(totalRatings).to.equal(2n);
    });

    it("Should get detailed reputation", async function () {
      const details = await reputationRegistry.getReputationDetails(2n);
      expect(details.totalRatings).to.equal(2n);
      expect(details.ratingSum).to.equal(9n); // 5 + 4
    });

    it("Should get all feedbacks", async function () {
      const feedbacks = await reputationRegistry.getFeedbacks(2n);
      expect(feedbacks.length).to.equal(2);
    });

    it("Should get paginated feedbacks", async function () {
      const feedbacks = await reputationRegistry.getFeedbacksPaginated(2n, 0, 1);
      expect(feedbacks.length).to.equal(1);
      expect(feedbacks[0].rating).to.equal(5);
    });

    it("Should get feedback count", async function () {
      const count = await reputationRegistry.getFeedbackCount(2n);
      expect(count).to.equal(2n);
    });

    it("Should get average rating", async function () {
      const avgRating = await reputationRegistry.getAverageRating(2n);
      expect(avgRating).to.equal(450n); // 4.5 * 100
    });

    it("Should check if feedback exists", async function () {
      const exists = await reputationRegistry.hasFeedback(1n, 2n);
      expect(exists).to.be.true;
      
      const notExists = await reputationRegistry.hasFeedback(99n, 2n);
      expect(notExists).to.be.false;
    });
  });

  describe("Events", function () {
    it("Should emit FeedbackSubmitted event", async function () {
      await expect(
        reputationRegistry.connect(bountyRegistry).submitFeedback(
          1n, 2n, 1n, 5, "ipfs://test", ethers.ZeroHash
        )
      ).to.emit(reputationRegistry, "FeedbackSubmitted")
        .withArgs(1n, 2n, 1n, 5, "ipfs://test");
    });

    it("Should emit ReputationUpdated event", async function () {
      await expect(
        reputationRegistry.connect(bountyRegistry).submitFeedback(
          1n, 2n, 1n, 5, "ipfs://test", ethers.ZeroHash
        )
      ).to.emit(reputationRegistry, "ReputationUpdated");
    });

    it("Should emit CompletionRecorded event", async function () {
      await expect(
        reputationRegistry.connect(bountyRegistry).recordCompletion(2n, 1n, true)
      ).to.emit(reputationRegistry, "CompletionRecorded")
        .withArgs(2n, 1n, true);
    });

    it("Should emit DisputeRecorded event", async function () {
      await expect(
        reputationRegistry.connect(bountyRegistry).recordDispute(2n, 1n, true)
      ).to.emit(reputationRegistry, "DisputeRecorded")
        .withArgs(2n, 1n, true);
    });
  });
});
