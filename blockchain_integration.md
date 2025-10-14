# Tích hợp Blockchain cho Hệ thống Cuproof

## 1. Tổng quan Kiến trúc

### 1.1 Mô hình Hybrid (Off-chain + On-chain)
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Prover        │    │   Verifier       │    │   Blockchain     │
│   (Client)      │    │   (Service)      │    │   (Storage)      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │ 1. Tạo Proof          │                       │
         ├──────────────────────►│                       │
         │                       │ 2. Verify Off-chain   │
         │                       ├──────────────────────►│
         │                       │ 3. Tạo Receipt + Ký   │
         │                       ├──────────────────────►│
         │                       │ 4. Submit Receipt     │
         │                       ├──────────────────────►│
         │                       │ 5. Store Hash/State   │
         │                       │◄──────────────────────┤
```

### 1.2 Lợi ích của Hybrid Model
- **Chi phí thấp**: Verification ngoài chain, chỉ lưu trữ kết quả
- **Bảo mật cao**: Proof được verify bởi trusted verifier
- **Tính minh bạch**: On-chain audit trail
- **Khả năng mở rộng**: Không bị giới hạn bởi gas limit

## 2. Smart Contract Architecture

### 2.1 CuproofVerifier Contract (EVM/Solidity)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CuproofVerifier {
    // Events
    event ProofSubmitted(
        address indexed subject,
        bytes32 indexed proofHash,
        bytes32 commitment,
        uint256 rangeMin,
        uint256 rangeMax,
        uint256 timestamp,
        address verifier
    );
    
    event ProofVerified(
        bytes32 indexed proofHash,
        bool isValid,
        address verifier
    );
    
    // State variables
    mapping(bytes32 => bool) public verifiedProofs;
    mapping(address => bytes32) public latestProofHash;
    mapping(address => bool) public authorizedVerifiers;
    
    address public owner;
    bytes32 public publicParamsHash; // Hash of (g,h,n)
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }
    
    modifier onlyAuthorizedVerifier() {
        require(authorizedVerifiers[msg.sender], "Unauthorized verifier");
        _;
    }
    
    constructor(bytes32 _publicParamsHash) {
        owner = msg.sender;
        publicParamsHash = _publicParamsHash;
    }
    
    // Functions
    function addVerifier(address verifier) external onlyOwner {
        authorizedVerifiers[verifier] = true;
    }
    
    function removeVerifier(address verifier) external onlyOwner {
        authorizedVerifiers[verifier] = false;
    }
    
    function submitProofReceipt(
        address subject,
        bytes32 proofHash,
        bytes32 commitment,
        uint256 rangeMin,
        uint256 rangeMax,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external {
        require(block.timestamp <= deadline, "Proof expired");
        require(!verifiedProofs[proofHash], "Proof already verified");
        
        // Verify signature from authorized verifier
        bytes32 messageHash = keccak256(abi.encodePacked(
            proofHash,
            commitment,
            rangeMin,
            rangeMax,
            nonce,
            deadline,
            subject
        ));
        
        address signer = recoverSigner(messageHash, signature);
        require(authorizedVerifiers[signer], "Invalid verifier signature");
        
        // Store proof verification
        verifiedProofs[proofHash] = true;
        latestProofHash[subject] = proofHash;
        
        emit ProofSubmitted(
            subject,
            proofHash,
            commitment,
            rangeMin,
            rangeMax,
            block.timestamp,
            signer
        );
    }
    
    function verifyProofStatus(bytes32 proofHash) external view returns (bool) {
        return verifiedProofs[proofHash];
    }
    
    function getSubjectLatestProof(address subject) external view returns (bytes32) {
        return latestProofHash[subject];
    }
    
    // Helper function to recover signer
    function recoverSigner(bytes32 messageHash, bytes calldata signature) 
        internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := calldataload(signature.offset)
            s := calldataload(add(signature.offset, 0x20))
            v := byte(0, calldataload(add(signature.offset, 0x40)))
        }
        
        return ecrecover(messageHash, v, r, s);
    }
}
```

### 2.2 CuproofRegistry Contract (Quản lý tham số)

```solidity
contract CuproofRegistry {
    struct PublicParams {
        bytes32 g;
        bytes32 h;
        bytes32 n;
        uint256 timestamp;
        bool active;
    }
    
    mapping(uint256 => PublicParams) public paramSets;
    uint256 public currentParamSet;
    
    event ParamsUpdated(uint256 indexed paramSetId, bytes32 paramsHash);
    
    function updatePublicParams(
        bytes32 g,
        bytes32 h,
        bytes32 n
    ) external onlyOwner {
        uint256 newParamSet = currentParamSet + 1;
        
        paramSets[newParamSet] = PublicParams({
            g: g,
            h: h,
            n: n,
            timestamp: block.timestamp,
            active: true
        });
        
        currentParamSet = newParamSet;
        
        bytes32 paramsHash = keccak256(abi.encodePacked(g, h, n));
        emit ParamsUpdated(newParamSet, paramsHash);
    }
    
    function getCurrentParams() external view returns (bytes32, bytes32, bytes32) {
        PublicParams memory params = paramSets[currentParamSet];
        return (params.g, params.h, params.n);
    }
}
```

## 3. Verifier Service (Off-chain)

### 3.1 Rust Verifier Service

```rust
use std::collections::HashMap;
use web3::types::{Address, H256, U256};
use web3::contract::{Contract, Options};
use web3::transports::Http;
use web3::Web3;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

#[derive(Serialize, Deserialize)]
pub struct ProofSubmission {
    pub subject: String,
    pub proof_data: Vec<u8>,
    pub range_min: u64,
    pub range_max: u64,
    pub nonce: u64,
    pub deadline: u64,
}

#[derive(Serialize, Deserialize)]
pub struct VerificationResult {
    pub proof_hash: String,
    pub commitment: String,
    pub is_valid: bool,
    pub verifier_signature: String,
}

pub struct CuproofVerifierService {
    web3: Web3<Http>,
    contract: Contract<Http>,
    private_key: [u8; 32],
    public_params: (BigInt, BigInt, BigInt),
}

impl CuproofVerifierService {
    pub async fn new(
        rpc_url: &str,
        contract_address: Address,
        private_key: [u8; 32],
        params_path: &str,
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let transport = Http::new(rpc_url)?;
        let web3 = Web3::new(transport);
        
        // Load contract ABI and create contract instance
        let contract = Contract::from_json(
            web3.eth(),
            contract_address,
            include_bytes!("CuproofVerifier.json")
        )?;
        
        // Load public parameters
        let (g, h, n) = cuproof::util::load_params(params_path)?;
        
        Ok(Self {
            web3,
            contract,
            private_key,
            public_params: (g, h, n),
        })
    }
    
    pub async fn verify_and_submit(
        &self,
        submission: ProofSubmission,
    ) -> Result<VerificationResult, Box<dyn std::error::Error>> {
        // 1. Deserialize proof
        let proof = cuproof::util::load_proof_from_bytes(&submission.proof_data)?;
        
        // 2. Verify proof off-chain
        let (g, h, n) = &self.public_params;
        let is_valid = cuproof::verify::cuproof_verify(&proof, g, h, n);
        
        if !is_valid {
            return Err("Proof verification failed".into());
        }
        
        // 3. Generate proof hash and commitment
        let proof_hash = self.generate_proof_hash(&submission.proof_data);
        let commitment = format!("{:x}", proof.C);
        
        // 4. Create verifier signature
        let message = self.create_verification_message(
            &proof_hash,
            &commitment,
            submission.range_min,
            submission.range_max,
            submission.nonce,
            submission.deadline,
            &submission.subject,
        );
        
        let signature = self.sign_message(&message)?;
        
        // 5. Submit to blockchain
        self.submit_to_blockchain(
            submission.subject,
            proof_hash,
            commitment,
            submission.range_min,
            submission.range_max,
            submission.nonce,
            submission.deadline,
            signature,
        ).await?;
        
        Ok(VerificationResult {
            proof_hash,
            commitment,
            is_valid: true,
            verifier_signature: hex::encode(signature),
        })
    }
    
    fn generate_proof_hash(&self, proof_data: &[u8]) -> String {
        let mut hasher = Sha256::new();
        hasher.update(proof_data);
        hex::encode(hasher.finalize())
    }
    
    fn create_verification_message(
        &self,
        proof_hash: &str,
        commitment: &str,
        range_min: u64,
        range_max: u64,
        nonce: u64,
        deadline: u64,
        subject: &str,
    ) -> Vec<u8> {
        let message = format!(
            "{}{}{}{}{}{}{}",
            proof_hash,
            commitment,
            range_min,
            range_max,
            nonce,
            deadline,
            subject
        );
        message.into_bytes()
    }
    
    async fn submit_to_blockchain(
        &self,
        subject: String,
        proof_hash: String,
        commitment: String,
        range_min: u64,
        range_max: u64,
        nonce: u64,
        deadline: u64,
        signature: Vec<u8>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        // Convert subject string to address (simplified)
        let subject_addr: Address = subject.parse()?;
        
        // Call contract method
        let tx_hash = self.contract
            .call(
                "submitProofReceipt",
                (
                    subject_addr,
                    H256::from_slice(&hex::decode(proof_hash)?),
                    H256::from_slice(&hex::decode(commitment)?),
                    U256::from(range_min),
                    U256::from(range_max),
                    U256::from(nonce),
                    U256::from(deadline),
                    signature,
                ),
                self.get_account(),
                Options::default(),
            )
            .await?;
        
        println!("Transaction submitted: {:?}", tx_hash);
        Ok(())
    }
}
```

## 4. Client Integration

### 4.1 Prover Client (Rust)

```rust
use std::time::{SystemTime, UNIX_EPOCH};

pub struct CuproofProverClient {
    params_path: String,
}

impl CuproofProverClient {
    pub fn new(params_path: String) -> Self {
        Self { params_path }
    }
    
    pub fn create_proof(
        &self,
        value: u64,
        range_min: u64,
        range_max: u64,
    ) -> Result<ProofSubmission, Box<dyn std::error::Error>> {
        // Load public parameters
        let (g, h, n) = cuproof::util::load_params(&self.params_path)?;
        
        // Convert to BigInt
        let v = BigInt::from(value);
        let a = BigInt::from(range_min);
        let b = BigInt::from(range_max);
        
        // Generate random blinding factor
        let r = cuproof::util::random_bigint(256);
        
        // Create proof
        let proof = cuproof::range_proof::cuproof_prove(&v, &r, &a, &b, &g, &h, &n);
        
        // Serialize proof
        let proof_data = self.serialize_proof(&proof)?;
        
        // Generate nonce and deadline
        let nonce = self.generate_nonce();
        let deadline = self.get_deadline();
        
        Ok(ProofSubmission {
            subject: self.get_subject_id(),
            proof_data,
            range_min,
            range_max,
            nonce,
            deadline,
        })
    }
    
    fn serialize_proof(&self, proof: &cuproof::range_proof::Cuproof) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
        // Convert proof to bytes (simplified)
        let mut data = Vec::new();
        
        // Serialize each field
        data.extend_from_slice(&proof.A.to_bytes_be().1);
        data.extend_from_slice(&proof.S.to_bytes_be().1);
        data.extend_from_slice(&proof.T1.to_bytes_be().1);
        data.extend_from_slice(&proof.T2.to_bytes_be().1);
        // ... serialize other fields
        
        Ok(data)
    }
    
    fn generate_nonce(&self) -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs()
    }
    
    fn get_deadline(&self) -> u64 {
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_secs() + 3600 // 1 hour from now
    }
    
    fn get_subject_id(&self) -> String {
        // In practice, this would be the user's wallet address or DID
        "0x1234567890123456789012345678901234567890".to_string()
    }
}
```

## 5. API Endpoints

### 5.1 REST API cho Verifier Service

```rust
use warp::Filter;
use serde_json::json;

async fn verify_proof_endpoint(
    submission: ProofSubmission,
    verifier_service: CuproofVerifierService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match verifier_service.verify_and_submit(submission).await {
        Ok(result) => Ok(warp::reply::json(&result)),
        Err(e) => Ok(warp::reply::json(&json!({
            "error": e.to_string()
        }))),
    }
}

#[tokio::main]
async fn main() {
    let verifier_service = CuproofVerifierService::new(
        "http://localhost:8545",
        "0x...", // contract address
        [0u8; 32], // private key
        "params.txt",
    ).await.unwrap();
    
    let verify_route = warp::path("verify")
        .and(warp::post())
        .and(warp::body::json())
        .and(warp::any().map(move || verifier_service.clone()))
        .and_then(verify_proof_endpoint);
    
    warp::serve(verify_route)
        .run(([0, 0, 0, 0], 3030))
        .await;
}
```

## 6. Bảo mật và Privacy

### 6.1 Privacy-Preserving Features
- **Zero-Knowledge**: Giá trị thực không được tiết lộ
- **Commitment Hiding**: Chỉ lưu commitment, không lưu giá trị
- **Verifier Privacy**: Verifier không cần biết giá trị để verify
- **Audit Trail**: Có thể audit mà không vi phạm privacy

### 6.2 Security Considerations
- **Signature Verification**: Kiểm tra chữ ký verifier
- **Nonce Replay Protection**: Chống tái sử dụng proof
- **Deadline Enforcement**: Proof có thời hạn
- **Authorized Verifiers**: Chỉ verifier được ủy quyền mới có thể submit

## 7. Deployment và Monitoring

### 7.1 Deployment Scripts

```bash
#!/bin/bash
# deploy.sh

# Compile contracts
npx hardhat compile

# Deploy to network
npx hardhat run scripts/deploy.js --network mainnet

# Verify contracts
npx hardhat verify --network mainnet <CONTRACT_ADDRESS>
```

### 7.2 Monitoring Dashboard

```typescript
// monitoring.ts
interface ProofMetrics {
  totalProofs: number;
  validProofs: number;
  invalidProofs: number;
  averageVerificationTime: number;
  gasUsed: number;
}

class CuproofMonitor {
  async getMetrics(): Promise<ProofMetrics> {
    // Query blockchain events
    const events = await contract.queryFilter("ProofSubmitted");
    
    return {
      totalProofs: events.length,
      validProofs: events.filter(e => e.args.isValid).length,
      invalidProofs: events.filter(e => !e.args.isValid).length,
      averageVerificationTime: await this.calculateAvgTime(),
      gasUsed: await this.calculateGasUsage(),
    };
  }
}
```

## 8. Kết luận

Tích hợp Blockchain cho Cuproof cung cấp:
- **Kiến trúc hybrid** hiệu quả với chi phí thấp
- **Smart contracts** đảm bảo tính minh bạch và bảo mật
- **Verifier service** xử lý verification phức tạp off-chain
- **Privacy-preserving** bảo vệ thông tin cá nhân
- **Scalable** có thể mở rộng cho nhiều ứng dụng

Hệ thống này phù hợp cho các ứng dụng cần chứng minh điểm số, bằng cấp, hoặc bất kỳ giá trị nào nằm trong khoảng cụ thể mà không tiết lộ giá trị thực.
