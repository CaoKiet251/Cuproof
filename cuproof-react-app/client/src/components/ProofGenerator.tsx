import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { 
  FileText, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Download,
  Eye,
  Copy
} from 'lucide-react';
import { ProofFormData, CuproofCLIResult } from '../types';
import axios from 'axios';

interface ProofGeneratorProps {
  userAddress: string;
  onProofGenerated: (proof: string, proofHash: string) => void;
}

export default function ProofGenerator({ userAddress, onProofGenerated }: ProofGeneratorProps) {
  const [formData, setFormData] = useState<ProofFormData>({
    value: '',
    rangeMin: '',
    rangeMax: '',
    description: ''
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProof, setGeneratedProof] = useState<string>('');
  const [proofHash, setProofHash] = useState<string>('');
  const [commitment, setCommitment] = useState<string>('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = (): boolean => {
    const value = parseInt(formData.value);
    const rangeMin = parseInt(formData.rangeMin);
    const rangeMax = parseInt(formData.rangeMax);

    if (!formData.value || !formData.rangeMin || !formData.rangeMax) {
      toast.error('Please fill in all required fields');
      return false;
    }

    if (isNaN(value) || isNaN(rangeMin) || isNaN(rangeMax)) {
      toast.error('Please enter valid numbers');
      return false;
    }

    if (value < rangeMin || value > rangeMax) {
      toast.error('Value must be within the range');
      return false;
    }

    if (rangeMin >= rangeMax) {
      toast.error('Range minimum must be less than maximum');
      return false;
    }

    return true;
  };

  const generateProof = async () => {
    if (!validateForm()) return;

    setIsGenerating(true);
    try {
      const value = parseInt(formData.value);
      const rangeMin = parseInt(formData.rangeMin);
      const rangeMax = parseInt(formData.rangeMax);

      toast.loading('Generating proof...', { id: 'proof-generation' });

      // Call backend API
      const response = await axios.post('/api/cuproof/generate', {
        value,
        rangeMin,
        rangeMax
      });

      const result: CuproofCLIResult = response.data;

      if (result.success && result.proof) {
        const hash = generateProofHash(result.proof);
        const extractedCommitment = extractCommitment(result.proof);
        setGeneratedProof(result.proof);
        setProofHash(hash);
        setCommitment(extractedCommitment);
        onProofGenerated(result.proof, hash);
        
        toast.success('Proof generated successfully!', { id: 'proof-generation' });
      } else {
        toast.error(result.error || 'Failed to generate proof', { id: 'proof-generation' });
      }
    } catch (error: any) {
      console.error('Proof generation error:', error);
      toast.error('An error occurred while generating proof', { id: 'proof-generation' });
    } finally {
      setIsGenerating(false);
    }
  };

  const generateProofHash = (proofContent: string): string => {
    // Simple hash generation - in production, use a proper crypto library
    let hash = 0;
    for (let i = 0; i < proofContent.length; i++) {
      const char = proofContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  };

  const extractCommitment = (proofContent: string): string => {
    // Extract commitment from proof content
    // The commitment is typically the first line or first few characters
    const lines = proofContent.trim().split('\n');
    if (lines.length > 0) {
      // Take the first line as commitment (this is a simplified approach)
      return lines[0].trim();
    }
    return '';
  };

  const downloadProof = () => {
    if (!generatedProof) return;

    const blob = new Blob([generatedProof], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cuproof-${proofHash.slice(0, 8)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Proof downloaded');
  };

  const copyProof = () => {
    if (!generatedProof) return;
    navigator.clipboard.writeText(generatedProof);
    toast.success('Proof copied to clipboard');
  };

  const copyProofHash = () => {
    if (!proofHash) return;
    navigator.clipboard.writeText(proofHash);
    toast.success('Proof hash copied to clipboard');
  };

  const copyCommitment = () => {
    if (!commitment) return;
    navigator.clipboard.writeText(commitment);
    toast.success('Commitment copied to clipboard');
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Generate Proof</h2>
        <FileText className="w-6 h-6 text-gray-600" />
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Secret Value *
          </label>
          <input
            type="number"
            name="value"
            value={formData.value}
            onChange={handleInputChange}
            placeholder="Enter the value you want to prove (e.g., 85)"
            className="input-field"
            disabled={isGenerating}
          />
          <p className="text-xs text-gray-500 mt-1">
            The actual value that will be kept secret
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Range Minimum *
            </label>
            <input
              type="number"
              name="rangeMin"
              value={formData.rangeMin}
              onChange={handleInputChange}
              placeholder="Min (e.g., 80)"
              className="input-field"
              disabled={isGenerating}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Range Maximum *
            </label>
            <input
              type="number"
              name="rangeMax"
              value={formData.rangeMax}
              onChange={handleInputChange}
              placeholder="Max (e.g., 90)"
              className="input-field"
              disabled={isGenerating}
            />
          </div>
        </div>

        {/* <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description (Optional)
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            placeholder="Describe what this proof represents (e.g., 'Math score for semester 1')"
            className="input-field h-20 resize-none"
            disabled={isGenerating}
          />
        </div> */}

        <button
          onClick={generateProof}
          disabled={isGenerating}
          className="btn-primary w-full flex items-center justify-center"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Proof...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Generate Proof
            </>
          )}
        </button>
      </div>

      {generatedProof && (
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Generated Proof</h3>
            <div className="flex space-x-2">
              {/* <button
                onClick={copyProof}
                className="btn-secondary flex items-center"
              >
                <Copy className="w-4 h-4 mr-1" />
                Copy
              </button> */}
              <button
                onClick={downloadProof}
                className="btn-secondary flex items-center"
              >
                <Download className="w-4 h-4 mr-1" />
                Download
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Commitment
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={commitment}
                  readOnly
                  className="input-field font-mono text-sm"
                  placeholder="Commitment will appear here..."
                />
                <button
                  onClick={copyCommitment}
                  className="text-gray-400 hover:text-gray-600"
                  disabled={!commitment}
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proof Hash
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={proofHash}
                  readOnly
                  className="input-field font-mono text-sm"
                />
                <button
                  onClick={copyProofHash}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proof Content
              </label>
              <textarea
                value={generatedProof}
                readOnly
                className="input-field h-32 font-mono text-xs resize-none"
              />
            </div>

            <div className="flex items-center space-x-2 text-sm text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span>Proof generated successfully and ready for verification</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
