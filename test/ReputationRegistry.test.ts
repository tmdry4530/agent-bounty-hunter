import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentIdentityRegistry, ReputationRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("ReputationRegistry", function () {
  let identityRegistry: AgentIdentityRegistry;
  let reputationRegistry: ReputationRegistry;
  let owner: SignerWithAddress;
  let bountyRegistry: SignerWithAddress; // Simulate bounty registry
  let agent1: SignerWithAddress;
  let agent2: SignerWithAddress;
  
  const REGISTRATION_FEE = ethers.parseEther("1");
  const TEST_URI = "ipfs://QmTest";
  const DEFAULT_REPUTATION = 50;

  beforeEach(async function () {
    [owner, bountyRegistry, agent1, agent2] = await ethers.getSigners();
    
    // Deploy Identity Registry
    const IdentityFactory = await ethers.getContractFactory("AgentIdentityRegistry");
    identityRegistry = await IdentityFactory.deploy(REGISTRATION_FEE);
    await identityRegistry.waitForDeployment();
    
    // Deploy Reputation Registry
    const ReputationFactory = await ethers.getContractFactory("ReputationRegistry");
    reputationRegistry = await ReputationFactory.deploy(await identityRegistry.getAddress());
    await reputationRegistry.waitForDeployment();
    
    // Set bounty registry
    await reputationRegistry.setBountyRegistry(bountyRegistry.address);
    
    // Register test agents
    await identityRegistry.connect(agent1)["register(string)"](TEST_URI, { value: REGISTRATION_FEE });
    await identityRegistry.connect(agent2)["register(string)"](TEST_URI, { value: REGISTRATION_FEE });
  });

  describe("Deployment", function () {
    it("Should set the correct identity registry", async function () {
      expect(await reputationRegistry.identityRegistry()).to.equal(
        await identityRegistry.getAddress()
      );
    });

    it("Should set the bounty registry address", async function () {
      expect(await reputationRegistry.bountyRegistry()).to.equal(bountyRegistry.address);
    });

    it("Should have correct default reputation", async function () {
      expect(await reputationRegistry.DEFAULT_REPUTATION()).to.equal(DEFAULT_REPUTATION);
    });
  });

  describe("Reputation Initialization", function () {
    it("Should initialize reputation for valid agent", async function () {
      await expect(
        reputationRegistry.initializeReputation(1)
      ).to.emit(reputationRegistry, "ReputationUpdated")
        .withArgs(1, DEFAULT_REPUTATION);
      
      const rep = await reputationRegistry.getReputation(1);
      expect(rep.score).to.equal(DEFAULT_REPUTATION);
    });

    it("Should reject initialization for non-existent agent", async function () {
      await expect(
        reputationRegistry.initializeReputation(999)
      ).to.be.revertedWithCustomError(reputationRegistry, "InvalidAgentId");
    });

    it("Should not re-initialize if already initialized", async function () {
      await reputationRegistry.initializeReputation(1);
      
      // Second initialization should not change score
      await reputationRegistry.initializeReputation(1);
      
      const rep = await reputationRegistry.getReputation(1);
      expect(rep.score).to.equal(DEFAULT_REPUTATION);
    });

    it("Should return default reputation for uninitialized agent", async function () {
      const score = await reputationRegistry.getReputationScore(1);
      expect(score).to.equal(DEFAULT_REPUTATION);
    });
  });

  describe("Recording Completions", function () {
    it("Should record bounty completion with 5-star rating", async function () {
      const bountyId = 1;
      const reward = ethers.parseEther("10");
      const rating = 5;
      const feedback = "Excellent work!";
      
      await expect(
        reputationRegistry.connect(bountyRegistry).recordCompletion(
          1, bountyId, reward, rating, feedback
        )
      ).to.emit(reputationRegistry, "BountyCompleted")
        .withArgs(1, bountyId, reward)
        .and.to.emit(reputationRegistry, "ReviewAdded")
        .withArgs(1, bountyId, rating)
        .and.to.emit(reputationRegistry, "ReputationUpdated");
      
      const rep = await reputationRegistry.getReputation(1);
      expect(rep.completedBounties).to.equal(1);
      expect(rep.totalEarnings).to.equal(reward);
      expect(rep.totalRatings).to.equal(1);
    });

    it("Should reject completion from non-bounty-registry", async function () {
      await expect(
        reputationRegistry.connect(agent1).recordCompletion(
          1, 1, ethers.parseEther("10"), 5, "test"
        )
      ).to.be.revertedWithCustomError(reputationRegistry, "UnauthorizedCaller");
    });

    it("Should reject invalid ratings", async function () {
      await expect(
        reputationRegistry.connect(bountyRegistry).recordCompletion(
          1, 1, ethers.parseEther("10"), 0, "test"
        )
      ).to.be.revertedWithCustomError(reputationRegistry, "InvalidRating");
      
      await expect(
        reputationRegistry.connect(bountyRegistry).recordCompletion(
          1, 1, ethers.parseEther("10"), 6, "test"
        )
      ).to.be.revertedWithCustomError(reputationRegistry, "InvalidRating");
    });

    it("Should accumulate total earnings", async function () {
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 5, "Good"
      );
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 2, ethers.parseEther("15"), 4, "Nice"
      );
      
      const rep = await reputationRegistry.getReputation(1);
      expect(rep.totalEarnings).to.equal(ethers.parseEther("25"));
      expect(rep.completedBounties).to.equal(2);
    });

    it("Should calculate average rating correctly", async function () {
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 5, "Perfect"
      );
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 2, ethers.parseEther("10"), 3, "OK"
      );
      
      const rep = await reputationRegistry.getReputation(1);
      // (5*10 + 3*10) / 2 = 40 (represents 4.0 stars)
      expect(rep.avgRating).to.equal(40);
    });

    it("Should increase reputation score with good ratings", async function () {
      const initialScore = await reputationRegistry.getReputationScore(1);
      
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 5, "Great"
      );
      
      const newScore = await reputationRegistry.getReputationScore(1);
      expect(newScore).to.be.greaterThan(initialScore);
    });

    it("Should track success rate at 100% when all complete", async function () {
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 5, "Good"
      );
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 2, ethers.parseEther("10"), 4, "Good"
      );
      
      const rep = await reputationRegistry.getReputation(1);
      expect(rep.successRate).to.equal(100);
      expect(rep.totalAttempts).to.equal(2);
    });
  });

  describe("Recording Failures", function () {
    it("Should record bounty failure", async function () {
      // First complete one
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 5, "Good"
      );
      
      // Then fail one
      await expect(
        reputationRegistry.connect(bountyRegistry).recordFailure(1)
      ).to.emit(reputationRegistry, "ReputationUpdated");
      
      const rep = await reputationRegistry.getReputation(1);
      expect(rep.totalAttempts).to.equal(2);
      expect(rep.completedBounties).to.equal(1);
      expect(rep.successRate).to.equal(50); // 1 success out of 2 attempts
    });

    it("Should decrease reputation score on failure", async function () {
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 5, "Good"
      );
      
      const scoreBefore = await reputationRegistry.getReputationScore(1);
      
      await reputationRegistry.connect(bountyRegistry).recordFailure(1);
      
      const scoreAfter = await reputationRegistry.getReputationScore(1);
      expect(scoreAfter).to.be.lessThan(scoreBefore);
    });

    it("Should not let score go below 0", async function () {
      // Initialize with default
      await reputationRegistry.initializeReputation(1);
      
      // Fail many times
      for (let i = 0; i < 20; i++) {
        await reputationRegistry.connect(bountyRegistry).recordFailure(1);
      }
      
      const score = await reputationRegistry.getReputationScore(1);
      expect(score).to.be.gte(0);
    });

    it("Should reject failure recording from non-bounty-registry", async function () {
      await expect(
        reputationRegistry.connect(agent1).recordFailure(1)
      ).to.be.revertedWithCustomError(reputationRegistry, "UnauthorizedCaller");
    });
  });

  describe("Reputation Calculation", function () {
    it("Should cap reputation at 100", async function () {
      // Complete many bounties with 5 stars
      for (let i = 0; i < 50; i++) {
        await reputationRegistry.connect(bountyRegistry).recordCompletion(
          1, i + 1, ethers.parseEther("10"), 5, "Perfect"
        );
      }
      
      const rep = await reputationRegistry.getReputation(1);
      expect(rep.score).to.equal(100);
    });

    it("Should give higher score for more completions", async function () {
      // Agent 1: 1 completion
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 5, "Good"
      );
      
      // Agent 2: 10 completions
      for (let i = 0; i < 10; i++) {
        await reputationRegistry.connect(bountyRegistry).recordCompletion(
          2, i + 1, ethers.parseEther("10"), 5, "Good"
        );
      }
      
      const rep1 = await reputationRegistry.getReputation(1);
      const rep2 = await reputationRegistry.getReputation(2);
      
      expect(rep2.score).to.be.greaterThan(rep1.score);
    });

    it("Should reflect poor ratings in score", async function () {
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 1, "Terrible"
      );
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 2, ethers.parseEther("10"), 2, "Poor"
      );
      
      const score = await reputationRegistry.getReputationScore(1);
      expect(score).to.be.lessThan(DEFAULT_REPUTATION);
    });
  });

  describe("Reviews", function () {
    it("Should store review details", async function () {
      const bountyId = 1;
      const rating = 5;
      const feedback = "Outstanding work!";
      
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, bountyId, ethers.parseEther("10"), rating, feedback
      );
      
      const reviews = await reputationRegistry.getReviews(1);
      expect(reviews.length).to.equal(1);
      expect(reviews[0].bountyId).to.equal(bountyId);
      expect(reviews[0].rating).to.equal(rating);
      expect(reviews[0].feedback).to.equal(feedback);
      expect(reviews[0].reviewer).to.equal(bountyRegistry.address);
    });

    it("Should accumulate multiple reviews", async function () {
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 5, "Good"
      );
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 2, ethers.parseEther("10"), 4, "Nice"
      );
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 3, ethers.parseEther("10"), 5, "Great"
      );
      
      const reviews = await reputationRegistry.getReviews(1);
      expect(reviews.length).to.equal(3);
    });

    it("Should include timestamp in reviews", async function () {
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 5, "Good"
      );
      
      const reviews = await reputationRegistry.getReviews(1);
      expect(reviews[0].timestamp).to.be.greaterThan(0);
    });
  });

  describe("Reputation Requirements", function () {
    it("Should check if agent meets minimum reputation", async function () {
      // Default reputation is 50
      expect(await reputationRegistry.meetsRequirement(1, 50)).to.be.true;
      expect(await reputationRegistry.meetsRequirement(1, 30)).to.be.true;
      expect(await reputationRegistry.meetsRequirement(1, 70)).to.be.false;
    });

    it("Should update requirement check after earning reputation", async function () {
      // Initially doesn't meet 70
      expect(await reputationRegistry.meetsRequirement(1, 70)).to.be.false;
      
      // Complete several high-rated bounties
      for (let i = 0; i < 20; i++) {
        await reputationRegistry.connect(bountyRegistry).recordCompletion(
          1, i + 1, ethers.parseEther("10"), 5, "Perfect"
        );
      }
      
      // Now should meet it
      expect(await reputationRegistry.meetsRequirement(1, 70)).to.be.true;
    });

    it("Should handle zero requirement", async function () {
      expect(await reputationRegistry.meetsRequirement(1, 0)).to.be.true;
    });
  });

  describe("Edge Cases", function () {
    it("Should handle agent with no activity", async function () {
      const rep = await reputationRegistry.getReputation(1);
      
      expect(rep.score).to.equal(DEFAULT_REPUTATION);
      expect(rep.completedBounties).to.equal(0);
      expect(rep.totalEarnings).to.equal(0);
      expect(rep.successRate).to.equal(0);
    });

    it("Should return empty reviews for agent with no completions", async function () {
      const reviews = await reputationRegistry.getReviews(1);
      expect(reviews.length).to.equal(0);
    });

    it("Should handle very large reward amounts", async function () {
      const largeReward = ethers.parseEther("1000000");
      
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, largeReward, 5, "Huge bounty"
      );
      
      const rep = await reputationRegistry.getReputation(1);
      expect(rep.totalEarnings).to.equal(largeReward);
    });

    it("Should maintain separate reputation for different agents", async function () {
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 5, "Good"
      );
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        2, 2, ethers.parseEther("20"), 3, "OK"
      );
      
      const rep1 = await reputationRegistry.getReputation(1);
      const rep2 = await reputationRegistry.getReputation(2);
      
      expect(rep1.totalEarnings).to.equal(ethers.parseEther("10"));
      expect(rep2.totalEarnings).to.equal(ethers.parseEther("20"));
      expect(rep1.avgRating).to.not.equal(rep2.avgRating);
    });
  });

  describe("Complex Scenarios", function () {
    it("Should handle mixed success and failure correctly", async function () {
      // 3 successes
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 1, ethers.parseEther("10"), 5, "Good"
      );
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 2, ethers.parseEther("10"), 4, "Good"
      );
      await reputationRegistry.connect(bountyRegistry).recordCompletion(
        1, 3, ethers.parseEther("10"), 5, "Good"
      );
      
      // 1 failure
      await reputationRegistry.connect(bountyRegistry).recordFailure(1);
      
      const rep = await reputationRegistry.getReputation(1);
      expect(rep.completedBounties).to.equal(3);
      expect(rep.totalAttempts).to.equal(4);
      expect(rep.successRate).to.equal(75); // 3/4 = 75%
    });

    it("Should track reputation progression over time", async function () {
      const scores: bigint[] = [];
      
      scores.push(await reputationRegistry.getReputationScore(1));
      
      for (let i = 0; i < 5; i++) {
        await reputationRegistry.connect(bountyRegistry).recordCompletion(
          1, i + 1, ethers.parseEther("10"), 5, "Good"
        );
        scores.push(await reputationRegistry.getReputationScore(1));
      }
      
      // Verify score increases with each completion
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).to.be.gte(scores[i - 1]);
      }
    });
  });
});
