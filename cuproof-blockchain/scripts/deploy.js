const { ethers } = require("hardhat");

async function main() {
  console.log("Starting Cuproof contracts deployment...");
  
  // Get the contract factories
  const CuproofRegistry = await ethers.getContractFactory("CuproofRegistry");
  const CuproofVerifier = await ethers.getContractFactory("CuproofVerifier");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  
  // Deploy CuproofRegistry first
  console.log("\nDeploying CuproofRegistry...");
  const registry = await CuproofRegistry.deploy();
  await registry.deployed();
  console.log("CuproofRegistry deployed to:", registry.address);
  
  // Create initial public parameters hash (placeholder)
  // In production, this should be the actual hash of (g, h, n)
  const initialParamsHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(
      ["string"],
      ["initial-cuproof-params-v1"]
    )
  );
  
  // Deploy CuproofVerifier with registry address and initial params hash
  console.log("\nDeploying CuproofVerifier...");
  const verifier = await CuproofVerifier.deploy(initialParamsHash);
  await verifier.deployed();
  console.log("CuproofVerifier deployed to:", verifier.address);
  
  // Add some initial authorized verifiers (optional)
  console.log("\nSetting up initial configuration...");
  
  // Add deployer as first authorized verifier
  const tx1 = await verifier.addVerifier(deployer.address);
  await tx1.wait();
  console.log("Added deployer as authorized verifier");
  
  // Update registry with initial parameters
  const tx2 = await registry.updatePublicParams(
    ethers.utils.formatBytes32String("generator-g-placeholder"),
    ethers.utils.formatBytes32String("generator-h-placeholder"),
    ethers.utils.formatBytes32String("modulus-n-placeholder"),
    "Initial Cuproof parameters for testing"
  );
  await tx2.wait();
  console.log("Updated registry with initial parameters");
  
  // Get the updated params hash
  const currentParamsHash = await registry.getCurrentParamsHash();
  console.log("Current params hash:", currentParamsHash);
  
  // Update verifier with the actual params hash
  const tx3 = await verifier.updatePublicParamsHash(currentParamsHash);
  await tx3.wait();
  console.log("Updated verifier with current params hash");
  
  // Print deployment summary
  console.log("\n=== DEPLOYMENT SUMMARY ===");
  console.log("CuproofRegistry:", registry.address);
  console.log("CuproofVerifier:", verifier.address);
  console.log("Deployer:", deployer.address);
  console.log("Initial Params Hash:", currentParamsHash);
  
  // Save deployment info to file
  const deploymentInfo = {
    network: "localhost",
    timestamp: new Date().toISOString(),
    contracts: {
      CuproofRegistry: registry.address,
      CuproofVerifier: verifier.address
    },
    deployer: deployer.address,
    paramsHash: currentParamsHash
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    './deployment-info.json',
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\nDeployment info saved to deployment-info.json");
  
  console.log("\nDeployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });