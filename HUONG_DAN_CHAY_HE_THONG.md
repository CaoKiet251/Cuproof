# HƯỚNG DẪN CHẠY HỆ THỐNG CHỨNG MINH VĂN BẰNG TÍCH HỢP BLOCKCHAIN

## TỔNG QUAN

Hệ thống Cuproof cho phép chứng minh điểm số trong văn bằng nằm trong một khoảng cụ thể mà không tiết lộ điểm số thực tế. Hệ thống bao gồm:

- **Cuproof Core**: Thuật toán range proof zero-knowledge
- **CLI Interface**: Giao diện dòng lệnh để tạo và xác minh proof
- **Blockchain Integration**: Smart contracts và verifier service
- **Verifier Service**: Xác minh proof off-chain và submit lên blockchain

---

## CÀI ĐẶT VÀ CHUẨN BỊ

### 1. Yêu cầu hệ thống
- **Rust**: Version 1.70+ 
- **Cargo**: Package manager của Rust
- **Git**: Để clone repository
- **Node.js**: Version 16+ (cho blockchain integration)
- **Hardhat**: Framework cho Ethereum development

### 2. Cài đặt Rust
```bash
# Windows (PowerShell)
Invoke-WebRequest -Uri "https://win.rustup.rs/" -OutFile "rustup-init.exe"
.\rustup-init.exe

# Linux/macOS
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### 3. Clone và build dự án
```bash
git clone <repository-url>
cd cuproof
cargo build --release
```

### 4. Cài đặt dependencies cho blockchain
```bash
npm install -g hardhat
npm install @openzeppelin/contracts web3 ethers
```

---

## CHẠY HỆ THỐNG CƠ BẢN (CLI)

### Bước 1: Tạo tham số công khai
```bash
# Development mode (nhanh, 512-bit modulus)
target\release\cuproof setup fast params.txt

# Production mode (chậm hơn, 2048-bit modulus)
target\release\cuproof setup trusted params.txt
```

**Output:** File `params.txt` chứa các tham số công khai (g, h, n) ở dạng hex.

### Bước 2: Tạo proof cho điểm số
```bash
# Cú pháp: cuproof prove <params_path> <a_hex> <b_hex> <v_hex> <proof_path>
# Ví dụ: Chứng minh điểm v=75 nằm trong khoảng [10, 100]

target\release\cuproof prove params.txt 0a 64 4b proof.txt
```

**Giải thích:**
- `0a` = 10 (hex) - điểm tối thiểu
- `64` = 100 (hex) - điểm tối đa  
- `4b` = 75 (hex) - điểm số thực tế (bí mật)

**Output:** File `proof.txt` chứa bằng chứng zero-knowledge.

### Bước 3: Xác minh proof
```bash
target\release\cuproof verify params.txt proof.txt
```

**Output:** `VALID` hoặc `INVALID`

---

## 🔗 TÍCH HỢP BLOCKCHAIN

### Bước 1: Setup Blockchain Environment

#### 1.1 Tạo Hardhat project
```bash
mkdir cuproof-blockchain
cd cuproof-blockchain
npx hardhat init
```

#### 1.2 Cài đặt dependencies
```bash
npm install @openzeppelin/contracts
npm install --save-dev @nomiclabs/hardhat-ethers ethers
```

#### 1.3 Tạo smart contracts
```solidity
// contracts/CuproofVerifier.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CuproofVerifier {
    mapping(bytes32 => bool) public verifiedProofs;
    mapping(address => bytes32) public latestProofHash;
    mapping(address => bool) public authorizedVerifiers;
    
    address public owner;
    
    event ProofSubmitted(
        address indexed subject,
        bytes32 indexed proofHash,
        bytes32 commitment,
        uint256 rangeMin,
        uint256 rangeMax,
        uint256 timestamp,
        address verifier
    );
    
    constructor() {
        owner = msg.sender;
    }
    
    function addVerifier(address verifier) external {
        require(msg.sender == owner, "Only owner");
        authorizedVerifiers[verifier] = true;
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
        
        // Verify signature (simplified)
        address signer = recoverSigner(proofHash, signature);
        require(authorizedVerifiers[signer], "Invalid verifier");
        
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

### Bước 2: Deploy Smart Contracts

#### 2.1 Cấu hình Hardhat
```javascript
// hardhat.config.js
require("@nomiclabs/hardhat-ethers");

module.exports = {
  solidity: "0.8.19",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545"
    },
    hardhat: {
      chainId: 1337
    }
  }
};
```

#### 2.2 Deploy script
```javascript
// scripts/deploy.js
async function main() {
  const CuproofVerifier = await ethers.getContractFactory("CuproofVerifier");
  const verifier = await CuproofVerifier.deploy();
  
  await verifier.deployed();
  
  console.log("CuproofVerifier deployed to:", verifier.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

#### 2.3 Deploy contracts
```bash
# Start local blockchain
npx hardhat node

# In another terminal, deploy contracts
npx hardhat run scripts/deploy.js --network localhost
```

### Bước 3: Tạo Verifier Service

#### 3.1 Tạo Rust service
```rust
// src/verifier_service.rs
use std::collections::HashMap;
use web3::types::{Address, H256, U256};
use web3::contract::{Contract, Options};
use web3::transports::Http;
use web3::Web3;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct ProofSubmission {
    pub subject: String,
    pub proof_data: Vec<u8>,
    pub range_min: u64,
    pub range_max: u64,
    pub nonce: u64,
    pub deadline: u64,
}

pub struct CuproofVerifierService {
    web3: Web3<Http>,
    contract: Contract<Http>,
    private_key: [u8; 32],
}

impl CuproofVerifierService {
    pub async fn new(
        rpc_url: &str,
        contract_address: Address,
        private_key: [u8; 32],
    ) -> Result<Self, Box<dyn std::error::Error>> {
        let transport = Http::new(rpc_url)?;
        let web3 = Web3::new(transport);
        
        let contract = Contract::from_json(
            web3.eth(),
            contract_address,
            include_bytes!("CuproofVerifier.json")
        )?;
        
        Ok(Self {
            web3,
            contract,
            private_key,
        })
    }
    
    pub async fn verify_and_submit(
        &self,
        submission: ProofSubmission,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // 1. Load proof from bytes
        let proof = cuproof::util::load_proof_from_bytes(&submission.proof_data)?;
        
        // 2. Load public parameters
        let (g, h, n) = cuproof::util::load_params("params.txt")?;
        
        // 3. Verify proof
        let is_valid = cuproof::verify::cuproof_verify(&proof, &g, &h, &n);
        
        if !is_valid {
            return Err("Proof verification failed".into());
        }
        
        // 4. Generate proof hash
        let proof_hash = self.generate_proof_hash(&submission.proof_data);
        
        // 5. Create signature
        let signature = self.create_signature(&proof_hash)?;
        
        // 6. Submit to blockchain
        self.submit_to_blockchain(submission, proof_hash, signature).await?;
        
        Ok(proof_hash)
    }
    
    fn generate_proof_hash(&self, proof_data: &[u8]) -> String {
        use sha2::{Digest, Sha256};
        let mut hasher = Sha256::new();
        hasher.update(proof_data);
        hex::encode(hasher.finalize())
    }
    
    async fn submit_to_blockchain(
        &self,
        submission: ProofSubmission,
        proof_hash: String,
        signature: Vec<u8>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let subject_addr: Address = submission.subject.parse()?;
        
        let tx_hash = self.contract
            .call(
                "submitProofReceipt",
                (
                    subject_addr,
                    H256::from_slice(&hex::decode(&proof_hash)?),
                    H256::from_slice(&[0u8; 32]), // commitment placeholder
                    U256::from(submission.range_min),
                    U256::from(submission.range_max),
                    U256::from(submission.nonce),
                    U256::from(submission.deadline),
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

### Bước 4: Tạo API Server

#### 4.1 Cài đặt dependencies
```toml
# Cargo.toml
[dependencies]
warp = "0.3"
tokio = { version = "1.0", features = ["full"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
web3 = "0.19"
```

#### 4.2 API server
```rust
// src/api_server.rs
use warp::Filter;
use serde_json::json;

async fn verify_proof_endpoint(
    submission: ProofSubmission,
    verifier_service: CuproofVerifierService,
) -> Result<impl warp::Reply, warp::Rejection> {
    match verifier_service.verify_and_submit(submission).await {
        Ok(proof_hash) => Ok(warp::reply::json(&json!({
            "status": "success",
            "proof_hash": proof_hash
        }))),
        Err(e) => Ok(warp::reply::json(&json!({
            "status": "error",
            "message": e.to_string()
        }))),
    }
}

#[tokio::main]
async fn main() {
    let verifier_service = CuproofVerifierService::new(
        "http://localhost:8545",
        "0x...", // contract address
        [0u8; 32], // private key
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

---

## WORKFLOW HOÀN CHỈNH

### Scenario: Sinh viên chứng minh điểm số

#### Bước 1: Prover (Sinh viên) tạo proof
```bash
# Sinh viên có điểm 85, cần chứng minh nằm trong [80, 90]
target\release\cuproof prove params.txt 50 5a 55 proof_student.txt
```

#### Bước 2: Gửi proof đến Verifier Service
```bash
# Sử dụng API hoặc gửi file trực tiếp
curl -X POST http://localhost:3030/verify \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "0x1234567890123456789012345678901234567890",
    "proof_data": [/* proof bytes */],
    "range_min": 80,
    "range_max": 90,
    "nonce": 12345,
    "deadline": 1640995200
  }'
```

#### Bước 3: Verifier Service xử lý
1. **Load proof** từ request
2. **Verify proof** bằng Cuproof library
3. **Generate signature** nếu verification thành công
4. **Submit to blockchain** với proof hash và signature

#### Bước 4: Blockchain lưu trữ
- **Smart contract** nhận receipt
- **Verify signature** của verifier
- **Store proof hash** và metadata
- **Emit event** cho audit trail

#### Bước 5: Kiểm tra kết quả
```bash
# Kiểm tra trên blockchain
npx hardhat console --network localhost
> const verifier = await ethers.getContractAt("CuproofVerifier", "0x...");
> await verifier.verifiedProofs("0x..."); // proof hash
```

---

## 🔧 TROUBLESHOOTING

### Lỗi thường gặp

#### 1. Build errors
```bash
# Cập nhật Rust
rustup update

# Clean và rebuild
cargo clean
cargo build --release
```

#### 2. Blockchain connection errors
```bash
# Kiểm tra Hardhat node
npx hardhat node

# Kiểm tra network
npx hardhat console --network localhost
```

#### 3. Proof verification fails
```bash
# Kiểm tra parameters
cat params.txt

# Kiểm tra proof format
cat proof.txt
```

### Debug commands
```bash
# Verbose output
RUST_LOG=debug cargo run --release

# Check dependencies
cargo tree

# Run tests
cargo test --verbose
```

---

## MONITORING VÀ LOGGING

### 1. Blockchain events
```javascript
// Monitor events
verifier.on("ProofSubmitted", (subject, proofHash, commitment, rangeMin, rangeMax, timestamp, verifier) => {
  console.log(`Proof submitted: ${proofHash}`);
  console.log(`Subject: ${subject}`);
  console.log(`Range: [${rangeMin}, ${rangeMax}]`);
});
```

### 2. API logging
```rust
// Add logging to API server
use log::{info, error, warn};

async fn verify_proof_endpoint(submission: ProofSubmission) -> Result<impl warp::Reply, warp::Rejection> {
    info!("Received proof submission from: {}", submission.subject);
    
    match verifier_service.verify_and_submit(submission).await {
        Ok(proof_hash) => {
            info!("Proof verified successfully: {}", proof_hash);
            Ok(warp::reply::json(&json!({"status": "success"})))
        },
        Err(e) => {
            error!("Proof verification failed: {}", e);
            Ok(warp::reply::json(&json!({"status": "error"})))
        }
    }
}
```

---

## DEPLOYMENT PRODUCTION

### 1. Mainnet deployment
```bash
# Deploy to mainnet
npx hardhat run scripts/deploy.js --network mainnet

# Verify contracts
npx hardhat verify --network mainnet <CONTRACT_ADDRESS>
```

### 2. Production configuration
```javascript
// hardhat.config.js
module.exports = {
  networks: {
    mainnet: {
      url: process.env.MAINNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      gasPrice: 20000000000, // 20 gwei
    }
  }
};
```

### 3. Environment variables
```bash
# .env file
MAINNET_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
PRIVATE_KEY=0x...
CONTRACT_ADDRESS=0x...
```

---

## PERFORMANCE OPTIMIZATION

### 1. Batch processing
```rust
// Process multiple proofs
pub async fn batch_verify(
    &self,
    submissions: Vec<ProofSubmission>,
) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let mut results = Vec::new();
    
    for submission in submissions {
        let result = self.verify_and_submit(submission).await?;
        results.push(result);
    }
    
    Ok(results)
}
```

### 2. Caching
```rust
// Cache verified proofs
use std::collections::HashSet;

pub struct CachedVerifier {
    verified_proofs: HashSet<String>,
    verifier_service: CuproofVerifierService,
}

impl CachedVerifier {
    pub async fn verify(&mut self, submission: ProofSubmission) -> Result<String, Box<dyn std::error::Error>> {
        let proof_hash = self.generate_proof_hash(&submission.proof_data);
        
        if self.verified_proofs.contains(&proof_hash) {
            return Ok(proof_hash);
        }
        
        let result = self.verifier_service.verify_and_submit(submission).await?;
        self.verified_proofs.insert(proof_hash.clone());
        
        Ok(result)
    }
}
```

---

## KẾT LUẬN

Hệ thống Cuproof tích hợp blockchain cung cấp:

1. **Privacy-preserving**: Chứng minh điểm số mà không tiết lộ giá trị thực
2. **Decentralized**: Không phụ thuộc vào một bên trung tâm
3. **Transparent**: Audit trail trên blockchain
4. **Scalable**: Off-chain verification với on-chain storage
5. **Secure**: Cryptographic proofs với signature verification

Hệ thống này có thể được áp dụng cho:
- **Giáo dục**: Chứng minh điểm số và bằng cấp
- **Tài chính**: Chứng minh thu nhập và tài sản
- **Chính phủ**: Chứng minh tuổi và điều kiện
- **Y tế**: Chứng minh kết quả xét nghiệm

Với hướng dẫn này, bạn có thể triển khai và sử dụng hệ thống một cách hiệu quả!
