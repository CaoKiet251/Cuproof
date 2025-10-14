const { spawn } = require('child_process');
const { ethers } = require("hardhat");

async function startNodeAndDeploy() {
  console.log("Starting Hardhat node...");
  
  // Start Hardhat node
  const nodeProcess = spawn('npx', ['hardhat', 'node'], {
    stdio: 'pipe',
    shell: true
  });
  
  // Wait for node to start
  await new Promise((resolve) => setTimeout(resolve, 5000));
  
  console.log("Node started, deploying contracts...");
  
  try {
    // Deploy contracts
    const CuproofRegistry = await ethers.getContractFactory("CuproofRegistry");
    const registry = await CuproofRegistry.deploy();
    await registry.deployed();
    
    const initialParamsHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(["string"], ["initial-cuproof-params-v1"])
    );
    const CuproofVerifier = await ethers.getContractFactory("CuproofVerifier");
    const verifier = await CuproofVerifier.deploy(initialParamsHash);
    await verifier.deployed();
    
    console.log("CuproofRegistry deployed to:", registry.address);
    console.log("CuproofVerifier deployed to:", verifier.address);
    
    // Save deployment info
    const deploymentInfo = {
      network: "localhost",
      timestamp: new Date().toISOString(),
      contracts: {
        CuproofRegistry: registry.address,
        CuproofVerifier: verifier.address
      }
    };
    
    const fs = require('fs');
    fs.writeFileSync(
      './deployment-info.json',
      JSON.stringify(deploymentInfo, null, 2)
    );
    
    console.log("Deployment completed successfully!");
    console.log("Node is running on http://localhost:8545");
    console.log("Press Ctrl+C to stop the node");
    
    // Keep the process running
    process.on('SIGINT', () => {
      console.log("\nStopping node...");
      nodeProcess.kill();
      process.exit(0);
    });
    
  } catch (error) {
    console.error("Deployment failed:", error);
    nodeProcess.kill();
    process.exit(1);
  }
}

startNodeAndDeploy();
