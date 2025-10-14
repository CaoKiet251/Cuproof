# Cuproof React Application

A complete web application for the Cuproof zero-knowledge range proof system built with React.js and Node.js.

## Important Notice

**CRITICAL ISSUES IDENTIFIED:**
- The underlying Cuproof CLI has serious bugs in both proof generation and verification
- Verification logic always returns "VALID" even for invalid proofs
- Proof generation panics with "square root is imaginary" for most input values
- These are core Rust application issues, not web application problems

## Architecture

- **Frontend**: React.js with Vite build tool
- **Backend**: Node.js with Express.js
- **Blockchain**: Hardhat local network
- **CLI Integration**: Cuproof Rust CLI (⚠️ has known issues)

## Project Structure

```
cuproof-react-app/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── types/         # TypeScript types
│   │   ├── App.tsx        # Main app component
│   │   └── main.tsx       # Entry point
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Node.js backend
│   ├── src/
│   │   ├── services/      # Business logic
│   │   ├── middleware/    # Express middleware
│   │   └── index.ts       # Server entry point
│   └── package.json
└── package.json           # Root package.json
```

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MetaMask browser extension
- Cuproof CLI compiled

### Installation

```bash
# Clone and navigate to project
cd cuproof-react-app

# Install all dependencies
npm run install-all

# Or install manually:
npm install
cd client && npm install
cd ../server && npm install
```

### Running the Application

#### Option 1: Run everything together
```bash
npm run dev
```

#### Option 2: Run separately
```bash
# Terminal 1: Start backend server
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

### Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## Configuration

### Environment Variables

Create `.env` file in server directory:
```env
PORT=3001
NODE_ENV=development
CLIENT_URL=http://localhost:3000
CUPROOF_VERIFIER_ADDRESS=0x...
CUPROOF_REGISTRY_ADDRESS=0x...
```

### Blockchain Setup

1. **Start Hardhat node**:
   ```bash
   cd ../cuproof-blockchain
   npm run node
   ```

2. **Deploy contracts**:
   ```bash
   npm run deploy:setup
   ```

3. **Update contract addresses** in server `.env` file

## Features

### Frontend (React.js)
- **Wallet Connection**: MetaMask integration
- **Proof Generation**: Create zero-knowledge proofs
- **Proof Verification**: Verify proofs from others
- **Admin Panel**: Manage system settings
- **Responsive Design**: Mobile-friendly interface

### Backend (Node.js)
- **REST API**: Express.js server
- **Cuproof Integration**: CLI service integration
- **Blockchain Service**: Smart contract interaction
- **Error Handling**: Comprehensive error management
- **Rate Limiting**: API protection

## API Endpoints

### Cuproof Endpoints
- `POST /api/cuproof/generate` - Generate proof
- `POST /api/cuproof/verify` - Verify proof
- `POST /api/cuproof/setup` - Setup parameters
- `GET /api/cuproof/status` - Check CLI availability

### Blockchain Endpoints
- `POST /api/blockchain/submit-proof` - Submit to blockchain
- `GET /api/blockchain/proof-status/:hash` - Check proof status
- `GET /api/blockchain/proof-info/:hash` - Get proof details
- `GET /api/blockchain/contract-info` - Get contract info

##  Usage Guide

### For Students (Proof Generators)
1. Connect MetaMask wallet
2. Navigate to "Generate Proof" tab
3. Enter secret value and range
4. Click "Generate Proof"
5. Download or copy proof file

### For Verifiers
1. Connect authorized verifier wallet
2. Navigate to "Verify Proof" tab
3. Upload proof file from student
4. Fill verification details
5. Submit to blockchain

### For Administrators
1. Connect owner wallet
2. Navigate to "Admin Panel"
3. Manage verifiers and settings
4. Monitor system status

## Security Features

- **Rate Limiting**: Prevent API abuse
- **CORS Protection**: Secure cross-origin requests
- **Input Validation**: Sanitize all inputs
- **Error Handling**: No sensitive data leakage
- **Helmet.js**: Security headers

## Testing

```bash
# Test backend
cd server
npm test

# Test frontend
cd client
npm run test
```

## Build & Deploy

### Development Build
```bash
npm run build
```

### Production Deployment
```bash
# Build frontend
cd client
npm run build

# Start production server
cd ../server
npm start
```



### Web Application Status
 **Working Features:**
- MetaMask wallet integration
- User role detection (owner/verifier/subject)
- Blockchain contract interaction
- File upload/download
- UI/UX components
- API endpoints



### Common Issues

1. **"Cuproof CLI not found"**
   - Ensure Cuproof is compiled: `cargo build --release`
   - Check path in `server/src/services/cuproof-service.ts`

2. **"Cannot connect to blockchain"**
   - Start Hardhat node: `npm run node`
   - Check RPC URL in configuration

3. **"Contract not deployed"**
   - Deploy contracts: `npm run deploy:setup`
   - Update addresses in `.env` file

4. **"CORS errors"**
   - Check `CLIENT_URL` in server `.env`
   - Ensure frontend runs on correct port

5. **"Square root is imaginary" panic**
   - This is a known CLI issue
   - Use only small integer values (1-10)
   - Consider this a limitation of the current implementation

### Debug Mode
Set `NODE_ENV=development` for detailed error messages.

