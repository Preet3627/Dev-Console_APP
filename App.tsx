
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import Dashboard from '@/components/Dashboard';
import AssetManager from '@/components/AssetManager';
import CodeEditor from '@/components/CodeEditor';
import CoPilot from '@/components/CoPilot';
import ConnectorSetupModal from '@/components/ConnectorSetupModal';
import Login from '@/components/Login';
import Settings from '@/components/Settings';
import Generator from '@/components/Generator';
import PluginGeneratorModal from '@/components/PluginGeneratorModal';
import ThemeGeneratorModal from '@/components/ThemeGeneratorModal';
import DatabaseManager from '@/components/DatabaseManager';
import SecurityScanner from '@/components/SecurityScanner';
import PerformanceOptimizer from '@/components/PerformanceOptimizer';
import PluginLogViewer from '@/components/PluginLogViewer';
import SignUp from '@/components/SignUp';
import Verification from '@/components/Verification';
import ForgotPassword from '@/components/ForgotPassword';
import FileManager from '@/components/FileManager';
import BackupRestore from '@/components/BackupRestore';
import AdminPanel from '@/components/AdminPanel';
import CoPilotView from '@/components/CoPilotView';
import DatabaseSetup from '@/components/DatabaseSetup';
import BackendStatusView from '@/components/BackendStatusView';
import LandingPage from '@/LandingPage';

import { getSecureItem, setSecureItem, removeSecureItem } from '@/utils/secureLocalStorage';
import { getEncryptedSiteData, testConnection, getBackendStatus, getPublicConfig, getLatestConnectorPlugin, updateConnectorPlugin } from '@/services/wordpressService';
import { SiteData, AppSettings, Asset, AssetFile, AssetType } from '@/types';
import FloatingCoPilotButton from '@/components/FloatingCoPilotButton';

export type View = 'dashboard' | 'plugins' | 'themes' | 'database' | 'generator' | 'scanner' | 'optimizer' | 'logs' | 'settings' | 'copilot' | 'fileManager' | 'backupRestore' | 'adminPanel' | 'backendStatus';
type AuthView = 'login' | 'signup' | 'verify' | 'forgot_password';
type Toast = { message: string; type: 'success' | 'error' };
export type AppStatus = 'loading' | 'needs_setup' | 'setup_error' | 'ready';
type AppView = 'landing' | 'main_app';

const App: React.FC = () => {
    const [currentAppView, setCurrentAppView] = useState<AppView>('landing');
    const [authView, setAuthView] = useState<AuthView>('login');
    const [verificationEmail, setVerificationEmail] = useState('');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [currentView, setCurrentView] = useState<View>('dashboard');
    const [siteData, setSiteData] = useState<SiteData | null>(null);
    const [showConnectorModal, setShowConnectorModal] = useState(false);
    const [showCoPilotModal, setShowCoPilotModal] = useState(false);
    const [coPilotInitialPrompt, setCoPilotInitialPrompt] = useState<string | undefined>(undefined);
    const [showEditor, setShowEditor] = useState(false);
    const [assetToEdit, setAssetToEdit] = useState<Asset | null>(null);
    const [fileToEdit, setFileToEdit] = useState<AssetFile | null>(null);
    const [showPluginGenerator, setShowPluginGenerator] = useState(false);
    const [showThemeGenerator, setShowThemeGenerator] = useState(false);
    const [modalBgColor, setModalBgColor] = useState('rgba(17, 24, 39, 0.5)'); // glass-bg
    const [toast, setToast] = useState<Toast | null>(null);
    const [appStatus, setAppStatus] = useState<AppStatus>('loading');
    const [setupError, setSetupError] = useState('');

    const [displayName, setDisplayName] = useState('');
    const [profilePictureUrl, setProfilePictureUrl] = useState<string | null>(null);

    // Connector update state moved to App level
    const [connectorVersion, setConnectorVersion] = useState<string | null>(null);
    const [latestConnectorVersion, setLatestConnectorVersion] = useState<string | null>(null);
    const [isCheckingVersions, setIsCheckingVersions] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState('');

    const checkBackendStatus = useCallback(async () => {
        setAppStatus('loading');
        setSetupError('');
        try {
            const status = await getBackendStatus();
            if (status.database === 'unconfigured') {
                setAppStatus('needs_setup');
            } else if (status.database === 'error') {
                setAppStatus('setup_error');
                setSetupError(status.message || 'The backend failed to connect to the database. Please check your .env configuration and ensure the database server is running.');
            } else if (status.backend === 'ok' && status.database === 'ok') {
                setAppStatus('ready');
            } else {
                setAppStatus('setup_error');
                setSetupError(status.message || 'Could not connect to the backend server.');
            }
        } catch (e) {
            setAppStatus('setup_error');
            setSetupError('A network error occurred while trying to reach the backend server. Is it running?');
        }
    }, []);

    const loadInitialConfig = useCallback(async () => {
        try {
            const publicConfig = await getPublicConfig();
            if (publicConfig.googleClientId) {
                const currentSettings = getSecureItem<AppSettings>('appSettings') || {};
                const updatedSettings = { ...currentSettings, googleClientId: publicConfig.googleClientId };
                setSecureItem('appSettings', updatedSettings);
            }
        } catch (e) {
            console.error("Failed to load initial public configuration from the backend.", e);
        }
    }, []);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                setToast(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const handleLogin = async (data: { token: string; email: string; isAdmin: boolean; settings: AppSettings, siteData?: SiteData | null, displayName?: string, profilePictureUrl?: string | null }) => {
        setSecureItem('authToken', data.token);
        setSecureItem('userEmail', data.email);
        setSecureItem('isAdmin', data.isAdmin);
        setSecureItem('appSettings', data.settings);
        setSecureItem('displayName', data.displayName || '');
        setSecureItem('profilePictureUrl', data.profilePictureUrl || null);

        setIsAdmin(data.isAdmin);
        setIsLoggedIn(true);
        setDisplayName(data.displayName || '');
        setProfilePictureUrl(data.profilePictureUrl || null);

        if (data.siteData) {
            setSiteData(data.siteData);
            setSecureItem('siteData', data.siteData);
        } else {
            // Check for locally stored site data if not provided from login
            const localSiteData = getSecureItem<SiteData>('siteData');
            setSiteData(localSiteData);
        }
    };

    const handleLogout = () => {
        removeSecureItem('authToken');
        removeSecureItem('userEmail');
        removeSecureItem('isAdmin');
        removeSecureItem('siteData');
        removeSecureItem('displayName');
        removeSecureItem('profilePictureUrl');
        
        setIsLoggedIn(false);
        setSiteData(null);
        setDisplayName('');
        setProfilePictureUrl(null);
        setCurrentView('dashboard');
        setAuthView('login');
        setCurrentAppView('landing');
    };

    const loadSiteData = useCallback(async () => {
        try {
            const data = await getEncryptedSiteData();
            if (data) {
                setSiteData(data);
                setSecureItem('siteData', data);
            }
        } catch (error) {
            console.error("Could not load remote site data:", error);
            const localData = getSecureItem<SiteData>('siteData');
            if (localData) setSiteData(localData);
        }
    }, []);

    const handleUpdateConnector = useCallback(async () => {
        if (!siteData) return;
        setIsUpdating(true);
        setUpdateStatus('Updating connector plugin on your WordPress site...');
        try {
            const latestPluginData = await getLatestConnectorPlugin();
            await updateConnectorPlugin(siteData, latestPluginData.source);
            setConnectorVersion(latestPluginData.version); // Optimistically update UI
            setToast({ message: '✅ Connector updated successfully!', type: 'success'});
            setUpdateStatus('Connector updated successfully!');
        } catch (e) {
            const errorMsg = `Update failed: ${(e as Error).message}`;
            setToast({ message: `❌ ${errorMsg}`, type: 'error'});
            setUpdateStatus(errorMsg);
        } finally {
            setIsUpdating(false);
            setTimeout(() => setUpdateStatus(''), 5000);
        }
    }, [siteData]);

    // Effect to check connector version
    useEffect(() => {
        const checkVersions = async () => {
            if (!siteData) return;
            setIsCheckingVersions(true);
            setUpdateStatus('');
            try {
                const pingResponse = await testConnection(siteData);
                const installed = pingResponse.connector_version || 'Unknown';
                setConnectorVersion(installed);

                const latestPluginData = await getLatestConnectorPlugin();
                const latest = latestPluginData.version || 'Unknown';
                setLatestConnectorVersion(latest);
                
                const settings = getSecureItem<AppSettings>('appSettings') || {};
                if (settings.autoUpdateConnector && installed !== latest && installed !== 'Unknown' && latest !== 'Unknown') {
                    await handleUpdateConnector();
                }

            } catch (e) {
                console.error("Failed to check connector versions", e);
                setUpdateStatus('Could not verify connector version.');
            } finally {
                setIsCheckingVersions(false);
            }
        };
        checkVersions();
    }, [siteData, handleUpdateConnector]);

    useEffect(() => {
        const initializeApp = async () => {
            await loadInitialConfig();
            await checkBackendStatus();
            const token = getSecureItem('authToken');
            if (token) {
              setCurrentAppView('main_app');
            }
            const adminStatus = getSecureItem<boolean>('isAdmin');
            if (token) {
                setIsLoggedIn(true);
                setIsAdmin(!!adminStatus);
                setDisplayName(getSecureItem('displayName') || '');
                setProfilePictureUrl(getSecureItem('profilePictureUrl'));
                loadSiteData();
            }
        };
        initializeApp();
    }, [loadInitialConfig, checkBackendStatus, loadSiteData]);

    const handleConnect = (data: SiteData) => {
        setSiteData(data);
        setSecureItem('siteData', data);
        setShowConnectorModal(false);
    };
    
    const handleEditAsset = (asset: Asset) => {
        setAssetToEdit(asset);
        setFileToEdit(null); // Reset file selection
        setShowEditor(true);
    };

    const handleEditFile = (file: AssetFile) => {
        setAssetToEdit({
            name: 'WordPress Root',
            identifier: 'root',
            type: AssetType.Plugin, // Type doesn't really matter for root
            version: 'N/A',
            isActive: true,
        });
        setFileToEdit(file);
        setShowEditor(true);
    };

    const handleStartChat = (prompt?: string) => {
        setCoPilotInitialPrompt(prompt);
        setShowCoPilotModal(true);
    };
    
    const handleNavigateToVerification = (email: string) => {
        setVerificationEmail(email);
        setAuthView('verify');
    };

    const handleTestConnection = async () => {
        if (!siteData) return;
        setToast({ message: 'Pinging your site...', type: 'success' }); // Use success for neutral color
        try {
            const response = await testConnection(siteData);
            const version = response?.connector_version;
            const message = version 
                ? `✅ Connection successful! Connector v${version}`
                : '✅ Connection successful!';
            setToast({ message, type: 'success' });
        } catch (error) {
            setToast({ message: `❌ Connection test failed: ${(error as Error).message}`, type: 'error' });
        }
    };
    
    const handleEnterApp = () => {
        setCurrentAppView('main_app');
    };
    
    const handleProfileUpdate = () => {
        setDisplayName(getSecureItem('displayName') || '');
        setProfilePictureUrl(getSecureItem('profilePictureUrl'));
    };
    
    const needsUpdate = !!(connectorVersion && latestConnectorVersion && connectorVersion !== 'Unknown' && latestConnectorVersion !== 'Unknown' && connectorVersion < latestConnectorVersion);

    if (currentAppView === 'landing') {
        return <LandingPage onEnterApp={handleEnterApp} />;
    }

    const renderView = () => {
        if (!siteData && !['dashboard', 'settings', 'generator', 'adminPanel', 'backendStatus'].includes(currentView)) {
             return (
                <div className="text-center p-8">
                    <h2 className="text-2xl font-semibold mb-4">Site Not Connected</h2>
                    <p className="text-text-secondary mb-6">Please connect to a WordPress site to use this feature.</p>
                    <button onClick={() => setShowConnectorModal(true)} className="btn btn-primary">Connect Now</button>
                </div>
            );
        }

        switch (currentView) {
            case 'dashboard':
                return <Dashboard onStartChat={handleStartChat} isConnected={!!siteData} onConnect={() => setShowConnectorModal(true)} needsConnectorUpdate={needsUpdate} onUpdateConnector={handleUpdateConnector} isUpdatingConnector={isUpdating} />;
            case 'plugins':
                return <AssetManager siteData={siteData!} assetType={AssetType.Plugin} onEditAsset={handleEditAsset} />;
            case 'themes':
                return <AssetManager siteData={siteData!} assetType={AssetType.Theme} onEditAsset={handleEditAsset} />;
            case 'database':
                return <DatabaseManager siteData={siteData!} />;
            case 'generator':
                return <Generator onGeneratePlugin={() => setShowPluginGenerator(true)} onGenerateTheme={() => setShowThemeGenerator(true)} />;
            case 'scanner':
                return <SecurityScanner siteData={siteData!} />;
            case 'optimizer':
                return <PerformanceOptimizer siteData={siteData!} />;
            case 'logs':
                return <PluginLogViewer siteData={siteData!} />;
            case 'fileManager':
                return <FileManager siteData={siteData!} onEditFile={handleEditFile} />;
            case 'backupRestore':
                return <BackupRestore siteData={siteData!} />;
            case 'copilot':
                return <CoPilotView siteData={siteData} />;
            case 'adminPanel':
                return <AdminPanel />;
            case 'backendStatus':
                return <BackendStatusView />;
            case 'settings':
                return <Settings siteData={siteData} onDisconnect={handleLogout} onProfileUpdate={handleProfileUpdate} connectorVersionInfo={{ connectorVersion, latestConnectorVersion, isCheckingVersions, isUpdating, updateStatus }} onUpdateConnector={handleUpdateConnector}/>;
            default:
                return <Dashboard onStartChat={handleStartChat} isConnected={!!siteData} onConnect={() => setShowConnectorModal(true)} needsConnectorUpdate={needsUpdate} onUpdateConnector={handleUpdateConnector} isUpdatingConnector={isUpdating} />;
        }
    };
    
    if (appStatus === 'loading') {
        return (
            <div className="flex h-screen bg-background text-text-primary font-sans items-center justify-center">
                <p>Initializing...</p>
            </div>
        );
    }

    if (appStatus === 'needs_setup' || appStatus === 'setup_error') {
        return <DatabaseSetup onStatusRefresh={checkBackendStatus} error={setupError} />;
    }

    if (!isLoggedIn) {
        switch (authView) {
            case 'signup':
                return <SignUp onBackToLogin={() => setAuthView('login')} onNavigateToVerification={handleNavigateToVerification} onLogin={handleLogin} />;
            case 'verify':
                return <Verification email={verificationEmail} onVerificationSuccess={() => setAuthView('login')} onBackToLogin={() => setAuthView('login')} />;
            case 'forgot_password':
                return <ForgotPassword onBackToLogin={() => setAuthView('login')} />;
            case 'login':
            default:
                return <Login onLogin={handleLogin} onNavigateToSignUp={() => setAuthView('signup')} onNavigateToForgotPassword={() => setAuthView('forgot_password')} onNavigateToVerification={handleNavigateToVerification} />;
        }
    }
    
    return (
        <div className="flex h-screen bg-background text-text-primary font-sans main-app-fade-in">
            <Sidebar currentView={currentView} setView={setCurrentView} onLogout={handleLogout} isAdmin={isAdmin} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    isConnected={!!siteData} 
                    siteUrl={siteData?.siteUrl || ''} 
                    onConnect={() => setShowConnectorModal(true)} 
                    onRefresh={loadSiteData}
                    onTestConnection={handleTestConnection}
                    displayName={displayName}
                    profilePictureUrl={profilePictureUrl}
                    onLogout={handleLogout}
                    setView={setCurrentView}
                />
                <main className="flex-1 overflow-y-auto p-8">
                    {renderView()}
                </main>
            </div>
            
            <FloatingCoPilotButton onClick={() => handleStartChat()} />

            {toast && (
                <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {toast.message}
                </div>
            )}

            {showConnectorModal && <ConnectorSetupModal onClose={() => setShowConnectorModal(false)} onSiteAdded={handleConnect} />}
            {showCoPilotModal && <CoPilot onClose={() => setShowCoPilotModal(false)} siteData={siteData} initialPrompt={coPilotInitialPrompt} modalBgColor={modalBgColor} />}
            {showEditor && assetToEdit && <CodeEditor siteData={siteData!} asset={assetToEdit} initialFile={fileToEdit || undefined} onClose={() => setShowEditor(false)} modalBgColor={modalBgColor} />}
            {showPluginGenerator && <PluginGeneratorModal onClose={() => setShowPluginGenerator(false)} siteData={siteData} modalBgColor={modalBgColor} />}
            {showThemeGenerator && <ThemeGeneratorModal onClose={() => setShowThemeGenerator(false)} siteData={siteData} modalBgColor={modalBgColor} />}
        </div>
    );
};

export default App;
