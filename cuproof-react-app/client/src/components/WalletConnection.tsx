import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-hot-toast';
import { 
  Wallet, 
  User, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Copy,
  ExternalLink
} from 'lucide-react';
import { UserRole } from '../types';

interface WalletConnectionProps {
  onUserRoleChange: (role: UserRole) => void;
  userRole: UserRole | null;
}

export default function WalletConnection({ onUserRoleChange, userRole }: WalletConnectionProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [account, setAccount] = useState<string>('');
  const [balance, setBalance] = useState<string>('');
  const [isOwner, setIsOwner] = useState(false);
  const [isVerifier, setIsVerifier] = useState(false);
  const [contractInfo, setContractInfo] = useState<any>(null);
  const [networkInfo, setNetworkInfo] = useState<any>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);

  // Network configuration for Hardhat local
  const TARGET_NETWORK = {
    chainId: '0x7A69', // 31337 in hex
    chainName: 'Hardhat Local',
    nativeCurrency: {
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
    },
    rpcUrls: ['http://localhost:8545'],
    blockExplorerUrls: ['']
  };

  // Helper function to safely check for MetaMask
  const isMetaMaskInstalled = (): boolean => {
    return typeof window !== 'undefined' && 
           typeof window.ethereum !== 'undefined' && 
           window.ethereum.isMetaMask === true;
  };

  useEffect(() => {
    const initializeWallet = async () => {
      await checkNetwork();
      await checkConnection();
    };
    
    initializeWallet();
    
    if (isMetaMaskInstalled()) {
      window.ethereum!.on('accountsChanged', handleAccountsChanged);
      window.ethereum!.on('chainChanged', handleChainChanged);
    }
    return () => {
      if (isMetaMaskInstalled()) {
        window.ethereum!.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum!.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const checkConnection = async () => {
    if (isMetaMaskInstalled()) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum!);
        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    }
  };

  const checkNetwork = async () => {
    if (!isMetaMaskInstalled()) return false;
    
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum!);
      const network = await provider.getNetwork();
      const isCorrect = network.chainId === 31337;
      setIsCorrectNetwork(isCorrect);
      
      setNetworkInfo({
        chainId: network.chainId,
        name: network.name,
        isCorrect
      });
      
      return isCorrect;
    } catch (error) {
      console.error('Error checking network:', error);
      return false;
    }
  };

  const switchToCorrectNetwork = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask not installed');
      return;
    }

    try {
      await window.ethereum!.request({
        method: 'wallet_addEthereumChain',
        params: [TARGET_NETWORK],
      });
      
      toast.success('Network switched successfully');
      await checkNetwork();
    } catch (error: any) {
      console.error('Error switching network:', error);
      if (error.code === 4902) {
        // Network doesn't exist, try to add it
        try {
          await window.ethereum!.request({
            method: 'wallet_addEthereumChain',
            params: [TARGET_NETWORK],
          });
          toast.success('Network added and switched successfully');
          await checkNetwork();
        } catch (addError: any) {
          toast.error('Failed to add network: ' + addError.message);
        }
      } else {
        toast.error('Failed to switch network: ' + error.message);
      }
    }
  };

  const connectWallet = async () => {
    if (!isMetaMaskInstalled()) {
      toast.error('MetaMask not installed');
      return;
    }

    setIsConnecting(true);
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum!);
      await provider.send('eth_requestAccounts', []);
      
      // Check if we're on the correct network
      const isCorrectNetwork = await checkNetwork();
      if (!isCorrectNetwork) {
        toast.error('Please switch to Hardhat Local network (Chain ID: 31337)');
        setIsConnecting(false);
        return;
      }
      
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      const balance = await provider.getBalance(address);
      
      setAccount(address);
      setBalance(ethers.utils.formatEther(balance));
      
      // Check user roles and get the result
      const { isOwnerResult, isVerifierResult } = await checkUserRoles(address, provider);
      
      // Update user role based on the actual results
      const role: UserRole = {
        type: isOwnerResult ? 'owner' : isVerifierResult ? 'verifier' : 'subject',
        address,
        isConnected: true
      };
      
      console.log('WalletConnection: Setting user role:', role);
      onUserRoleChange(role);
      
      toast.success('Wallet connected successfully');
    } catch (error: any) {
      console.error('Connection error:', error);
      toast.error(error.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const checkUserRoles = async (address: string, provider: ethers.providers.Provider) => {
    try {
      // For now, we'll use mock data since we don't have contract addresses yet
      // In a real implementation, you would call the smart contract
      
      console.log('Checking user roles for address:', address);
      console.log('Expected owner address:', '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266');
      
      // Mock owner check
      const isOwnerCheck = address.toLowerCase() === '0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266';
      console.log('Is owner check result:', isOwnerCheck);
      
      // Mock verifier check
      const verifierAddresses = [
        '0x70997970c51812dc3a010c7d01b50e0d17dc79c8',
        '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc'
      ];
      const isVerifierCheck = verifierAddresses.includes(address.toLowerCase());
      console.log('Is verifier check result:', isVerifierCheck);
      
      // Update state synchronously
      setIsOwner(isOwnerCheck);
      setIsVerifier(isVerifierCheck);
      
      setContractInfo({
        owner: '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266',
        publicParamsHash: '0x1234...5678'
      });
      
      // Return the results for immediate use
      return {
        isOwnerResult: isOwnerCheck,
        isVerifierResult: isVerifierCheck
      };
      
    } catch (error) {
      console.error('Error checking user roles:', error);
      return {
        isOwnerResult: false,
        isVerifierResult: false
      };
    }
  };

  const disconnectWallet = () => {
    setAccount('');
    setBalance('');
    setIsOwner(false);
    setIsVerifier(false);
    setContractInfo(null);
    
    const role: UserRole = {
      type: 'subject',
      address: '',
      isConnected: false
    };
    onUserRoleChange(role);
    
    toast.success('Wallet disconnected');
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      connectWallet();
    }
  };

  const handleChainChanged = async (chainId: string) => {
    // Check if the new chain is correct
    await checkNetwork();
    
    // If wallet is connected and network is wrong, show warning
    if (account && !isCorrectNetwork) {
      toast.error('Please switch to Hardhat Local network (Chain ID: 31337)');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const getRoleBadge = () => {
    if (isOwner) {
      return (
        <span className="status-badge bg-purple-100 text-purple-800">
          <Shield className="w-3 h-3 mr-1" />
          Owner
        </span>
      );
    }
    if (isVerifier) {
      return (
        <span className="status-badge bg-blue-100 text-blue-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Verifier
        </span>
      );
    }
    return (
      <span className="status-badge bg-gray-100 text-gray-800">
        <User className="w-3 h-3 mr-1" />
        Prover
      </span>
    );
  };

  const formatAddress = (address: string) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900">Wallet Connection</h2>
        <Wallet className="w-6 h-6 text-gray-600" />
      </div>

      {!account ? (
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Connect your wallet to interact with system
          </p>
          
          
          
          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="btn-primary flex items-center justify-center mx-auto"
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Account:</span>
            <div className="flex items-center space-x-2">
              <span className="font-mono text-sm">{formatAddress(account)}</span>
              <button
                onClick={() => copyToClipboard(account)}
                className="text-gray-400 hover:text-gray-600"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Balance:</span>
            <span className="font-mono text-sm">{parseFloat(balance).toFixed(4)} ETH</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Role:</span>
            {getRoleBadge()}
          </div>

          {/* Network Status
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Network:</span>
            <div className="flex items-center space-x-2">
              {isCorrectNetwork ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <XCircle className="w-4 h-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${
                isCorrectNetwork ? 'text-green-600' : 'text-red-600'
              }`}>
                {networkInfo ? networkInfo.name : 'Unknown'}
              </span>
            </div>
          </div> */}

          {!isCorrectNetwork && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <div className="flex items-center space-x-2 mb-2">
                <XCircle className="w-4 h-4 text-red-600" />
                <span className="text-sm font-medium text-red-800">
                  Wrong Network Detected
                </span>
              </div>
              <p className="text-sm text-red-700 mb-2">
                Please switch to Hardhat Local network (Chain ID: 31337) to use this application.
              </p>
              <button
                onClick={switchToCorrectNetwork}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Switch Network Now
              </button>
            </div>
          )}

          {/* Debug Info
          <div className="border-t pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Current Address:</span>
              <span className="font-mono text-xs">{account}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Expected Owner:</span>
              <span className="font-mono text-xs">0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Is Owner:</span>
              <span className={`text-xs ${isOwner ? 'text-green-600' : 'text-red-600'}`}>
                {isOwner ? 'Yes' : 'No'}
              </span>
            </div>
          </div> */}

          {/* {contractInfo && (
            <div className="border-t pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Contract Owner:</span>
                <span className="font-mono text-sm">{formatAddress(contractInfo.owner)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Params Hash:</span>
                <span className="font-mono text-sm">{contractInfo.publicParamsHash}</span>
              </div>
            </div>
          )} */}

          <div className="flex space-x-2 pt-4">
            <button
              onClick={disconnectWallet}
              className="btn-secondary flex-1"
            >
              Disconnect
            </button>
            <button
              onClick={() => window.open(`https://etherscan.io/address/${account}`, '_blank')}
              className="btn-secondary flex items-center justify-center"
            >
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* <div className="mt-4 pt-4 border-t">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Network:</span>
          <div className="mt-1">
            <span className="font-mono text-xs">Hardhat Local (31337)</span>
          </div>
        </div>
      </div> */}
    </div>
  );
}
