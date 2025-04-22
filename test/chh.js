const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("crowdFunding Contract", function () {
  let crowdFunding;
  let owner, contributor1, contributor2, recipient;
  const TARGET = ethers.parseUnits("10", "ether");
  const DEADLINE = 7 * 24 * 60 * 60; // 1 week in seconds
  const MIN_INVESTMENT = 100; // 100 wei

  before(async function () {
    [owner, contributor1, contributor2, recipient] = await ethers.getSigners();

    const CrowdFunding = await ethers.getContractFactory("crowdFunding");
    crowdFunding = await CrowdFunding.deploy(TARGET, DEADLINE);
  });

  describe("Initialization", function () {
    it("Should set the correct manager", async function () {
      expect(await crowdFunding.manager()).to.equal(owner.address);
    });

    // it("Should set the correct target amount", async function () {
    //   expect(await crowdFunding.target).to.equal(TARGET);
    // });

    it("Should set the correct target amount", async function () {
      const contractTarget = await crowdFunding.targetFn();
      expect(contractTarget).to.equal(TARGET); // Ensure this comparison is in the same unit (wei)
    });
    

    it("Should set the correct deadline", async function () {
      const block = await ethers.provider.getBlock("latest");
      expect(await crowdFunding.deadline()).to.equal(block.timestamp + DEADLINE);
    });

    it("Should set the minimum investment", async function () {
      expect(await crowdFunding.mininvestment()).to.equal(MIN_INVESTMENT);
    });
  });

  describe("Contributions", function () {
    it("Should accept valid contributions", async function () {
      await crowdFunding.connect(contributor1).sendEth({ value: MIN_INVESTMENT });
      expect(await crowdFunding.contributers(contributor1.address)).to.equal(MIN_INVESTMENT);
    });

    it("Should reject contributions below minimum", async function () {
      await expect(
        crowdFunding.connect(contributor1).sendEth({ value: MIN_INVESTMENT - 1 })
      ).to.be.revertedWith("min investement is 100 wei");
    });

    it("Should track contributors correctly", async function () {
      expect(await crowdFunding.noOfContributers()).to.equal(1);
    });

    it("Should reject contributions after deadline", async function () {
      const CrowdFunding = await ethers.getContractFactory("crowdFunding");
      const expiredCampaign = await CrowdFunding.deploy(TARGET, 1); // 1 second deadline

      await new Promise(resolve => setTimeout(resolve, 2000)); // wait to expire

      await expect(
        expiredCampaign.connect(contributor2).sendEth({ value: MIN_INVESTMENT })
      ).to.be.revertedWith("deadline has been passed");
    });
  });

  describe("Refunds", function () {
    it("Should allow refunds when target not met", async function () {
      const CrowdFunding = await ethers.getContractFactory("crowdFunding");
      const refundableCampaign = await CrowdFunding.deploy(TARGET, 2); // 2 seconds deadline

      await refundableCampaign.connect(contributor1).sendEth({ value: MIN_INVESTMENT });

      await new Promise(resolve => setTimeout(resolve, 3000)); // wait longer than 2s

      const initialBalance = await ethers.provider.getBalance(contributor1.address);
      const tx = await refundableCampaign.connect(contributor1).refund();
      const receipt = await tx.wait();
      const gasUsed = receipt.gasUsed * receipt.gasPrice;

      expect(await ethers.provider.getBalance(contributor1.address))
        .to.be.closeTo(initialBalance + BigInt(MIN_INVESTMENT) - gasUsed, ethers.parseUnits("0.01", "ether"));
    });

    it("Should prevent refunds when target is met", async function () {
      const CrowdFunding = await ethers.getContractFactory("crowdFunding");
      const successfulCampaign = await CrowdFunding.deploy(MIN_INVESTMENT, DEADLINE);
      await successfulCampaign.connect(contributor1).sendEth({ value: MIN_INVESTMENT });

      await new Promise(resolve => setTimeout(resolve, 2000)); // wait past deadline

      await expect(
        successfulCampaign.connect(contributor1).refund()
      ).to.be.revertedWith("time not compleated yet");
    });
  });

  describe("Funding Requests", function () {
    const REQUEST_AMOUNT = ethers.parseUnits("1", "ether");  // Updated here
    const REQUEST_DESCRIPTION = "Development work";

    before(async function () {
      const CrowdFunding = await ethers.getContractFactory("crowdFunding");
      crowdFunding = await CrowdFunding.deploy(TARGET, DEADLINE);

      await crowdFunding.connect(contributor1).sendEth({ value: TARGET });
      await crowdFunding.connect(contributor2).sendEth({ value: TARGET });
    });

    it("Should allow manager to create requests", async function () {
      await crowdFunding.connect(owner).CreateRequest(
        REQUEST_DESCRIPTION,
        recipient.address,
        REQUEST_AMOUNT
      );

      expect(await crowdFunding.numRequests()).to.equal(1);
    });

    it("Should prevent non-managers from creating requests", async function () {
      await expect(
        crowdFunding.connect(contributor1).CreateRequest(
          REQUEST_DESCRIPTION,
          recipient.address,
          REQUEST_AMOUNT
        )
      ).to.be.revertedWith("only owner can call this function");
    });

    it("Should allow contributors to vote", async function () {
      await crowdFunding.connect(contributor1).voteRequest(0);
      await crowdFunding.connect(contributor2).voteRequest(0);

      const request = await crowdFunding.requests(0);
      expect(request.noOfVoters).to.equal(2);
    });

    it("Should prevent double voting", async function () {
      await expect(
        crowdFunding.connect(contributor1).voteRequest(0)
      ).to.be.revertedWith("You have already voted");
    });

    it("Should process payments when approved", async function () {
      const initialBalance = await ethers.provider.getBalance(recipient.address);
      await crowdFunding.connect(owner).makePayment(0);
      const finalBalance = await ethers.provider.getBalance(recipient.address);

      expect(finalBalance - initialBalance).to.equal(REQUEST_AMOUNT);
    });
  });
});
