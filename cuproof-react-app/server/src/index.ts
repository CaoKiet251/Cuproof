import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';
import { CuproofService } from './services/cuproof-service';
import { BlockchainService } from './services/blockchain-service';
import { errorHandler } from './middleware/error-handler';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize services
const cuproofService = new CuproofService();
const blockchainService = new BlockchainService();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(limiter);
app.use(morgan('combined'));
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Cuproof API endpoints
app.post('/api/cuproof/generate', async (req, res) => {
  try {
    const { value, rangeMin, rangeMax } = req.body;
    
    if (!value || !rangeMin || !rangeMax) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters: value, rangeMin, rangeMax' 
      });
    }

    const result = await cuproofService.generateProof(value, rangeMin, rangeMax);
    res.json(result);
  } catch (error: any) {
    console.error('Generate proof error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

app.post('/api/cuproof/verify', async (req, res) => {
  try {
    const { proofContent } = req.body;
    
    if (!proofContent) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing proofContent parameter' 
      });
    }

    const result = await cuproofService.verifyProof(proofContent);
    res.json(result);
  } catch (error: any) {
    console.error('Verify proof error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

app.post('/api/cuproof/setup', async (req, res) => {
  try {
    const { mode = 'fast' } = req.body;
    
    const result = await cuproofService.setupParameters(mode);
    res.json(result);
  } catch (error: any) {
    console.error('Setup parameters error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

app.get('/api/cuproof/status', async (req, res) => {
  try {
    const isAvailable = await cuproofService.isAvailable();
    res.json({ 
      success: true, 
      available: isAvailable,
      message: isAvailable ? 'Cuproof CLI is available' : 'Cuproof CLI not found'
    });
  } catch (error: any) {
    console.error('Status check error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Blockchain API endpoints
app.post('/api/blockchain/submit-proof', async (req, res) => {
  try {
    const { 
      subject, 
      proofHash, 
      commitment, 
      rangeMin, 
      rangeMax, 
      nonce, 
      deadline, 
      signature 
    } = req.body;
    
    if (!subject || !proofHash || !commitment || !signature) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required parameters' 
      });
    }

    const result = await blockchainService.submitProofReceipt(
      subject, proofHash, commitment, rangeMin, rangeMax, nonce, deadline, signature
    );
    res.json(result);
  } catch (error: any) {
    console.error('Submit proof error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

app.get('/api/blockchain/proof-status/:proofHash', async (req, res) => {
  try {
    const { proofHash } = req.params;
    
    const result = await blockchainService.verifyProofStatus(proofHash);
    res.json(result);
  } catch (error: any) {
    console.error('Proof status error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

app.get('/api/blockchain/proof-info/:proofHash', async (req, res) => {
  try {
    const { proofHash } = req.params;
    
    const result = await blockchainService.getProofInfo(proofHash);
    res.json(result);
  } catch (error: any) {
    console.error('Proof info error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

app.get('/api/blockchain/contract-info', async (req, res) => {
  try {
    const result = await blockchainService.getContractInfo();
    res.json(result);
  } catch (error: any) {
    console.error('Contract info error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Internal server error' 
    });
  }
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found' 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Cuproof Server running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔗 API base URL: http://localhost:${PORT}/api`);
});

export default app;
