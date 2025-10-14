import React, { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Upload,
  FileText,
  Copy,
  Eye
} from 'lucide-react';
import { VerificationFormData, VerificationResult, CuproofCLIResult } from '../types';
import axios from 'axios';

interface ProofVerifierProps {
  userAddress: string;
  isAuthorizedVerifier: boolean;
}

export default function ProofVerifier({ userAddress, isAuthorizedVerifier }: ProofVerifierProps) {
  const [formData, setFormData] = useState<VerificationFormData>({
    proofHash: '',
    commitment: '',
    rangeMin: '',
    rangeMax: '',
    subject: ''
  });
  const [proofContent, setProofContent] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setProofContent(content);
        
        // Auto-fill proof hash
        const hash = generateProofHash(content);
        setFormData(prev => ({
          ...prev,
          proofHash: hash
        }));
        
        toast.success('Proof file loaded successfully');
      };
      reader.readAsText(file);
    }
  };

  const generateProofHash = (proofContent: string): string => {
    let hash = 0;
    for (let i = 0; i < proofContent.length; i++) {
      const char = proofContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  };

  const validateForm = (): boolean => {
    if (!formData.proofHash || !formData.commitment || !formData.subject) {
      toast.error('Please fill in all required fields');
      return false;
    }

    const rangeMin = parseInt(formData.rangeMin);
    const rangeMax = parseInt(formData.rangeMax);

    if (isNaN(rangeMin) || isNaN(rangeMax)) {
      toast.error('Please enter valid range values');
      return false;
    }

    if (rangeMin >= rangeMax) {
      toast.error('Range minimum must be less than maximum');
      return false;
    }

    return true;
  };

  const verifyProofOffChain = async (): Promise<CuproofCLIResult> => {
    if (!proofContent) {
      return {
        success: false,
        error: 'No proof content available for verification'
      };
    }

    // Validate required fields for verification
    if (!formData.commitment) {
      return {
        success: false,
        error: 'Commitment is required for verification'
      };
    }

    // Validate range values
    const rangeMin = parseInt(formData.rangeMin);
    const rangeMax = parseInt(formData.rangeMax);

    if (!formData.rangeMin || !formData.rangeMax) {
      return {
        success: false,
        error: 'Range minimum and maximum are required for verification'
      };
    }

    if (isNaN(rangeMin) || isNaN(rangeMax)) {
      return {
        success: false,
        error: 'Please enter valid range values'
      };
    }

    if (rangeMin >= rangeMax) {
      return {
        success: false,
        error: 'Range minimum must be less than maximum'
      };
    }

    try {
      const response = await axios.post('/api/cuproof/verify', {
        proofContent
      });
      return response.data;
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Verification failed'
      };
    }
  };

  const submitToBlockchain = async (isValid: boolean) => {
    if (!validateForm()) return;

    setIsSubmitting(true);
    try {
      const rangeMin = parseInt(formData.rangeMin);
      const rangeMax = parseInt(formData.rangeMax);
      const nonce = Date.now();
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now

      // Mock signature for demo
      const signature = '0x' + Math.random().toString(16).substr(2, 64);

      toast.loading('Submitting to blockchain...', { id: 'blockchain-submission' });

      const response = await axios.post('/api/blockchain/submit-proof', {
        subject: formData.subject,
        proofHash: formData.proofHash,
        commitment: formData.commitment,
        rangeMin,
        rangeMax,
        nonce,
        deadline,
        signature
      });

      if (response.data.success) {
        const result: VerificationResult = {
          isValid,
          proofHash: formData.proofHash,
          subject: formData.subject,
          rangeMin,
          rangeMax,
          timestamp: Math.floor(Date.now() / 1000),
          verifier: userAddress
        };

        setVerificationResult(result);
        toast.success('Proof submitted to blockchain successfully!', { id: 'blockchain-submission' });
      } else {
        toast.error(response.data.error || 'Failed to submit to blockchain', { id: 'blockchain-submission' });
      }

    } catch (error: any) {
      console.error('Blockchain submission error:', error);
      toast.error('An error occurred while submitting to blockchain', { id: 'blockchain-submission' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyAndSubmit = async () => {
    if (!isAuthorizedVerifier) {
      toast.error('You are not authorized to verify proofs');
      return;
    }

    setIsVerifying(true);
    try {
      // First verify off-chain
      const offChainResult = await verifyProofOffChain();
      
      if (offChainResult.success) {
        toast.success('Off-chain verification successful');
        
        // Then submit to blockchain
        await submitToBlockchain(true);
      } else {
        toast.error(`Verification failed: ${offChainResult.error}`);
        
        // Still submit to blockchain but mark as invalid
        await submitToBlockchain(false);
      }
    } catch (error: any) {
      console.error('Verification error:', error);
      toast.error('An error occurred during verification');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyProofHash = () => {
    navigator.clipboard.writeText(formData.proofHash);
    toast.success('Proof hash copied to clipboard');
  };

  const copyCommitment = () => {
    navigator.clipboard.writeText(formData.commitment);
    toast.success('Commitment copied to clipboard');
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Verify Proof</h2>
        <Shield className="w-6 h-6 text-gray-600" />
      </div>

      {!isAuthorizedVerifier && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800">
              You are not authorized to verify proofs. Only authorized verifiers can submit verification results.
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Proof File
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="input-field"
              disabled={isVerifying || isSubmitting}
            />
            <div className="text-sm text-gray-500">
              Upload the proof file generated by the prover
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Proof Hash *
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              name="proofHash"
              value={formData.proofHash}
              onChange={handleInputChange}
              placeholder="Enter proof hash"
              className="input-field font-mono text-sm"
              disabled={isVerifying || isSubmitting}
            />
            <button
              onClick={copyProofHash}
              className="text-gray-400 hover:text-gray-600"
              disabled={!formData.proofHash}
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Commitment *
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              name="commitment"
              value={formData.commitment}
              onChange={handleInputChange}
              placeholder="Enter commitment value"
              className="input-field font-mono text-sm"
              disabled={isVerifying || isSubmitting}
            />
            <button
              onClick={copyCommitment}
              className="text-gray-400 hover:text-gray-600"
              disabled={!formData.commitment}
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Prover Address *
          </label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleInputChange}
            placeholder="Enter subject's wallet address"
            className="input-field font-mono text-sm"
            disabled={isVerifying || isSubmitting}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Range Minimum
            </label>
            <input
              type="number"
              name="rangeMin"
              value={formData.rangeMin}
              onChange={handleInputChange}
              placeholder="Min value"
              className="input-field"
              disabled={isVerifying || isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Range Maximum
            </label>
            <input
              type="number"
              name="rangeMax"
              value={formData.rangeMax}
              onChange={handleInputChange}
              placeholder="Max value"
              className="input-field"
              disabled={isVerifying || isSubmitting}
            />
          </div>
        </div>

        <button
          onClick={verifyAndSubmit}
          disabled={!isAuthorizedVerifier || isVerifying || isSubmitting}
          className="btn-primary w-full flex items-center justify-center"
        >
          {isVerifying || isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {isVerifying ? 'Verifying...' : 'Submitting...'}
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Verify & Submit
            </>
          )}
        </button>
      </div>

      {verificationResult && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Verification Result</h3>
            <div className={`status-badge ${verificationResult.isValid ? 'status-verified' : 'status-error'}`}>
              {verificationResult.isValid ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Verified
                </>
              ) : (
                <>
                  <XCircle className="w-3 h-3 mr-1" />
                  Invalid
                </>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Subject:</span>
                <div className="font-mono text-sm">{formatAddress(verificationResult.subject)}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Verifier:</span>
                <div className="font-mono text-sm">{formatAddress(verificationResult.verifier)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-sm font-medium text-gray-700">Range:</span>
                <div className="text-sm">{verificationResult.rangeMin} - {verificationResult.rangeMax}</div>
              </div>
              <div>
                <span className="text-sm font-medium text-gray-700">Timestamp:</span>
                <div className="text-sm">{formatTimestamp(verificationResult.timestamp)}</div>
              </div>
            </div>

            <div>
              <span className="text-sm font-medium text-gray-700">Proof Hash:</span>
              <div className="font-mono text-xs break-all">{verificationResult.proofHash}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
