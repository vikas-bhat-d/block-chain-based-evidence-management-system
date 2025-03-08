const hre = require("hardhat");

async function main() {
  const EvidenceStorage = await hre.ethers.getContractFactory(
    "EvidenceStorage"
  );
  const evidenceStorage = await EvidenceStorage.deploy();

  await evidenceStorage.waitForDeployment();

  console.log("Contract deployed at :", await evidenceStorage.getAddress());
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
