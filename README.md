# Cuproof 256-bit - Range Proof System

Hệ thống chứng minh phạm vi (Range Proof) sử dụng Cuproof với modulus 256-bit, tương thích với EVM để verify trực tiếp on-chain.

## Cấu trúc thư mục

```
cuproof/
├── src_256/              # Source code Rust cho hệ thống 256-bit
│   ├── main.rs          # CLI entry point
│   ├── range_proof.rs   # Logic tạo proof
│   ├── verify.rs        # Logic verify off-chain
│   ├── evm.rs           # Export proof cho EVM
│   └── ...
├── cuproof-blockchain/  # Smart contracts và scripts
│   ├── contracts/
│   │   └── CuproofVerifier256.sol  # Contract verify on-chain
│   └── scripts/
│       ├── deploy-256.js    # Deploy contract
│       └── verify-256.js    # Verify proof on-chain
└── params.txt           # Public parameters (g, h, n)

```

## Hướng dẫn sử dụng

### Bước 1: Setup Parameters

Tạo public parameters (g, h, n) cho hệ thống 256-bit:

```bash
cargo run --bin cuproof256 -- setup 256 params.txt
```

**QUAN TRỌNG**: Sau khi tạo params, cần copy vào thư mục blockchain để đảm bảo đồng bộ:

```bash
# Copy params vào cuproof-blockchain để contract và proof dùng cùng params
cp params.txt cuproof-blockchain/params.txt
```

### Bước 2: Tạo Proof

Tạo proof cho giá trị `v` trong range `[a, b]`:

```bash
# Format: prove <params_path> <a_hex> <b_hex> <v_hex> <proof_path> [--json]
# Ví dụ: tạo proof cho v=42 trong range [1, 100]
cargo run --bin cuproof256 -- prove params.txt 0x1 0x64 0x2a proof.txt --json
```

Lệnh này sẽ tạo:
- `proof.txt`: Proof file gốc
- `proof_evm.json`: Proof ở format JSON cho EVM (tự động được tạo với `--json`)

### Bước 3: Verify Off-chain (Kiểm tra trước)

Verify proof off-chain để đảm bảo proof hợp lệ trước khi verify on-chain:

```bash
cargo run --bin cuproof256 -- verify params.txt 0x1 0x64 proof.txt
```

Kết quả mong đợi: `VALID`

### Bước 4: Chuẩn bị Proof cho On-chain

Copy proof JSON vào đúng vị trí:

```bash
# Copy proof_evm.json vào thư mục gốc (cùng cấp với params.txt)
# Script verify-256.js sẽ tìm file ở: ../../proof_evm.json (từ cuproof-blockchain/)
cp proof_evm.json ../proof_evm.json
```

**LƯU Ý**: Script `verify-256.js` sẽ tìm `proof_evm.json` ở thư mục gốc của project (cùng cấp với `params.txt`), không phải trong `cuproof-blockchain/`.

### Bước 5: Deploy Contract

Deploy contract `CuproofVerifier256` với params đã tạo:

```bash
cd cuproof-blockchain
npx hardhat run scripts/deploy-256.js --network hardhat
```

Contract sẽ được deploy với params từ `cuproof-blockchain/params.txt`. Đảm bảo file này đã được copy từ bước 1.

### Bước 6: Verify Proof On-chain

Verify proof trên blockchain:

```bash
# Đảm bảo đang ở thư mục cuproof-blockchain
cd cuproof-blockchain

# Đảm bảo proof_evm.json đã được copy vào thư mục gốc (cùng cấp với params.txt)
# Script sẽ tự động tìm file ở: ../../proof_evm.json

npx hardhat run scripts/verify-256.js --network hardhat
```

**Kết quả mong đợi**:
- Transaction sent: `0x...`
- Transaction confirmed in block: `X`
- Calculated proof hash: `0x...`
- Latest proof hash from contract: `0x...`
- Hash match: `true`
- Proof verified status (using latest hash): `true`
- SUCCESS: Proof has been verified and stored on-chain!

## Lưu ý quan trọng

### Đồng bộ Parameters

**VẤN ĐỀ THƯỜNG GẶP**: Lỗi "T1 commitment mismatch" xảy ra khi:
- Proof được tạo với params ở thư mục gốc
- Contract được deploy với params khác ở `cuproof-blockchain/params.txt`

**GIẢI PHÁP**: Luôn đảm bảo `params.txt` ở cả hai vị trí giống nhau:
```bash
# Sau khi tạo params, luôn copy vào blockchain
cp params.txt cuproof-blockchain/params.txt
```

### Thứ tự thực hiện

Để đảm bảo thành công, thực hiện theo đúng thứ tự:
1. Setup params → Copy vào blockchain
2. Tạo proof → Copy JSON vào đúng vị trí
3. Verify off-chain (kiểm tra)
4. Deploy contract
5. Verify on-chain

### Kiểm tra trước khi verify on-chain

Trước khi verify on-chain, luôn verify off-chain trước để đảm bảo proof hợp lệ:
```bash
cargo run --bin cuproof256 -- verify params.txt 0x1 0x64 proof.txt
```

Nếu off-chain verification fail, on-chain verification cũng sẽ fail.

## Tính năng

- Off-chain proof generation và verification
- On-chain native verification (không cần signature)
- 256-bit modulus tương thích với uint256 trong Solidity
- Export proof ở format JSON cho EVM
- Tự động tính lại T1, T2, t_hat, tau_x từ các giá trị đã modulo để đảm bảo consistency

## Yêu cầu

- Rust (cargo)
- Node.js
- Hardhat

## Troubleshooting

### Lỗi "T1 commitment mismatch"

**Nguyên nhân**: Params không đồng bộ hoặc proof được tạo với params khác với contract.

**Giải pháp**:
1. Kiểm tra params ở cả hai vị trí:
   ```bash
   diff params.txt cuproof-blockchain/params.txt
   ```
2. Nếu khác nhau, copy lại:
   ```bash
   cp params.txt cuproof-blockchain/params.txt
   ```
3. Tạo lại proof và deploy lại contract với params đúng.

### Lỗi "Missing proof JSON file"

**Nguyên nhân**: File `proof_evm.json` không ở đúng vị trí.

**Giải pháp**: Copy file vào thư mục gốc:
```bash
cp proof_evm.json ../proof_evm.json
```

### Transaction confirmed nhưng proof verified status: false

**Nguyên nhân**: Cách tính proof hash trong script không khớp với contract.

**Giải pháp**: Đã được sửa trong script `verify-256.js`. Nếu vẫn gặp lỗi, kiểm tra:
- Proof hash được tính đúng với struct Proof
- Latest hash từ contract khớp với calculated hash
