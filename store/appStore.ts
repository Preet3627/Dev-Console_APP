import { create } from 'zustand';
import { getSecureItem, setSecureItem, removeSecureItem } from './utils/secureLocalStorage';
import { AppStatus, SiteData, AppSettings, View, AuthView } from '../types';

// Define the shape of our store's state
interface AppState {
  currentAppView: 'landing' | 'main_app';
  authView: AuthView;
  verificationEmail: string;
  isLoggedIn: boolean;
  isAdmin: boolean;
  currentView: View;
  
  // Multi-site state
  sites: SiteData[];
  currentSite: SiteData | null;
  showSiteSwitcher: boolean;
  
  // Modals and UI state
  showConnectorModal: boolean;
  showCoPilotModal: boolean;
  coPilotInitialPrompt: string | undefined;
  showEditor: boolean;
  assetToEdit: any | null; // Use more specific type if available
  fileToEdit: any | null; // Use more specific type if available
  showPluginGenerator: boolean;
  showThemeGenerator: boolean;
  modalBgColor: string;
  toast: { message: string; type: 'success' | 'error' } | null;
  appStatus: AppStatus;
  setupError: string;

  displayName: string;
  profilePictureUrl: string | null;

  connectorVersion: string | null;
  latestConnectorVersion: string | null;
  isCheckingVersions: boolean;
  isUpdating: boolean;
  updateStatus: string;
  showWelcomeWizard: boolean;
  
  // Actions
  setCurrentAppView: (view: 'landing' | 'main_app') => void;
  setAuthView: (view: AuthView) => void;
  setVerificationEmail: (email: string) => void;
  setIsLoggedIn: (loggedIn: boolean) => void;
  setIsAdmin: (admin: boolean) => void;
  setCurrentView: (view: View) => void;
  setSites: (sites: SiteData[]) => void;
  setCurrentSite: (site: SiteData | null) => void;
  setShowSiteSwitcher: (show: boolean) => void;
  setShowConnectorModal: (show: boolean) => void;
  setShowCoPilotModal: (show: boolean) => void;
  setCoPilotInitialPrompt: (prompt: string | undefined) => void;
  setShowEditor: (show: boolean) => void;
  setAssetToEdit: (asset: any | null) => void;
  setFileToEdit: (file: any | null) => void;
  setShowPluginGenerator: (show: boolean) => void;
  setShowThemeGenerator: (show: boolean) => void;
  setModalBgColor: (color: string) => void;
  setToast: (toast: { message: string; type: 'success' | 'error' } | null) => void;
  setAppStatus: (status: AppStatus) => void;
  setSetupError: (error: string) => void;
  setDisplayName: (name: string) => void;
  setProfilePictureUrl: (url: string | null) => void;
  setConnectorVersion: (version: string | null) => void;
  setLatestConnectorVersion: (version: string | null) => void;
  setIsCheckingVersions: (checking: boolean) => void;
  setIsUpdating: (updating: boolean) => void;
  setUpdateStatus: (status: string) => void;
  setShowWelcomeWizard: (show: boolean) => void;

  // Authentication & User related actions
  handleLogin: (data: { token: string; email: string; isAdmin: boolean; settings: AppSettings, sites?: SiteData[], displayName?: string, profilePictureUrl?: string | null, isNewUser?: boolean }) => void;
  handleLogout: () => void;
  loadAuthDataFromStorage: () => void;
  updateProfileData: (displayName: string, profilePictureUrl: string | null) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  currentAppView: 'landing',
  authView: 'login',
  verificationEmail: '',
  isLoggedIn: false,
  isAdmin: false,
  currentView: 'dashboard',
  sites: [],
  currentSite: null,
  showSiteSwitcher: false,
  showConnectorModal: false,
  showCoPilotModal: false,
  coPilotInitialPrompt: undefined,
  showEditor: false,
  assetToEdit: null,
  fileToEdit: null,
  showPluginGenerator: false,
  showThemeGenerator: false,
  modalBgColor: 'rgba(17, 24, 39, 0.5)',
  toast: null,
  appStatus: 'loading',
  setupError: '',
  displayName: '',
  profilePictureUrl: null,
  connectorVersion: null,
  latestConnectorVersion: null,
  isCheckingVersions: false,
  isUpdating: false,
  updateStatus: '',
  showWelcomeWizard: false,

  setCurrentAppView: (view) => set({ currentAppView: view }),
  setAuthView: (view) => set({ authView: view }),
  setVerificationEmail: (email) => set({ verificationEmail: email }),
  setIsLoggedIn: (loggedIn) => set({ isLoggedIn: loggedIn }),
  setIsAdmin: (admin) => set({ isAdmin: admin }),
  setCurrentView: (view) => set({ currentView: view }),
  setSites: (sites) => set({ sites: sites }),
  setCurrentSite: (site) => set({ currentSite: site }),
  setShowSiteSwitcher: (show) => set({ showSiteSwitcher: show }),
  setShowConnectorModal: (show) => set({ showConnectorModal: show }),
  setShowCoPilotModal: (show) => set({ showCoPilotModal: show }),
  setCoPilotInitialPrompt: (prompt) => set({ coPilotInitialPrompt: prompt }),
  setShowEditor: (show) => set({ showEditor: show }),
  setAssetToEdit: (asset) => set({ assetToEdit: asset }),
  setFileToEdit: (file) => set({ fileToEdit: file }),
  setShowPluginGenerator: (show) => set({ showPluginGenerator: show }),
  setShowThemeGenerator: (show) => set({ showThemeGenerator: show }),
  setModalBgColor: (color) => set({ modalBgColor: color }),
  setToast: (toast) => set({ toast: toast }),
  setAppStatus: (status) => set({ appStatus: status }),
  setSetupError: (error) => set({ setupError: error }),
  setDisplayName: (name) => set({ displayName: name }),
  setProfilePictureUrl: (url) => set({ profilePictureUrl: url }),
  setConnectorVersion: (version) => set({ connectorVersion: version }),
  setLatestConnectorVersion: (version) => set({ latestConnectorVersion: version }),
  setIsCheckingVersions: (checking) => set({ isCheckingVersions: checking }),
  setIsUpdating: (updating) => set({ isUpdating: updating }),
  setUpdateStatus: (status) => set({ updateStatus: status }),
  setShowWelcomeWizard: (show) => set({ showWelcomeWizard: show }),

  handleLogin: (data) => {
    setSecureItem('authToken', data.token);
    setSecureItem('userEmail', data.email);
    setSecureItem('isAdmin', data.isAdmin);
    setSecureItem('appSettings', data.settings);
    setSecureItem('displayName', data.displayName || '');
    setSecureItem('profilePictureUrl', data.profilePictureUrl || null);

    const siteList = data.sites || [];
    setSecureItem('sites', siteList);

    let siteToSet = null;
    if (siteList.length > 0) {
        const lastUsedSiteId = getSecureItem<number>('lastUsedSiteId');
        siteToSet = siteList.find(s => s.id === lastUsedSiteId) || siteList[0];
        if (siteToSet) {
            setSecureItem('lastUsedSiteId', siteToSet.id);
        }
    }

    set({
      currentAppView: 'main_app',
      isLoggedIn: true,
      isAdmin: data.isAdmin,
      displayName: data.displayName || '',
      profilePictureUrl: data.profilePictureUrl || null,
      sites: siteList,
      currentSite: siteToSet,
    });
    
    const hasSeenWizard = getSecureItem<boolean>('hasSeenWelcomeWizard');
    if (data.isNewUser && !hasSeenWizard) {
        set({ showWelcomeWizard: true });
    }
  },

  handleLogout: () => {
    removeSecureItem('authToken');
    removeSecureItem('userEmail');
    removeSecureItem('isAdmin');
    removeSecureItem('sites');
    removeSecureItem('lastUsedSiteId');
    removeSecureItem('displayName');
    removeSecureItem('profilePictureUrl');
    removeSecureItem('appSettings'); // Also remove app settings on logout

    set({
      isLoggedIn: false,
      isAdmin: false,
      sites: [],
      currentSite: null,
      displayName: '',
      profilePictureUrl: null,
      currentView: 'dashboard', // Reset to default view
      authView: 'login',
      currentAppView: 'landing',
    });
  },

  loadAuthDataFromStorage: () => {
    const token = getSecureItem('authToken');
    if (token) {
        const isAdmin = !!getSecureItem<boolean>('isAdmin');
        const displayName = getSecureItem('displayName') || '';
        const profilePictureUrl = getSecureItem('profilePictureUrl');
        const sites = getSecureItem<SiteData[]>('sites') || [];
        
        let currentSite = null;
        if (sites.length > 0) {
            const lastUsedSiteId = getSecureItem<number>('lastUsedSiteId');
            currentSite = sites.find(s => s.id === lastUsedSiteId) || sites[0];
        }

        set({
            isLoggedIn: true,
            isAdmin,
            displayName,
            profilePictureUrl,
            sites,
            currentSite,
            currentAppView: 'main_app',
            // Do not override currentView, let URL hash handle it if present
        });
    }
  },

  updateProfileData: (displayName: string, profilePictureUrl: string | null) => {
    setSecureItem('displayName', displayName);
    setSecureItem('profilePictureUrl', profilePictureUrl);
    set({ displayName, profilePictureUrl });
  },
}));
