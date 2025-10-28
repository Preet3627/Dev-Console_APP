
import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import Dashboard from './Dashboard';
import AssetManager from './AssetManager';
import CodeEditor from './CodeEditor';
import CoPilot from './CoPilot';
import ConnectorSetupModal from './ConnectorSetupModal';
import Login from './Login';
import Settings from './Settings';
import Generator from './Generator';
import PluginGeneratorModal from './PluginGeneratorModal';
import ThemeGeneratorModal from './ThemeGeneratorModal';
import DatabaseManager from './DatabaseManager';
import SecurityScanner from './SecurityScanner';
import PerformanceOptimizer from './PerformanceOptimizer';
import PluginLogViewer from './PluginLogViewer';
import SignUp from './SignUp';
import Verification from './Verification';
import ForgotPassword from './ForgotPassword';
import FileManager from './FileManager';
import BackupRestore from './BackupRestore';
import AdminPanel from './AdminPanel';
import CoPilotView from './CoPilotView';
import DatabaseSetup from './DatabaseSetup';
import BackendStatusView from './BackendStatusView';
import LandingPage from './LandingPage';
import SiteSwitcherModal from './SiteSwitcherModal';
import WelcomeWizard from './WelcomeWizard';
import SeoManager from './SeoManager';


import { getSecureItem, setSecureItem, removeSecureItem } from './utils/secureLocalStorage';
import { getAllSites, testConnection, getBackendStatus, getPublicConfig, getLatestConnectorPlugin, updateConnectorPlugin } from './services/wordpressService';
import { SiteData, AppSettings, Asset, AssetFile, AssetType } from './types';
import FloatingCoPilotButton from './components/FloatingCoPilotButton';

// ADD: Added 'seo' and 'appSeo' to the View type for the new SEO features.
export type View = 'dashboard' | 'plugins' | 'themes' | 'database' | 'generator' | 'scanner' | 'optimizer' | 'logs' | 'settings' | 'copilot' | 'fileManager' | 'backupRestore' | 'adminPanel' | 'backendStatus' | 'seo' | 'appSeo';
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
    
    // Multi-site state
    const [sites, setSites] = useState<SiteData[]>([]);
    const [currentSite, setCurrentSite] = useState<SiteData | null>(null);
    const [showSiteSwitcher, setShowSiteSwitcher] = useState(false);
    
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

    const [connectorVersion, setConnectorVersion] = useState<string | null>(null);
    const [latestConnectorVersion, setLatestConnectorVersion] = useState<string | null>(null);
    const [isCheckingVersions, setIsCheckingVersions] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);
    const [updateStatus, setUpdateStatus] = useState('');
    
    // ADD: State for the new Welcome Wizard.
    const [showWelcomeWizard, setShowWelcomeWizard] = useState(false);


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
    
    // Site Switcher keyboard shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                setShowSiteSwitcher(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // ADD: Browser history management to handle back/forward buttons.
    const navigate = useCallback((view: View, replace = false) => {
        setCurrentView(view);
        const method = replace ? 'replaceState' : 'pushState';
        window.history[method]({ view }, '', `#${view}`);
    }, []);

    useEffect(() => {
        const handlePopState = (event: PopStateEvent) => {
            const view = event.state?.view || 'dashboard';
            setCurrentView(view);
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        // Set initial view from URL hash on load
        const initialView = window.location.hash.replace('#', '') as View;
        if (Object.values(['dashboard', 'plugins', 'themes', 'database', 'generator', 'scanner', 'optimizer', 'logs', 'settings', 'copilot', 'fileManager', 'backupRestore', 'adminPanel', 'backendStatus', 'seo', 'appSeo']).includes(initialView)) {
             navigate(initialView, true);
        } else {
             navigate('dashboard', true);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


    const handleLogin = async (data: { token: string; email: string; isAdmin: boolean; settings: AppSettings, sites?: SiteData[], displayName?: string, profilePictureUrl?: string | null, isNewUser?: boolean }) => {
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
        
        const siteList = data.sites || [];
        setSites(siteList);
        setSecureItem('sites', siteList);

        if (siteList.length > 0) {
            const lastUsedSiteId = getSecureItem<number>('lastUsedSiteId');
            const siteToSet = siteList.find(s => s.id === lastUsedSiteId) || siteList[0];
            setCurrentSite(siteToSet);
        } else {
            setCurrentSite(null);
        }
        
        // ADD: Trigger the welcome wizard for new users.
        const hasSeenWizard = getSecureItem<boolean>('hasSeenWelcomeWizard');
        if (data.isNewUser && !hasSeenWizard) {
            setShowWelcomeWizard(true);
        }
    };

    const handleLogout = () => {
        removeSecureItem('authToken');
        removeSecureItem('userEmail');
        removeSecureItem('isAdmin');
        removeSecureItem('sites');
        removeSecureItem('lastUsedSiteId');
        removeSecureItem('displayName');
        removeSecureItem('profilePictureUrl');
        
        setIsLoggedIn(false);
        setSites([]);
        setCurrentSite(null);
        setDisplayName('');
        setProfilePictureUrl(null);
        navigate('dashboard');
        setAuthView('login');
        setCurrentAppView('landing');
    };

    const loadSites = useCallback(async () => {
        try {
            const data = await getAllSites();
            if (data) {
                setSites(data);
                setSecureItem('sites', data);
                if (data.length > 0 && !currentSite) {
                    const lastUsedSiteId = getSecureItem<number>('lastUsedSiteId');
                    const siteToSet = data.find(s => s.id === lastUsedSiteId) || data[0];
                    setCurrentSite(siteToSet);
                }
            }
        } catch (error) {
            console.error("Could not load remote sites:", error);
            const localData = getSecureItem<SiteData[]>('sites');
            if (localData) {
                setSites(localData);
                if (localData.length > 0 && !currentSite) {
                     const lastUsedSiteId = getSecureItem<number>('lastUsedSiteId');
                     const siteToSet = localData.find(s => s.id === lastUsedSiteId) || localData[0];
                     setCurrentSite(siteToSet);
                }
            }
        }
    }, [currentSite]);

    const handleUpdateConnector = useCallback(async () => {
        if (!currentSite) return;
        setIsUpdating(true);
        setUpdateStatus('Updating connector plugin on your WordPress site...');
        try {
            const latestPluginData = await getLatestConnectorPlugin();
            await updateConnectorPlugin(currentSite, latestPluginData.source);
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
    }, [currentSite]);

    // Effect to check connector version
    useEffect(() => {
        const checkVersions = async () => {
            if (!currentSite) {
                setConnectorVersion(null);
                setLatestConnectorVersion(null);
                return;
            };
            setIsCheckingVersions(true);
            setUpdateStatus('');
            try {
                const pingResponse = await testConnection(currentSite);
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
    }, [currentSite, handleUpdateConnector]);

    useEffect(() => {
        const initializeApp = async () => {
            await loadInitialConfig();
            await checkBackendStatus();
            const token = getSecureItem('authToken');
            if (token) {
              setCurrentAppView('main_app');
              setIsLoggedIn(true);
              setIsAdmin(!!getSecureItem<boolean>('isAdmin'));
              setDisplayName(getSecureItem('displayName') || '');
              setProfilePictureUrl(getSecureItem('profilePictureUrl'));
              loadSites();
            }
        };
        initializeApp();
    }, [loadInitialConfig, checkBackendStatus, loadSites]);

    const handleSiteAdded = (newSite: SiteData) => {
        const newSites = [...sites, newSite];
        setSites(newSites);
        setSecureItem('sites', newSites);
        setCurrentSite(newSite);
        setSecureItem('lastUsedSiteId', newSite.id);
        setShowConnectorModal(false);
    };
    
    const handleSwitchSite = (site: SiteData) => {
        setCurrentSite(site);
        setSecureItem('lastUsedSiteId', site.id);
        setShowSiteSwitcher(false);
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
        if (!currentSite) return;
        setToast({ message: 'Pinging your site...', type: 'success' }); // Use success for neutral color
        try {
            const response = await testConnection(currentSite);
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
    
    const handleGoToLanding = () => {
        setCurrentAppView('landing');
    };
    
    const handleProfileUpdate = () => {
        setDisplayName(getSecureItem('displayName') || '');
        setProfilePictureUrl(getSecureItem('profilePictureUrl'));
    };
    
    const handleCloseWizard = () => {
        setShowWelcomeWizard(false);
        setSecureItem('hasSeenWelcomeWizard', true);
    };
    
    const needsUpdate = !!(connectorVersion && latestConnectorVersion && connectorVersion !== 'Unknown' && latestConnectorVersion !== 'Unknown' && connectorVersion < latestConnectorVersion);

    if (currentAppView === 'landing') {
        return <LandingPage onEnterApp={handleEnterApp} />;
    }

    const renderView = () => {
        // ADD: Added 'seo' and 'appSeo' to the list of views accessible without a site connection.
        if (!currentSite && !['dashboard', 'settings', 'generator', 'adminPanel', 'backendStatus', 'appSeo', 'copilot'].includes(currentView)) {
             return (
                <div className="text-center p-8">
                    <h2 className="text-2xl font-semibold mb-4">Site Not Connected</h2>
                    <p className="text-text-secondary mb-6">Please connect to a WordPress site to use this feature.</p>
                    <button onClick={() => setShowSiteSwitcher(true)} className="btn btn-primary">Connect Now</button>
                </div>
            );
        }

        switch (currentView) {
            case 'dashboard':
                return <Dashboard onStartChat={handleStartChat} isConnected={!!currentSite} onConnect={() => setShowSiteSwitcher(true)} needsConnectorUpdate={needsUpdate} onUpdateConnector={handleUpdateConnector} isUpdatingConnector={isUpdating} />;
            case 'plugins':
                return <AssetManager siteData={currentSite!} assetType={AssetType.Plugin} onEditAsset={handleEditAsset} />;
            case 'themes':
                return <AssetManager siteData={currentSite!} assetType={AssetType.Theme} onEditAsset={handleEditAsset} />;
            case 'database':
                return <DatabaseManager siteData={currentSite!} />;
            case 'generator':
                return <Generator onGeneratePlugin={() => setShowPluginGenerator(true)} onGenerateTheme={() => setShowThemeGenerator(true)} />;
            case 'scanner':
                return <SecurityScanner siteData={currentSite!} />;
            case 'optimizer':
                return <PerformanceOptimizer siteData={currentSite!} />;
            case 'logs':
                return <PluginLogViewer siteData={currentSite!} />;
            case 'fileManager':
                return <FileManager siteData={currentSite!} onEditFile={handleEditFile} />;
            case 'backupRestore':
                return <BackupRestore siteData={currentSite!} />;
            case 'copilot':
                return <CoPilotView siteData={currentSite} />;
            // ADD: Case for the new SeoManager view.
            case 'seo':
                return <SeoManager siteData={currentSite!} />;
            case 'adminPanel':
                // ADD: Pass navigate function to AdminPanel to handle sub-views like appSeo.
                return <AdminPanel navigate={navigate} />;
            case 'appSeo':
                // This view is handled within AdminPanel, but adding a direct route for history.
                return <AdminPanel navigate={navigate} initialTab="appSeo" />;
            case 'backendStatus':
                return <BackendStatusView />;
            case 'settings':
                return <Settings siteData={currentSite} onDisconnect={handleLogout} onProfileUpdate={handleProfileUpdate} connectorVersionInfo={{ connectorVersion, latestConnectorVersion, isCheckingVersions, isUpdating, updateStatus }} onUpdateConnector={handleUpdateConnector}/>;
            default:
                return <Dashboard onStartChat={handleStartChat} isConnected={!!currentSite} onConnect={() => setShowSiteSwitcher(true)} needsConnectorUpdate={needsUpdate} onUpdateConnector={handleUpdateConnector} isUpdatingConnector={isUpdating} />;
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
                return <SignUp onBackToLogin={() => setAuthView('login')} onNavigateToVerification={handleNavigateToVerification} onLogin={handleLogin} onGoToLanding={handleGoToLanding} />;
            case 'verify':
                return <Verification email={verificationEmail} onVerificationSuccess={() => setAuthView('login')} onBackToLogin={() => setAuthView('login')} onGoToLanding={handleGoToLanding} />;
            case 'forgot_password':
                return <ForgotPassword onBackToLogin={() => setAuthView('login')} onGoToLanding={handleGoToLanding} />;
            case 'login':
            default:
                return <Login onLogin={handleLogin} onNavigateToSignUp={() => setAuthView('signup')} onNavigateToForgotPassword={() => setAuthView('forgot_password')} onNavigateToVerification={handleNavigateToVerification} onGoToLanding={handleGoToLanding} />;
        }
    }
    
    return (
        <div className="flex h-screen bg-background text-text-primary font-sans main-app-fade-in">
            <Sidebar currentView={currentView} setView={navigate} onLogout={handleLogout} isAdmin={isAdmin} />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header 
                    sites={sites}
                    currentSite={currentSite}
                    onOpenSiteSwitcher={() => setShowSiteSwitcher(true)}
                    onRefresh={loadSites}
                    onTestConnection={handleTestConnection}
                    displayName={displayName}
                    profilePictureUrl={profilePictureUrl}
                    onLogout={handleLogout}
                    setView={navigate}
                />
                <main className="flex-1 overflow-y-auto p-8">
                    <div key={currentView} className="animate-fade-in-up-view">
                        {renderView()}
                    </div>
                </main>
            </div>
            
            <FloatingCoPilotButton onClick={() => handleStartChat()} />

            {toast && (
                <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
                    {toast.message}
                </div>
            )}
            
            {showWelcomeWizard && <WelcomeWizard onClose={handleCloseWizard} onConnectSite={() => setShowConnectorModal(true)} />}

            {showSiteSwitcher && (
                 <SiteSwitcherModal
                    sites={sites}
                    currentSiteId={currentSite?.id || null}
                    onSwitchSite={handleSwitchSite}
                    onAddNewSite={() => {
                        setShowSiteSwitcher(false);
                        setShowConnectorModal(true);
                    }}
                    onClose={() => setShowSiteSwitcher(false)}
                />
            )}

            {showConnectorModal && <ConnectorSetupModal onClose={() => setShowConnectorModal(false)} onSiteAdded={handleSiteAdded} />}
            {showCoPilotModal && <CoPilot onClose={() => setShowCoPilotModal(false)} siteData={currentSite} initialPrompt={coPilotInitialPrompt} modalBgColor={modalBgColor} />}
            {showEditor && assetToEdit && <CodeEditor siteData={currentSite!} asset={assetToEdit} initialFile={fileToEdit || undefined} onClose={() => setShowEditor(false)} modalBgColor={modalBgColor} />}
            {showPluginGenerator && <PluginGeneratorModal onClose={() => setShowPluginGenerator(false)} siteData={currentSite} modalBgColor={modalBgColor} />}
            {showThemeGenerator && <ThemeGeneratorModal onClose={() => setShowThemeGenerator(false)} siteData={currentSite} modalBgColor={modalBgColor} />}
        </div>
    );
};

export default App;
