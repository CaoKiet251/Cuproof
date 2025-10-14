# HƯỚNG DẪN CHẠY HỆ THỐNG CUPROOF WEB APPLICATION

## 🎯 Tổng quan

Hệ thống Cuproof Web Application bao gồm:
- **Cuproof Core**: Hệ thống zero-knowledge range proof (Rust)
- **Blockchain Integration**: Smart contracts trên Hardhat local network
- **Web Application**: Giao diện web với Next.js

## 📋 Yêu cầu hệ thống

### Phần mềm cần thiết:
1. **Node.js** (v16 trở lên)
2. **Rust** (để compile Cuproof CLI)
3. **MetaMask** browser extension
4. **Git** (để clone repository)

### Cấu trúc thư mục:
```
cuproof/
├── cuproof-blockchain/     # Smart contracts và Hardhat
├── cuproof-web-app/        # Web application
├── src/                    # Cuproof core (Rust)
└── target/                 # Compiled Cuproof CLI
```

## 🚀 Các bước chạy hệ thống

### Bước 1: Chuẩn bị Cuproof CLI

```bash
# Di chuyển đến thư mục gốc
cd D:\HK2_2024\DA\cuproof

# Compile Cuproof CLI
cargo build --release

# Kiểm tra Cuproof CLI
./target/release/cuproof.exe --version
```

### Bước 2: Khởi động Blockchain Network

```bash
# Di chuyển đến thư mục blockchain
cd cuproof-blockchain

# Cài đặt dependencies (nếu chưa có)
npm install

# Compile contracts
npm run compile

# Khởi động Hardhat node (Terminal 1)
npm run node
```

**Lưu ý**: Giữ terminal này mở, Hardhat node sẽ chạy trên `http://localhost:8545`

### Bước 3: Deploy Smart Contracts

```bash
# Mở Terminal 2 mới
cd cuproof-blockchain

# Deploy contracts với setup đầy đủ
npm run deploy:setup
```

Script này sẽ:
- Deploy CuproofRegistry và CuproofVerifier contracts
- Thêm authorized verifiers
- Tạo file `.env.local` cho web app
- Lưu thông tin deployment

### Bước 4: Cài đặt và chạy Web Application

```bash
# Mở Terminal 3 mới
cd cuproof-web-app

# Cài đặt dependencies
npm install

# Chạy web application
npm run dev
```

Web app sẽ chạy trên `http://localhost:3000`

### Bước 5: Cấu hình MetaMask

1. **Mở MetaMask** trong browser
2. **Thêm network mới**:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://localhost:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`

3. **Import test accounts**:
   - Mở MetaMask Settings → Security & Privacy → Reveal Seed Phrase
   - Import account với seed phrase: `test test test test test test test test test test test junk`
   - Hoặc import private keys từ Hardhat accounts

## 🎮 Cách sử dụng ứng dụng

### Cho chủ sở hữu văn bằng (Students):

1. **Kết nối ví**: Click "Connect Wallet" và chọn account
2. **Tạo proof**:
   - Nhập điểm số bí mật (ví dụ: 85)
   - Nhập khoảng điểm (ví dụ: 80-90)
   - Thêm mô tả (tùy chọn)
   - Click "Generate Proof"
3. **Chia sẻ proof**: Copy hoặc download file proof để gửi cho verifier

### Cho người xác minh (Verifiers):

1. **Kết nối ví**: Phải là authorized verifier address
2. **Xác minh proof**:
   - Upload file proof từ student
   - Điền thông tin commitment, range, subject address
   - Click "Verify & Submit"
3. **Kết quả**: Verification result được lưu trên blockchain

### Cho chủ sở hữu contract (Owner):

1. **Admin Panel**: Truy cập tab "Admin Panel"
2. **Quản lý verifiers**: Thêm/xóa authorized verifiers
3. **Theo dõi hệ thống**: Xem trạng thái contracts và parameters

## 🔧 Troubleshooting

### Lỗi thường gặp:

#### 1. "MetaMask not installed"
- **Giải pháp**: Cài đặt MetaMask extension cho browser

#### 2. "Contract not deployed"
- **Giải pháp**: 
  ```bash
  cd cuproof-blockchain
  npm run deploy:setup
  ```

#### 3. "Cuproof CLI not found"
- **Giải pháp**:
  ```bash
  cd ..
  cargo build --release
  ```

#### 4. "Hardhat blockchain not running"
- **Giải pháp**:
  ```bash
  cd cuproof-blockchain
  npm run node
  ```

#### 5. "Unauthorized verifier"
- **Giải pháp**: 
  - Kết nối với authorized verifier address
  - Hoặc owner phải thêm address của bạn làm verifier

#### 6. "Transaction failed"
- **Giải pháp**:
  - Kiểm tra MetaMask connection
  - Đảm bảo có đủ ETH balance
  - Kiểm tra network settings

### Debug mode:

Thêm vào `.env.local`:
```env
NEXT_PUBLIC_DEBUG=true
```

## 📊 Test Accounts

Sau khi deploy, bạn có các test accounts:

```
Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
Verifier 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
Verifier 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
Subject 1: 0x90F79bf6EB2c4f870365E785982E1f101E93b906
Subject 2: 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65
```

**Private Keys** (chỉ dùng cho development):
```
0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

## 🎯 Workflow hoàn chỉnh

### Scenario: Student chứng minh điểm số

1. **Student** (Subject 1):
   - Kết nối ví với Subject 1 address
   - Tạo proof cho điểm 85 trong khoảng [80, 90]
   - Download proof file

2. **Verifier** (Verifier 1):
   - Kết nối ví với Verifier 1 address
   - Upload proof file từ student
   - Điền thông tin và verify
   - Submit kết quả lên blockchain

3. **Kiểm tra kết quả**:
   - Proof được lưu trên blockchain
   - Có thể query verification status
   - Audit trail đầy đủ

## 🚀 Production Deployment

Để deploy lên production:

1. **Chọn network**: Mainnet, Polygon, BSC, etc.
2. **Update configuration**: 
   - `hardhat.config.js` - thêm production network
   - `.env.local` - update contract addresses
3. **Deploy contracts**: `npm run deploy:mainnet`
4. **Update web app**: Rebuild và deploy lên Vercel/Netlify
5. **Security audit**: Audit smart contracts trước khi deploy

## 📞 Hỗ trợ

Nếu gặp vấn đề:

1. Kiểm tra console logs trong browser
2. Kiểm tra terminal logs
3. Verify tất cả prerequisites đã được cài đặt
4. Đảm bảo tất cả services đang chạy

**Happy coding! 🎉**
