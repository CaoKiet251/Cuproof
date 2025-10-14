const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CuproofVerifier", function () {
  let cuproofVerifier;
  let cuproofRegistry;
  let owner;
  let verifier;
  let subject;
  let otherAccount;

  beforeEach(async function () {
    [owner, verifier, subject, otherAccount] = await ethers.getSigners();

    // Deploy CuproofRegistry
    const CuproofRegistry = await ethers.getContractFactory("CuproofRegistry");
    cuproofRegistry = await CuproofRegistry.deploy();
    await cuproofRegistry.deployed();

    // Deploy CuproofVerifier
    const initialParamsHash = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(["string"], ["test-params"])
    );
    const CuproofVerifier = await ethers.getContractFactory("CuproofVerifier");
    cuproofVerifier = await CuproofVerifier.deploy(initialParamsHash);
    await cuproofVerifier.deployed();

    // Add verifier as authorized
    await cuproofVerifier.addVerifier(verifier.address);
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await cuproofVerifier.owner()).to.equal(owner.address);
    });

    it("Should set the initial public params hash", async function () {
      const expectedHash = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(["string"], ["test-params"])
      );
      expect(await cuproofVerifier.publicParamsHash()).to.equal(expectedHash);
    });
  });

  describe("Verifier Management", function () {
    it("Should allow owner to add verifier", async function () {
      await cuproofVerifier.addVerifier(otherAccount.address);
      expect(await cuproofVerifier.isAuthorizedVerifier(otherAccount.address)).to.be.true;
    });

    it("Should allow owner to remove verifier", async function () {
      await cuproofVerifier.removeVerifier(verifier.address);
      expect(await cuproofVerifier.isAuthorizedVerifier(verifier.address)).to.be.false;
    });

    it("Should not allow non-owner to add verifier", async function () {
      await expect(
        cuproofVerifier.connect(otherAccount).addVerifier(otherAccount.address)
      ).to.be.revertedWith("Only owner");
    });

    it("Should emit VerifierAdded event", async function () {
      await expect(cuproofVerifier.addVerifier(otherAccount.address))
        .to.emit(cuproofVerifier, "VerifierAdded")
        .withArgs(otherAccount.address);
    });
  });

  describe("Proof Submission", function () {
    let proofHash;
    let commitment;
    let rangeMin;
    let rangeMax;
    let nonce;
    let deadline;
    let signature;

    beforeEach(async function () {
      proofHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-proof"));
      commitment = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("test-commitment"));
      rangeMin = 80;
      rangeMax = 90;
      nonce = 12345;
      deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // Create signature - need to use the same encoding as in the contract
      const messageHash = ethers.utils.keccak256(
        ethers.utils.solidityPack(
          ["bytes32", "bytes32", "uint256", "uint256", "uint256", "uint256", "address"],
          [proofHash, commitment, rangeMin, rangeMax, nonce, deadline, subject.address]
        )
      );
      signature = await verifier.signMessage(ethers.utils.arrayify(messageHash));
    });

    it("Should allow authorized verifier to submit proof", async function () {
      await expect(
        cuproofVerifier.connect(verifier).submitProofReceipt(
          subject.address,
          proofHash,
          commitment,
          rangeMin,
          rangeMax,
          nonce,
          deadline,
          signature
        )
      ).to.emit(cuproofVerifier, "ProofSubmitted");
    });

    it("Should store proof information correctly", async function () {
      await cuproofVerifier.connect(verifier).submitProofReceipt(
        subject.address,
        proofHash,
        commitment,
        rangeMin,
        rangeMax,
        nonce,
        deadline,
        signature
      );

      expect(await cuproofVerifier.verifyProofStatus(proofHash)).to.be.true;
      expect(await cuproofVerifier.getSubjectLatestProof(subject.address)).to.equal(proofHash);
    });

    it("Should reject expired proof", async function () {
      const expiredDeadline = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

      await expect(
        cuproofVerifier.connect(verifier).submitProofReceipt(
          subject.address,
          proofHash,
          commitment,
          rangeMin,
          rangeMax,
          nonce,
          expiredDeadline,
          signature
        )
      ).to.be.revertedWith("Proof expired");
    });

    it("Should reject duplicate proof", async function () {
      await cuproofVerifier.connect(verifier).submitProofReceipt(
        subject.address,
        proofHash,
        commitment,
        rangeMin,
        rangeMax,
        nonce,
        deadline,
        signature
      );

      await expect(
        cuproofVerifier.connect(verifier).submitProofReceipt(
          subject.address,
          proofHash,
          commitment,
          rangeMin,
          rangeMax,
          nonce,
          deadline,
          signature
        )
      ).to.be.revertedWith("Proof already verified");
    });

    it("Should reject invalid signature", async function () {
      const invalidSignature = await otherAccount.signMessage(
        ethers.utils.arrayify(proofHash)
      );

      await expect(
        cuproofVerifier.connect(verifier).submitProofReceipt(
          subject.address,
          proofHash,
          commitment,
          rangeMin,
          rangeMax,
          nonce,
          deadline,
          invalidSignature
        )
      ).to.be.revertedWith("Invalid verifier signature");
    });
  });

  describe("Ownership", function () {
    it("Should allow owner to transfer ownership", async function () {
      await cuproofVerifier.transferOwnership(otherAccount.address);
      expect(await cuproofVerifier.owner()).to.equal(otherAccount.address);
    });

    it("Should emit OwnerChanged event", async function () {
      await expect(cuproofVerifier.transferOwnership(otherAccount.address))
        .to.emit(cuproofVerifier, "OwnerChanged")
        .withArgs(owner.address, otherAccount.address);
    });

    it("Should not allow non-owner to transfer ownership", async function () {
      await expect(
        cuproofVerifier.connect(otherAccount).transferOwnership(otherAccount.address)
      ).to.be.revertedWith("Only owner");
    });
  });
});

describe("CuproofRegistry", function () {
  let cuproofRegistry;
  let owner;
  let otherAccount;

  beforeEach(async function () {
    [owner, otherAccount] = await ethers.getSigners();

    const CuproofRegistry = await ethers.getContractFactory("CuproofRegistry");
    cuproofRegistry = await CuproofRegistry.deploy();
    await cuproofRegistry.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await cuproofRegistry.owner()).to.equal(owner.address);
    });

    it("Should initialize with zero parameter sets", async function () {
      expect(await cuproofRegistry.getParamSetsCount()).to.equal(0);
    });
  });

  describe("Parameter Management", function () {
    it("Should allow owner to update parameters", async function () {
      const g = ethers.utils.formatBytes32String("generator-g");
      const h = ethers.utils.formatBytes32String("generator-h");
      const n = ethers.utils.formatBytes32String("modulus-n");
      const description = "Test parameters";

      await expect(
        cuproofRegistry.updatePublicParams(g, h, n, description)
      ).to.emit(cuproofRegistry, "ParamsUpdated");
    });

    it("Should store parameters correctly", async function () {
      const g = ethers.utils.formatBytes32String("generator-g");
      const h = ethers.utils.formatBytes32String("generator-h");
      const n = ethers.utils.formatBytes32String("modulus-n");
      const description = "Test parameters";

      await cuproofRegistry.updatePublicParams(g, h, n, description);

      const [retrievedG, retrievedH, retrievedN] = await cuproofRegistry.getCurrentParams();
      expect(retrievedG).to.equal(g);
      expect(retrievedH).to.equal(h);
      expect(retrievedN).to.equal(n);
    });

    it("Should not allow non-owner to update parameters", async function () {
      const g = ethers.utils.formatBytes32String("generator-g");
      const h = ethers.utils.formatBytes32String("generator-h");
      const n = ethers.utils.formatBytes32String("modulus-n");
      const description = "Test parameters";

      await expect(
        cuproofRegistry.connect(otherAccount).updatePublicParams(g, h, n, description)
      ).to.be.revertedWith("Only owner");
    });

    it("Should reject invalid parameters", async function () {
      const g = ethers.utils.formatBytes32String("generator-g");
      const h = ethers.utils.formatBytes32String("generator-h");
      const n = ethers.constants.HashZero; // Invalid zero hash
      const description = "Test parameters";

      await expect(
        cuproofRegistry.updatePublicParams(g, h, n, description)
      ).to.be.revertedWith("Invalid modulus n");
    });
  });

  describe("Parameter Activation", function () {
    beforeEach(async function () {
      // Add two parameter sets
      const g1 = ethers.utils.formatBytes32String("generator-g-1");
      const h1 = ethers.utils.formatBytes32String("generator-h-1");
      const n1 = ethers.utils.formatBytes32String("modulus-n-1");
      await cuproofRegistry.updatePublicParams(g1, h1, n1, "First set");

      const g2 = ethers.utils.formatBytes32String("generator-g-2");
      const h2 = ethers.utils.formatBytes32String("generator-h-2");
      const n2 = ethers.utils.formatBytes32String("modulus-n-2");
      await cuproofRegistry.updatePublicParams(g2, h2, n2, "Second set");
    });

    it("Should allow owner to activate parameter set", async function () {
      await expect(cuproofRegistry.activateParamSet(1))
        .to.emit(cuproofRegistry, "ParamsActivated")
        .withArgs(1);
    });

    it("Should deactivate previous parameter set when activating new one", async function () {
      await cuproofRegistry.activateParamSet(1);
      expect(await cuproofRegistry.isParamSetActive(2)).to.be.false;
      expect(await cuproofRegistry.isParamSetActive(1)).to.be.true;
    });
  });
});
