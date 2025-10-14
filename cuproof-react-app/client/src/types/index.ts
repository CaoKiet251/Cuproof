// Types for Cuproof React Application

export interface ProofData {
  value: number;
  rangeMin: number;
  rangeMax: number;
  proofHash: string;
  commitment: string;
  timestamp: number;
}

export interface VerificationResult {
  isValid: boolean;
  proofHash: string;
  subject: string;
  rangeMin: number;
  rangeMax: number;
  timestamp: number;
  verifier: string;
}

export interface UserRole {
  type: 'owner' | 'verifier' | 'subject';
  address: string;
  isConnected: boolean;
}

export interface ContractInfo {
  address: string;
  owner: string;
  publicParamsHash: string;
}

export interface ProofSubmission {
  subject: string;
  proofHash: string;
  commitment: string;
  rangeMin: number;
  rangeMax: number;
  nonce: number;
  deadline: number;
  signature: string;
}

export interface CuproofParams {
  g: string;
  h: string;
  n: string;
  description: string;
}

export interface NetworkInfo {
  chainId: number;
  chainName: string;
  rpcUrl: string;
  blockExplorer: string;
}

export interface TransactionStatus {
  hash: string;
  status: 'pending' | 'success' | 'error';
  message?: string;
}

export interface ProofFormData {
  value: string;
  rangeMin: string;
  rangeMax: string;
  description?: string;
}

export interface VerificationFormData {
  proofHash: string;
  commitment: string;
  rangeMin: string;
  rangeMax: string;
  subject: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface CuproofCLIResult {
  success: boolean;
  proof?: string;
  error?: string;
  output?: string;
}
