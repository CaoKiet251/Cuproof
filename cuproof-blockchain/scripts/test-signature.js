const { ethers } = require("hardhat");

async function testSignature() {
  console.log("Testing signature verification...");
  
  // Get accounts
  const [owner, verifier, subject] = await ethers.getSigners();
  
  // Deploy contracts
  const CuproofRegistry = await ethers.getContractFactory("CuproofRegistry");
  const registry = await CuproofRegistry.deploy();
  await registry.deployed();
  
  const initialParamsHash = ethers.utils.keccak256(
    ethers.utils.defaultAbiCoder.encode(["string"], ["test-params"])
  );
  const CuproofVerifier = await ethers.getContractFactory("CuproofVerifier");
  const cuproofVerifier = await CuproofVerifier.deploy(initialParamsHash);
  await cuproofVerifier.deployed();
  
  // Add verifier
  await cuproofVerifier.addVerifier(verifier.address);
  console.log("Added verifier:", verifier.address);
  
  // Test data
  const proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-proof"));
  const commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
  const rangeMin = 80;
  const rangeMax = 90;
  const nonce = 12345;
  const deadline = Math.floor(Date.now() / 1000) + 3600;
  
  console.log("Test data:");
  console.log("  Proof Hash:", proofHash);
  console.log("  Commitment:", commitment);
  console.log("  Range:", rangeMin, "-", rangeMax);
  console.log("  Nonce:", nonce);
  console.log("  Deadline:", deadline);
  console.log("  Subject:", subject.address);
  
  // Create message hash (same as in contract)
  const messageHash = ethers.utils.keccak256(
    ethers.utils.solidityPack(
      ["bytes32", "bytes32", "uint256", "uint256", "uint256", "uint256", "address"],
      [proofHash, commitment, rangeMin, rangeMax, nonce, deadline, subject.address]
    )
  );
  console.log("Message Hash:", messageHash);
  
  // Sign message using eth_sign (prefixed with "\x19Ethereum Signed Message:\n32")
  const ethSignedMessageHash = ethers.utils.solidityKeccak256(
    ["string", "bytes32"],
    ["\x19Ethereum Signed Message:\n32", messageHash]
  );
  signature = await verifier.signMessage(ethers.utils.arrayify(messageHash));
  console.log("Signature:", signature);
  
  // Recover signer
  const recoveredSigner = ethers.utils.verifyMessage(ethers.utils.arrayify(messageHash), signature);
  console.log("Recovered Signer:", recoveredSigner);
  console.log("Expected Signer:", verifier.address);
  console.log("Signer Match:", recoveredSigner === verifier.address);
  
  // Test contract signature recovery
  try {
    const tx = await cuproofVerifier.connect(verifier).submitProofReceipt(
      subject.address,
      proofHash,
      commitment,
      rangeMin,
      rangeMax,
      nonce,
      deadline,
      signature
    );
    console.log("Transaction successful:", tx.hash);
    
    // Check if proof was stored
    const isVerified = await cuproofVerifier.verifyProofStatus(proofHash);
    console.log("Proof verified:", isVerified);
    
  } catch (error) {
    console.error("Transaction failed:", error.message);
  }
}

testSignature()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
