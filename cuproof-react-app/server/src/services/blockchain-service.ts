import { ethers } from 'ethers';

// Contract addresses (deployed on Hardhat local network - fresh deployment)
const CONTRACT_ADDRESSES = {
  CuproofVerifier: process.env.CUPROOF_VERIFIER_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  CuproofRegistry: process.env.CUPROOF_REGISTRY_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
};

// Network configuration
const NETWORK_CONFIG = {
  chainId: 31337, // Hardhat local network
  chainName: 'Hardhat Local',
  rpcUrl: 'http://localhost:8545',
  blockExplorer: '',
};

// Contract ABIs
const CUPROOF_VERIFIER_ABI = [
  "function addVerifier(address verifier) external",
  "function removeVerifier(address verifier) external", 
  "function submitProofReceipt(address subject, bytes32 proofHash, bytes32 commitment, uint256 rangeMin, uint256 rangeMax, uint256 nonce, uint256 deadline, bytes calldata signature) external",
  "function verifyProofStatus(bytes32 proofHash) external view returns (bool)",
  "function getSubjectLatestProof(address subject) external view returns (bytes32)",
  "function getProofInfo(bytes32 proofHash) external view returns (tuple(address subject, bytes32 commitment, uint256 rangeMin, uint256 rangeMax, uint256 timestamp, address verifier, bool isValid))",
  "function isAuthorizedVerifier(address verifier) external view returns (bool)",
  "function owner() external view returns (address)",
  "function publicParamsHash() external view returns (bytes32)",
  "event ProofSubmitted(address indexed subject, bytes32 indexed proofHash, bytes32 commitment, uint256 rangeMin, uint256 rangeMax, uint256 timestamp, address verifier)",
  "event VerifierAdded(address indexed verifier)",
  "event VerifierRemoved(address indexed verifier)"
];

const CUPROOF_REGISTRY_ABI = [
  "function updatePublicParams(bytes32 g, bytes32 h, bytes32 n, string memory description) external",
  "function activateParamSet(uint256 paramSetId) external",
  "function getCurrentParams() external view returns (bytes32, bytes32, bytes32)",
  "function owner() external view returns (address)"
];

export interface ContractInfo {
  address: string;
  owner: string;
  publicParamsHash: string;
}

export interface ProofSubmissionResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface ProofInfo {
  subject: string;
  commitment: string;
  rangeMin: number;
  rangeMax: number;
  timestamp: number;
  verifier: string;
  isValid: boolean;
}

export class BlockchainService {
  private provider: ethers.providers.JsonRpcProvider;
  private verifierContract: ethers.Contract;
  private registryContract: ethers.Contract;
  private signer?: ethers.Wallet;

  constructor() {
    this.provider = new ethers.providers.JsonRpcProvider(NETWORK_CONFIG.rpcUrl);
    
    this.verifierContract = new ethers.Contract(
      CONTRACT_ADDRESSES.CuproofVerifier,
      CUPROOF_VERIFIER_ABI,
      this.provider
    );
    
    this.registryContract = new ethers.Contract(
      CONTRACT_ADDRESSES.CuproofRegistry,
      CUPROOF_REGISTRY_ABI,
      this.provider
    );

    // Initialize optional signer from environment for on-chain submissions
    const pk = process.env.VERIFIER_PRIVATE_KEY;
    if (pk && pk.trim().length > 0) {
      try {
        this.signer = new ethers.Wallet(pk.startsWith('0x') ? pk : ('0x' + pk), this.provider);
        this.verifierContract = this.verifierContract.connect(this.signer);
      } catch (e) {
        console.warn('Invalid VERIFIER_PRIVATE_KEY provided; continuing without signer');
      }
    }

    console.log('BlockchainService initialized:');
    console.log('  RPC URL:', NETWORK_CONFIG.rpcUrl);
    console.log('  Verifier Contract:', CONTRACT_ADDRESSES.CuproofVerifier);
    console.log('  Registry Contract:', CONTRACT_ADDRESSES.CuproofRegistry);
  }

  /**
   * Submit proof receipt to blockchain
   */
  async submitProofReceipt(
    subject: string,
    proofHash: string,
    commitment: string,
    rangeMin: number,
    rangeMax: number,
    nonce: number,
    deadline: number,
    signature: string
  ): Promise<ProofSubmissionResult> {
    try {
      if (!this.signer) {
        return { success: false, error: 'Server not configured with VERIFIER_PRIVATE_KEY' };
      }

      // Normalize bytes32 inputs
      const toBytes32 = (v: string) => {
        const hex = (v || '').toLowerCase();
        if (ethers.utils.isHexString(hex, 32)) return hex;
        // If user passed arbitrary string, hash to bytes32
        return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(v));
      };

      const subjectAddr = ethers.utils.getAddress(subject);
      const proofHash32 = toBytes32(proofHash);
      const commitment32 = toBytes32(commitment);

      const tx = await this.verifierContract.submitProofReceipt(
        subjectAddr,
        proofHash32,
        commitment32,
        ethers.BigNumber.from(rangeMin),
        ethers.BigNumber.from(rangeMax),
        ethers.BigNumber.from(nonce),
        ethers.BigNumber.from(deadline),
        signature,
        { gasLimit: 1_500_000 }
      );
      const receipt = await tx.wait();

      return {
        success: receipt.status === 1,
        transactionHash: receipt.transactionHash,
      };
    } catch (error: any) {
      console.error('Submit proof receipt error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Verify proof status on blockchain
   */
  async verifyProofStatus(proofHash: string): Promise<{ success: boolean; verified: boolean; error?: string }> {
    try {
      const verified = await this.verifierContract.verifyProofStatus(proofHash);
      return {
        success: true,
        verified,
      };
    } catch (error: any) {
      console.error('Verify proof status error:', error);
      return {
        success: false,
        verified: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Get detailed proof information
   */
  async getProofInfo(proofHash: string): Promise<{ success: boolean; info?: ProofInfo; error?: string }> {
    try {
      const info = await this.verifierContract.getProofInfo(proofHash);
      return {
        success: true,
        info: {
          subject: info.subject,
          commitment: info.commitment,
          rangeMin: info.rangeMin.toNumber(),
          rangeMax: info.rangeMax.toNumber(),
          timestamp: info.timestamp.toNumber(),
          verifier: info.verifier,
          isValid: info.isValid,
        },
      };
    } catch (error: any) {
      console.error('Get proof info error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Get contract information
   */
  async getContractInfo(): Promise<{ success: boolean; info?: ContractInfo; error?: string }> {
    try {
      const owner = await this.verifierContract.owner();
      const publicParamsHash = await this.verifierContract.publicParamsHash();
      
      return {
        success: true,
        info: {
          address: CONTRACT_ADDRESSES.CuproofVerifier,
          owner,
          publicParamsHash,
        },
      };
    } catch (error: any) {
      console.error('Get contract info error:', error);
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Check if address is authorized verifier
   */
  async isAuthorizedVerifier(address: string): Promise<{ success: boolean; authorized: boolean; error?: string }> {
    try {
      const authorized = await this.verifierContract.isAuthorizedVerifier(address);
      return {
        success: true,
        authorized,
      };
    } catch (error: any) {
      console.error('Check authorized verifier error:', error);
      return {
        success: false,
        authorized: false,
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Utility functions
   */
  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  formatTimestamp(timestamp: number): string {
    return new Date(timestamp * 1000).toLocaleString();
  }

  parseProofHash(proofHash: string): string {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(proofHash));
  }

  createMessageHash(
    proofHash: string,
    commitment: string,
    rangeMin: number,
    rangeMax: number,
    nonce: number,
    deadline: number,
    subject: string
  ): string {
    return ethers.utils.keccak256(
      ethers.utils.solidityPack(
        ['bytes32', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'address'],
        [proofHash, commitment, rangeMin, rangeMax, nonce, deadline, subject]
      )
    );
  }
}
