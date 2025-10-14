import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { 
  Wallet, 
  User, 
  Shield, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Copy,
  ExternalLink,
  GraduationCap,
  Settings,
  FileText,
  Upload
} from 'lucide-react';
import WalletConnection from './components/WalletConnection';
import ProofGenerator from './components/ProofGenerator';
import ProofVerifier from './components/ProofVerifier';
import AdminPanel from './components/AdminPanel';
import { UserRole } from './types';

function App() {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [activeTab, setActiveTab] = useState<'generate' | 'verify' | 'admin'>('generate');
  const [generatedProof, setGeneratedProof] = useState<string>('');
  const [proofHash, setProofHash] = useState<string>('');

  // Debug effect to track state changes
  useEffect(() => {
    console.log('App: State changed - userRole:', userRole, 'activeTab:', activeTab);
  }, [userRole, activeTab]);

  const handleUserRoleChange = useCallback((role: UserRole) => {
    console.log('App: User role changed:', role);
    console.log('App: Previous role:', userRole);
    console.log('App: New role type:', role.type);
    
    const previousRole = userRole;
    setUserRole(role);
    
    // Auto-switch tabs based on user role
    if (role.type === 'owner') {
      console.log('App: Switching to admin tab');
      setActiveTab('admin');
    } else if (role.type === 'verifier') {
      console.log('App: Switching to verify tab');
      setActiveTab('verify');
    } else {
      console.log('App: Switching to generate tab (default)');
      setActiveTab('generate');
    }
    
    console.log('App: Active tab set to:', role.type === 'owner' ? 'admin' : role.type === 'verifier' ? 'verify' : 'generate');
  }, [userRole]);

  const handleProofGenerated = (proof: string, hash: string) => {
    setGeneratedProof(proof);
    setProofHash(hash);
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'generate':
        return <User className="w-4 h-4" />;
      case 'verify':
        return <Shield className="w-4 h-4" />;
      case 'admin':
        return <Settings className="w-4 h-4" />;
      default:
        return null;
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'generate':
        return 'Generate Proof';
      case 'verify':
        return 'Verify Proof';
      case 'admin':
        return 'Admin Panel';
      default:
        return '';
    }
  };

  const isTabDisabled = (tab: string) => {
    console.log(`App: Checking if tab '${tab}' is disabled`);
    console.log('App: userRole:', userRole);
    console.log('App: userRole.isConnected:', userRole?.isConnected);
    console.log('App: userRole.type:', userRole?.type);
    
    if (!userRole?.isConnected) {
      console.log(`App: Tab '${tab}' disabled - not connected`);
      return true;
    }
    
    switch (tab) {
      case 'admin':
        const adminDisabled = userRole.type !== 'owner';
        console.log(`App: Admin tab disabled: ${adminDisabled} (userRole.type: ${userRole.type})`);
        return adminDisabled;
      case 'verify':
        const verifyDisabled = userRole.type !== 'verifier' && userRole.type !== 'owner';
        console.log(`App: Verify tab disabled: ${verifyDisabled} (userRole.type: ${userRole.type})`);
        return verifyDisabled;
      case 'generate':
        // Generate tab is only available to subjects and owners (not verifiers)
        const generateDisabled = userRole.type === 'verifier';
        console.log(`App: Generate tab disabled for verifiers: ${generateDisabled} (userRole.type: ${userRole.type})`);
        return generateDisabled;
      default:
        console.log(`App: Tab '${tab}' enabled`);
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <GraduationCap className="w-8 h-8 text-blue-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">RP Application</h1>
                <p className="text-sm text-gray-600">Academic Grade Verification</p>
              </div>
            </div>
            
            {/* Navigation Tabs - Only show when connected */}
            {userRole?.isConnected && (
              <nav className="flex space-x-1">
                {['generate', 'verify', 'admin'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    disabled={isTabDisabled(tab)}
                    className={`flex items-center space-x-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab
                        ? 'bg-blue-100 text-blue-700'
                        : isTabDisabled(tab)
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    {getTabIcon(tab)}
                    <span>{getTabLabel(tab)}</span>
                  </button>
                ))}
              </nav>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!userRole?.isConnected ? (
          /* Disconnected State - Center Wallet Connection */
          <div className="flex justify-center">
            <div className="w-full max-w-md">
              <WalletConnection 
                onUserRoleChange={handleUserRoleChange}
                userRole={userRole}
              />
            </div>
          </div>
        ) : (
          /* Connected State - Grid Layout */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Wallet Connection */}
            <div className="lg:col-span-1">
              <WalletConnection 
                onUserRoleChange={handleUserRoleChange}
                userRole={userRole}
              />
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-2">
              {/* Tab Content */}
              <div className="space-y-6">
                {activeTab === 'generate' && (
                  <ProofGenerator
                    userAddress={userRole?.address || ''}
                    onProofGenerated={handleProofGenerated}
                  />
                )}

                {activeTab === 'verify' && (
                  <ProofVerifier
                    userAddress={userRole?.address || ''}
                    isAuthorizedVerifier={userRole?.type === 'verifier' || userRole?.type === 'owner'}
                  />
                )}

                {activeTab === 'admin' && (
                  <AdminPanel />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        
      </main>
    </div>
  );
}

export default App;
