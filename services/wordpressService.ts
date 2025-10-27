import { SiteData, AppSettings, Asset, AssetType, AssetFile, BackupFile, SecurityIssue, ErrorLog, BackendConfigStatus } from '../types';
import { getSecureItem, setSecureItem, removeSecureItem, encryptData, decryptData } from '../utils/secureLocalStorage';

const MASTER_API_BASE_URL = '/dev-console-api/v1';

const getAuthToken = (): string | null => getSecureItem<string>('authToken');

// Generic fetch function for the MASTER API (user auth, settings)
const masterApiFetch = async (endpoint: string, options: RequestInit = {}): Promise<any> => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${MASTER_API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'An unknown error occurred', code: 'unknown_error' }));
        if (errorData.code === 'account_not_verified') {
            const err = new Error(errorData.message || 'Account not verified.');
            (err as any).cause = 'NOT_VERIFIED';
            throw err;
        }
        throw new Error(errorData.message || `Request failed with status ${response.status}`);
    }
    
    if (response.status === 204) return null;

    return response.json();
};


// Generic fetch function for the CONNECTOR plugin API (site-specific actions)
const connectorApiFetch = async (siteData: SiteData, payload: object): Promise<any> => {
    const { siteUrl, connectorKey, apiKey } = siteData;
    const url = `${siteUrl.replace(/\/$/, '')}/wp-json/dev-console/v1/execute`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Connector-Key': connectorKey,
            'X-Api-Key': apiKey,
        },
        body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    if (!response.ok || (responseData.success === false)) {
        throw new Error(responseData.message || responseData.data?.message || `Request failed with status ${response.status}`);
    }
    return responseData.data;
};

// --- Status Check ---
export const getBackendStatus = async (): Promise<{ backend: string; database: string; message?: string }> => {
    try {
        const response = await fetch(`${MASTER_API_BASE_URL}/status`);
        if (!response.ok) {
            try {
                const errorData = await response.json();
                return { backend: 'ok', ...errorData };
            } catch {
                return { backend: 'ok', database: 'error', message: `Server responded with status ${response.status}` };
            }
        }
        return await response.json();
    } catch (error) {
        return {
            backend: 'error',
            database: 'unknown',
            message: 'Failed to connect to the backend server. Is it running?'
        };
    }
};

// --- Public Config ---
export const getPublicConfig = async (): Promise<{ googleClientId?: string }> => {
    try {
        const response = await fetch(`${MASTER_API_BASE_URL}/public-config`);
        if (!response.ok) {
            console.error(`Failed to fetch public config: ${response.statusText}`);
            return {};
        }
        return await response.json();
    } catch (error) {
        console.error('Network error while fetching public config:', error);
        return {};
    }
};

// --- Connection Test ---
export const testConnection = async (siteData: SiteData): Promise<any> => {
    return connectorApiFetch(siteData, { action: 'ping' });
};


// --- Auth Functions ---
export const loginUser = async (email: string, password: string): Promise<{ token: string, email: string, isAdmin: boolean, settings: AppSettings, siteData: SiteData | null, displayName: string, profilePictureUrl: string | null }> => {
    const response = await masterApiFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
    return response;
};

export const registerUser = async (email: string, password: string): Promise<{ success: boolean, message: string }> => {
    return masterApiFetch('/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
    });
};

export const verifyUser = async (email: string, code: string): Promise<{ success: boolean, message: string }> => {
    return masterApiFetch('/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code }),
    });
};

export const resendVerificationCode = async (email: string): Promise<{ success: boolean, message: string }> => {
    return masterApiFetch('/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};

export const signInWithGoogle = async (googleToken: string): Promise<{ token: string, email: string, isAdmin: boolean, settings: AppSettings, siteData: SiteData | null, displayName: string, profilePictureUrl: string | null }> => {
    const response = await masterApiFetch('/google-signin', {
        method: 'POST',
        body: JSON.stringify({ token: googleToken }),
    });
    return response;
};

export const requestPasswordReset = async (email: string): Promise<{ message: string }> => {
    return masterApiFetch('/request-reset', {
        method: 'POST',
        body: JSON.stringify({ email }),
    });
};

// FIX: Added the missing 'addSite' function to handle creating new site connections via the backend API.
export const addSite = async (name: string, site_data_encrypted: string): Promise<{ id: number; name: string; site_data_encrypted: string; }> => {
    return masterApiFetch('/sites', {
        method: 'POST',
        body: JSON.stringify({ name, site_data_encrypted }),
    });
};

// --- Settings & Site Data ---
export const saveAppSettings = async (settings: AppSettings): Promise<void> => {
    await masterApiFetch('/settings', {
        method: 'POST',
        body: JSON.stringify(settings),
    });
};

export const saveUserProfile = async (profile: { displayName: string, profilePictureUrl?: string }): Promise<{ success: boolean }> => {
    return masterApiFetch('/profile', {
        method: 'POST',
        body: JSON.stringify(profile),
    });
};


export const getEncryptedSiteData = async (): Promise<SiteData | null> => {
    try {
        const response = await masterApiFetch('/site-data');
        return decryptData<SiteData>(response.data);
    } catch (error) {
        console.warn("Couldn't fetch remote site data, falling back to local.", error);
        return getSecureItem<SiteData>('siteData');
    }
};

export const updateAndEncryptSiteData = async (siteData: SiteData): Promise<void> => {
    const encryptedData = encryptData(siteData);
    await masterApiFetch('/site-data', {
        method: 'POST',
        body: JSON.stringify({ data: encryptedData }),
    });
};

// --- Cloud & Proxy Services ---
export const proxyNextcloudRequest = async (action: 'verify' | 'upload_backup', payload?: any): Promise<{ success: boolean; details?: any }> => {
    return masterApiFetch('/nextcloud', {
        method: 'POST',
        body: JSON.stringify({ action, payload }),
    });
};

// --- Connector Plugin Update ---
export const getLatestConnectorPlugin = async (): Promise<{ version: string; source: string }> => {
    return masterApiFetch('/connector-plugin/latest');
};

export const updateConnectorPlugin = async (siteData: SiteData, content: string): Promise<{ status: string }> => {
    return connectorApiFetch(siteData, {
        action: 'update_plugin_file',
        payload: {
            plugin_type: 'connector',
            content: content
        }
    });
};

// --- Asset Management ---
export const listAssets = async (siteData: SiteData, assetType: AssetType): Promise<Asset[]> => {
    return connectorApiFetch(siteData, { action: 'list_assets', payload: { assetType } });
};

export const toggleAssetStatus = async (siteData: SiteData, assetType: AssetType, assetIdentifier: string, newStatus: boolean): Promise<{ status: string }> => {
    return connectorApiFetch(siteData, { action: 'toggle_asset_status', payload: { assetType, assetIdentifier, newStatus } });
};

export const deleteAsset = async (siteData: SiteData, assetType: AssetType, assetIdentifier: string): Promise<{ status: string }> => {
    return connectorApiFetch(siteData, { action: 'delete_asset', payload: { assetType, assetIdentifier } });
};

export const installAsset = async (siteData: SiteData, assetType: AssetType, assetName: string, files: AssetFile[]): Promise<{ status: string }> => {
    const encodedFiles = files.map(file => ({
        name: file.name,
        content: btoa(file.content || '') // Base64 encode content
    }));
    return connectorApiFetch(siteData, { action: 'install_asset', payload: { assetType, assetName, files: encodedFiles } });
};

// --- File Management ---
export const getAssetFiles = async (siteData: SiteData, assetIdentifier: string, assetType: AssetType): Promise<AssetFile[]> => {
    return connectorApiFetch(siteData, { action: 'get_asset_files', payload: { assetIdentifier, assetType } });
};

export const readFileContent = async (siteData: SiteData, assetIdentifier: string, assetType: AssetType, relativePath: string): Promise<{ content: string }> => {
    return connectorApiFetch(siteData, { action: 'read_file_content', payload: { assetIdentifier, assetType, relativePath } });
};

export const writeFileContent = async (siteData: SiteData, assetIdentifier: string, assetType: AssetType, relativePath: string, content: string): Promise<{ status: string }> => {
    return connectorApiFetch(siteData, { action: 'write_file_content', payload: { assetIdentifier, assetType, relativePath, content } });
};

export const getFileHistory = async (siteData: SiteData, assetIdentifier: string, assetType: AssetType, relativePath: string): Promise<BackupFile[]> => {
    return connectorApiFetch(siteData, { action: 'get_file_history', payload: { assetIdentifier, assetType, relativePath } });
};

export const restoreFile = async (siteData: SiteData, assetIdentifier: string, assetType: AssetType, relativePath: string, backupPath: string): Promise<{ status: string }> => {
    return connectorApiFetch(siteData, { action: 'restore_file', payload: { assetIdentifier, assetType, relativePath, backupPath } });
};

// --- Database ---
export const getDbTables = async (siteData: SiteData): Promise<string[]> => {
    return connectorApiFetch(siteData, { action: 'get_db_tables' });
};

export const executeSafeDbQuery = async (siteData: SiteData, queryType: string, params: any): Promise<any[]> => {
    return connectorApiFetch(siteData, { action: 'execute_safe_db_query', payload: { queryType, params } });
};

// --- Tools & Scanners ---
export const runSecurityScan = async (siteData: SiteData): Promise<SecurityIssue[]> => {
    return connectorApiFetch(siteData, { action: 'run_security_scan' });
};

export const getDebugLog = async (siteData: SiteData): Promise<{ content: string }> => {
    return connectorApiFetch(siteData, { action: 'get_debug_log' });
};

// --- Backup & Restore ---
export const createSiteBackup = async (siteData: SiteData): Promise<{ status: string; fileName: string; content: string }> => {
    return connectorApiFetch(siteData, { action: 'create_site_backup' });
};

export const listSiteBackups = async (siteData: SiteData): Promise<any[]> => {
    return connectorApiFetch(siteData, { action: 'list_site_backups' });
};

// --- Admin Functions ---
export const listAllUsers = async (): Promise<any[]> => {
    return masterApiFetch('/users');
};

export const deleteUser = async (email: string): Promise<{ success: boolean }> => {
    return masterApiFetch('/users', {
        method: 'DELETE',
        body: JSON.stringify({ email }),
    });
};

export const getBackendConfigStatus = async (): Promise<BackendConfigStatus> => {
    return masterApiFetch('/backend-config-status');
};