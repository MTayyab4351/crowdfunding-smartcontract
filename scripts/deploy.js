const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with address:", deployer.address);

  // Set parameters for your contract
  const TARGET = hre.ethers.parseUnits("10", "ether");
  const DEADLINE = 7 * 24 * 60 * 60; // 1 week in seconds

  // Compile and deploy contract
  const CrowdFunding = await hre.ethers.getContractFactory("crowdFunding");
  const contract = await CrowdFunding.deploy(TARGET, DEADLINE);

  await contract.waitForDeployment();

  console.log("crowdFunding deployed to:", await contract.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
