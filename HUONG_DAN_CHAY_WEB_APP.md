# HƯỚNG DẪN CHẠY HỆ THỐNG CUPROOF WEB APPLICATION

## Tổng quan

Hệ thống Cuproof Web Application bao gồm:
- **Cuproof Core**: Hệ thống zero-knowledge range proof (Rust)
- **Blockchain Integration**: Smart contracts trên Hardhat local network
- **Web Application**: Giao diện web với React.js

## Yêu cầu hệ thống

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

## Các bước chạy hệ thống

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

## Cách sử dụng ứng dụng

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

## Test Accounts

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

