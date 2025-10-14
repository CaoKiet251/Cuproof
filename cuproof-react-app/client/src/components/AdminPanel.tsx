import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Settings, 
  Shield, 
  Users, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Plus,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';

export default function AdminPanel() {
  const [contractInfo, setContractInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [verifiers, setVerifiers] = useState<string[]>([]);
  const [newVerifierAddress, setNewVerifierAddress] = useState('');
  const [systemStatus, setSystemStatus] = useState<any>(null);

  useEffect(() => {
    loadContractInfo();
    loadSystemStatus();
  }, []);

  const loadContractInfo = async () => {
    try {
      const response = await axios.get('/api/blockchain/contract-info');
      if (response.data.success) {
        setContractInfo(response.data.info);
      }
    } catch (error) {
      console.error('Failed to load contract info:', error);
    }
  };

  const loadSystemStatus = async () => {
    setIsLoading(true);
    try {
      const [cuproofStatus, contractInfo] = await Promise.all([
        axios.get('/api/cuproof/status'),
        axios.get('/api/blockchain/contract-info')
      ]);

      setSystemStatus({
        cuproofCLI: cuproofStatus.data.available,
        blockchain: contractInfo.data.success,
        contracts: contractInfo.data.success
      });

      // Mock verifiers for demo
      setVerifiers([
        '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
        '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC'
      ]);

    } catch (error) {
      console.error('Failed to load system status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addVerifier = async () => {
    if (!newVerifierAddress) {
      toast.error('Please enter a verifier address');
      return;
    }

    try {
      // In a real implementation, this would call the smart contract
      setVerifiers(prev => [...prev, newVerifierAddress]);
      setNewVerifierAddress('');
      toast.success('Verifier added successfully');
    } catch (error) {
      toast.error('Failed to add verifier');
    }
  };

  const removeVerifier = async (address: string) => {
    try {
      // In a real implementation, this would call the smart contract
      setVerifiers(prev => prev.filter(addr => addr !== address));
      toast.success('Verifier removed successfully');
    } catch (error) {
      toast.error('Failed to remove verifier');
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getStatusIcon = (status: boolean) => {
    return status ? (
      <CheckCircle className="w-4 h-4 text-green-600" />
    ) : (
      <XCircle className="w-4 h-4 text-red-600" />
    );
  };

  return (
    <div className="space-y-6">
      {/* System Status */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">System Status</h2>
          {/* <button
            onClick={loadSystemStatus}
            disabled={isLoading}
            className="btn-secondary flex items-center"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button> */}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-green-900">Cuproof CLI</h3>
                <p className="text-sm text-green-800">
                  {systemStatus?.cuproofCLI ? 'Available' : 'Not Available'}
                </p>
              </div>
              {getStatusIcon(systemStatus?.cuproofCLI || false)}
            </div>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-blue-900">Blockchain</h3>
                <p className="text-sm text-blue-800">
                  {systemStatus?.blockchain ? 'Connected' : 'Disconnected'}
                </p>
              </div>
              {getStatusIcon(systemStatus?.blockchain || false)}
            </div>
          </div>

          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-purple-900">Contracts</h3>
                <p className="text-sm text-purple-800">
                  {systemStatus?.contracts ? 'Deployed' : 'Not Deployed'}
                </p>
              </div>
              {getStatusIcon(systemStatus?.contracts || false)}
            </div>
          </div>
        </div>
      </div>

      {/* Contract Information */}
      {/* {contractInfo && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Contract Information</h2>
            <Settings className="w-6 h-6 text-gray-600" />
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-sm font-medium text-gray-700">Contract Address:</span>
              <div className="font-mono text-sm">{formatAddress(contractInfo.address)}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Owner:</span>
              <div className="font-mono text-sm">{formatAddress(contractInfo.owner)}</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Public Params Hash:</span>
              <div className="font-mono text-sm">{contractInfo.publicParamsHash.slice(0, 10)}...</div>
            </div>
          </div>
        </div>
      )} */}

      {/* Verifier Management */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Verifier Management</h2>
          {/* <Users className="w-6 h-6 text-gray-600" /> */}
        </div>

        {/* Add New Verifier */}
        {/* <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Add New Verifier</h3>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newVerifierAddress}
              onChange={(e) => setNewVerifierAddress(e.target.value)}
              placeholder="Enter verifier address (0x...)"
              className="input-field flex-1 font-mono text-sm"
            />
            <button
              onClick={addVerifier}
              className="btn-primary flex items-center"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </button>
          </div>
        </div> */}

        {/* Verifier List */}
        <div>
          <h3 className="font-medium text-gray-900 mb-3">Authorized Verifiers</h3>
          <div className="space-y-2">
            {verifiers.map((address, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Shield className="w-4 h-4 text-blue-600" />
                  <span className="font-mono text-sm">{(address)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.open(`https://etherscan.io/address/${address}`, '_blank')}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  {/* <button
                    onClick={() => removeVerifier(address)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button> */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Information */}
      {/* <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">System Information</h2>
          <Settings className="w-6 h-6 text-gray-600" />
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-700">Network:</span>
              <div className="text-sm">Hardhat Local</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Chain ID:</span>
              <div className="text-sm">31337</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm font-medium text-gray-700">RPC URL:</span>
              <div className="text-sm font-mono">http://localhost:8545</div>
            </div>
            <div>
              <span className="text-sm font-medium text-gray-700">Environment:</span>
              <div className="text-sm">Development</div>
            </div>
          </div>
        </div>
      </div> */}
    </div>
  );
}
