# Cuproof Blockchain Integration

Hệ thống tích hợp blockchain cho Cuproof Range Proof System.

## Tổng quan

Dự án này cung cấp smart contracts và tools để tích hợp hệ thống Cuproof với blockchain Ethereum, cho phép:

- Lưu trữ và quản lý verification results trên blockchain
- Quản lý public parameters (g, h, n) cho hệ thống Cuproof
- Authorization và access control cho verifiers
- Audit trail và transparency cho tất cả operations

## Kiến trúc

### Smart Contracts

1. **CuproofVerifier**: Quản lý verification results và authorized verifiers
2. **CuproofRegistry**: Quản lý public parameters và versioning

### Workflow

```
Prover → Tạo Proof → Verifier Service → Verify Off-chain → 
Tạo Receipt + Ký → Submit to Blockchain → Store Hash/State
```

## Cài đặt và Chạy

### Yêu cầu
- Node.js 16+
- npm hoặc yarn
- Hardhat

### Cài đặt dependencies
```bash
npm install
```

### Compile contracts
```bash
npm run compile
```

### Chạy tests
```bash
npm test
```

### Deploy contracts

#### Local development
```bash
# Terminal 1: Start local blockchain
npm run node

# Terminal 2: Deploy contracts
npm run deploy:local
```

#### Hardhat network
```bash
npm run deploy:hardhat
```

## Smart Contracts

### CuproofVerifier

**Chức năng chính:**
- Quản lý authorized verifiers
- Lưu trữ verification results
- Xử lý proof submissions với signature verification
- Audit trail thông qua events

**Key Functions:**
- `addVerifier(address)`: Thêm authorized verifier
- `submitProofReceipt(...)`: Submit proof đã verify
- `verifyProofStatus(bytes32)`: Kiểm tra trạng thái proof
- `getSubjectLatestProof(address)`: Lấy proof mới nhất của subject

### CuproofRegistry

**Chức năng chính:**
- Quản lý public parameters (g, h, n)
- Versioning cho parameter sets
- Activation/deactivation của parameter sets

**Key Functions:**
- `updatePublicParams(...)`: Cập nhật parameters mới
- `activateParamSet(uint256)`: Kích hoạt parameter set
- `getCurrentParams()`: Lấy parameters hiện tại
- `getParamsHashById(uint256)`: Lấy hash của parameters

## Testing

### Chạy tất cả tests
```bash
npm test
```

### Chạy tests với verbose output
```bash
npm run test:verbose
```

### Test coverage
```bash
npm run coverage
```

## Scripts

### Available Scripts

- `npm run compile`: Compile smart contracts
- `npm run test`: Chạy tests
- `npm run deploy:local`: Deploy lên localhost network
- `npm run deploy:hardhat`: Deploy lên hardhat network
- `npm run node`: Start local blockchain node
- `npm run clean`: Clean build artifacts
- `npm run console`: Hardhat console

## Configuration

### Networks

Mặc định hỗ trợ:
- `hardhat`: Local hardhat network
- `localhost`: Local blockchain node

Để thêm networks khác, cập nhật `hardhat.config.js`:

```javascript
networks: {
  mainnet: {
    url: process.env.MAINNET_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
    gasPrice: 20000000000, // 20 gwei
  },
  goerli: {
    url: process.env.GOERLI_RPC_URL,
    accounts: [process.env.PRIVATE_KEY],
  }
}
```

## Deployment Info

Sau khi deploy, thông tin sẽ được lưu trong `deployment-info.json`:

```json
{
  "network": "localhost",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "contracts": {
    "CuproofRegistry": "0x...",
    "CuproofVerifier": "0x..."
  },
  "deployer": "0x...",
  "paramsHash": "0x..."
}
```

## Security

### Access Control
- Chỉ owner mới có thể thêm/xóa verifiers
- Chỉ authorized verifiers mới có thể submit proofs
- Signature verification cho tất cả submissions

### Replay Protection
- Nonce-based protection
- Deadline enforcement
- Duplicate proof detection

## Gas Optimization

- Solidity optimizer enabled với 200 runs
- Efficient storage patterns
- Event-based logging thay vì storage

## Troubleshooting

### Common Issues

1. **Compilation errors**: Kiểm tra Solidity version compatibility
2. **Deployment failures**: Đảm bảo có đủ ETH cho gas
3. **Test failures**: Kiểm tra network configuration

### Debug Commands

```bash
# Hardhat console để debug
npm run console

# Clean và rebuild
npm run clean
npm run compile
```

## Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push và tạo Pull Request

## License

MIT License - xem file LICENSE để biết thêm chi tiết.

## 🔗 Links

- [Cuproof Core Documentation](../README.md)
- [Blockchain Integration Guide](../blockchain_integration.md)
- [System Report](../BAO_CAO_CUPROOF.md)