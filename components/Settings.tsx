import React, { useState, useEffect } from 'react';
import { getSecureItem, setSecureItem } from '../utils/secureLocalStorage';
import { AppSettings, SiteData } from '../types';
import { saveAppSettings, saveUserProfile } from '../services/wordpressService';
import { verifyConnection as verifyNextcloudConnection } from '../services/nextcloudService';
import { getGoogleApiToken } from '../services/googleAuthService';

interface SettingsProps {
    onDisconnect: () => void;
    siteData: SiteData | null;
    onProfileUpdate: () => void;
    connectorVersionInfo: {
        connectorVersion: string | null;
        latestConnectorVersion: string | null;
        isCheckingVersions: boolean;
        isUpdating: boolean;
        updateStatus: string;
    };
    onUpdateConnector: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onDisconnect, siteData, onProfileUpdate, connectorVersionInfo, onUpdateConnector }) => {
    const [settings, setSettings] = useState<AppSettings>({});
    const [saveMessage, setSaveMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showKeys, setShowKeys] = useState(false);
    
    // User profile state
    const [displayName, setDisplayName] = useState('');
    const [profilePictureUrl, setProfilePictureUrl] = useState('');
    const [profileSaveMessage, setProfileSaveMessage] = useState('');

    // Cloud connection statuses
    const [nextcloudStatus, setNextcloudStatus] = useState('');
    const [googleDriveStatus, setGoogleDriveStatus] = useState('');

    const { connectorVersion, latestConnectorVersion, isCheckingVersions, isUpdating, updateStatus } = connectorVersionInfo;
    
    useEffect(() => {
        const loadedSettings = getSecureItem<AppSettings>('appSettings') || {};
        setSettings(loadedSettings);
        setDisplayName(getSecureItem('displayName') || '');
        setProfilePictureUrl(getSecureItem('profilePictureUrl') || '');
    }, []);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setSettings(prev => ({ ...prev, [name]: checked }));
    };
    
    const handleNestedInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const [parent, child] = name.split('.');
        setSettings(prev => ({
            ...prev,
            [parent]: {
                // @ts-ignore
                ...prev[parent],
                [child]: value,
            }
        }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        setSaveMessage('');
        try {
            await saveAppSettings(settings);
            setSecureItem('appSettings', settings);
            setSaveMessage('Settings saved successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (error) {
            setSaveMessage(`Error saving settings: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleProfileSave = async () => {
        setIsLoading(true);
        setProfileSaveMessage('');
        try {
            await saveUserProfile({ displayName, profilePictureUrl });
            setSecureItem('displayName', displayName);
            setSecureItem('profilePictureUrl', profilePictureUrl);
            onProfileUpdate();
            setProfileSaveMessage('Profile saved successfully!');
             setTimeout(() => setProfileSaveMessage(''), 3000);
        } catch (error) {
            setProfileSaveMessage(`Error saving profile: ${(error as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleTestNextcloud = async () => {
        setNextcloudStatus('Testing connection...');
        try {
            const success = await verifyNextcloudConnection();
            setNextcloudStatus(success ? 'Connection successful!' : 'Connection failed. Check credentials.');
        } catch (err) {
            setNextcloudStatus(`Connection failed: ${(err as Error).message}`);
        }
    };
    
    const handleAuthenticateWithDrive = async () => {
        setGoogleDriveStatus('Authenticating...');
        try {
            await getGoogleApiToken('https://www.googleapis.com/auth/drive.file');
            setGoogleDriveStatus('Successfully authenticated with Google Drive.');
        } catch (err) {
            setGoogleDriveStatus(`Authentication failed: ${(err as Error).message}`);
        }
    };
    
    return (
        <div>
            <h1 className="text-4xl font-bold mb-8">Settings</h1>
            
            <div className="max-w-3xl space-y-8">
                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-4">User Profile</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Display Name</label>
                            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className="input-field mt-1" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Profile Picture URL</label>
                            <input type="text" value={profilePictureUrl} onChange={(e) => setProfilePictureUrl(e.target.value)} className="input-field mt-1" placeholder="https://example.com/avatar.png" />
                        </div>
                    </div>
                     <div className="flex justify-end items-center mt-4">
                        {profileSaveMessage && <p className={`text-sm mr-4 ${profileSaveMessage.startsWith('Error') ? 'text-accent-red' : 'text-accent-green'}`}>{profileSaveMessage}</p>}
                        <button onClick={handleProfileSave} className="btn btn-primary" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Profile'}
                        </button>
                    </div>
                </div>

                {siteData && (
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-semibold mb-4">Connector Plugin Management</h2>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-text-secondary">Installed Version:</span>
                                <span>{isCheckingVersions ? 'Checking...' : connectorVersion || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-text-secondary">Latest Version:</span>
                                <span>{isCheckingVersions ? 'Checking...' : latestConnectorVersion || 'N/A'}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-4 pt-4 border-t border-border-primary">
                             <div className="flex items-center space-x-2">
                                <input id="auto-update-toggle" type="checkbox" name="autoUpdateConnector" checked={settings.autoUpdateConnector || false} onChange={handleCheckboxChange} className="h-4 w-4 rounded border-gray-300 text-accent-blue focus:ring-accent-blue" />
                                <label htmlFor="auto-update-toggle" className="text-sm font-medium text-text-secondary">Auto-update plugin</label>
                            </div>
                            <button onClick={onUpdateConnector} disabled={isUpdating || isCheckingVersions || connectorVersion === latestConnectorVersion} className="btn btn-secondary disabled:opacity-50">
                                {isUpdating ? 'Updating...' : 'Update Now'}
                            </button>
                        </div>
                        {updateStatus && <p className="text-xs mt-3 text-center">{updateStatus}</p>}
                    </div>
                )}
                
                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-4">Co-Pilot Keyboard Shortcuts</h2>
                    <div className="space-y-3 text-sm">
                        <div className="flex items-center justify-between py-1">
                            <p className="text-text-primary">Send Message / Add to Queue</p>
                            <div className="font-mono">
                                <kbd>Ctrl</kbd> + <kbd>Enter</kbd>
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-1">
                            <p className="text-text-primary">New Line</p>
                            <div className="font-mono">
                                <kbd>Enter</kbd>
                            </div>
                        </div>
                        <div className="flex items-center justify-between py-1">
                            <p className="text-text-primary">Toggle Automatic Execution</p>
                            <div className="font-mono">
                                <kbd>Shift</kbd> + <kbd>Tab</kbd>
                            </div>
                        </div>
                         <div className="flex items-center justify-between py-1">
                            <p className="text-text-primary">Edit Last Queued Prompt</p>
                            <div>
                                <kbd>↑</kbd> <span className="text-xs text-text-secondary font-mono">(Input must be empty)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold">API Keys & AI Configuration</h2>
                         <div className="flex items-center space-x-2">
                            <input id="show-keys-toggle" type="checkbox" checked={showKeys} onChange={() => setShowKeys(!showKeys)} className="h-4 w-4 rounded border-gray-300 text-accent-blue focus:ring-accent-blue" />
                            <label htmlFor="show-keys-toggle" className="text-sm font-medium text-text-secondary">Show API Keys</label>
                        </div>
                    </div>
                     <div className="space-y-4">
                        <div className="flex items-center justify-between p-2 rounded-md bg-background">
                            <div>
                                <label htmlFor="creditSaverEnabled" className="font-medium text-text-primary">AI Credit Saver Mode</label>
                                <p className="text-xs text-text-secondary">Uses faster, cheaper models for non-critical tasks.</p>
                            </div>
                            <input type="checkbox" id="creditSaverEnabled" name="creditSaverEnabled" checked={settings.creditSaverEnabled || false} onChange={handleCheckboxChange} className="h-5 w-5 rounded border-gray-300 text-accent-blue focus:ring-accent-blue" />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-primary">Primary AI Provider</label>
                            <select name="aiProvider" value={settings.aiProvider || 'gemini'} onChange={handleInputChange} className="input-field mt-1 !p-3">
                                <option value="gemini">Google Gemini</option>
                                <option value="openai">OpenAI</option>
                                <option value="claude">Anthropic Claude</option>
                                <option value="groq">Groq</option>
                                <option value="perplexity">Perplexity</option>
                            </select>
                        </div>
                        <hr className="border-border"/>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Google Gemini API Key</label>
                            <input type={showKeys ? 'text' : 'password'} name="geminiApiKey" value={settings.geminiApiKey || ''} onChange={handleInputChange} className="input-field mt-1" placeholder="Enter your Gemini API Key"/>
                            <label className="block text-xs font-medium text-text-secondary mt-2">Gemini Model (for powerful tasks)</label>
                            <select name="geminiModel" value={settings.geminiModel || 'gemini-2.5-pro'} onChange={handleInputChange} className="input-field mt-1 !py-2 text-sm">
                                <option value="gemini-2.5-pro">Gemini 2.5 Pro (Most Capable)</option>
                                <option value="gemini-2.5-flash">Gemini 2.5 Flash (Fast & Efficient)</option>
                                <option value="gemini-flash-latest">Gemini Flash Latest</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">OpenAI API Key</label>
                            <input type={showKeys ? 'text' : 'password'} name="openAiApiKey" value={settings.openAiApiKey || ''} onChange={handleInputChange} className="input-field mt-1" placeholder="Enter your OpenAI API Key" />
                             <label className="block text-xs font-medium text-text-secondary mt-2">OpenAI Model</label>
                            <select name="openAiModel" value={settings.openAiModel || 'gpt-4o'} onChange={handleInputChange} className="input-field mt-1 !py-2 text-sm">
                                <option value="gpt-4o">GPT-4o (Latest)</option>
                                <option value="gpt-4o-mini">GPT-4o Mini (Fast & Affordable)</option>
                                <option value="gpt-4-turbo">GPT-4 Turbo</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Anthropic Claude API Key</label>
                            <input type={showKeys ? 'text' : 'password'} name="claudeApiKey" value={settings.claudeApiKey || ''} onChange={handleInputChange} className="input-field mt-1" placeholder="Enter your Claude API Key" />
                            <label className="block text-xs font-medium text-text-secondary mt-2">Claude Model</label>
                            <select name="claudeModel" value={settings.claudeModel || 'claude-3-sonnet-20240229'} onChange={handleInputChange} className="input-field mt-1 !py-2 text-sm">
                                <option value="claude-3-opus-20240229">Claude 3 Opus (Most Powerful)</option>
                                <option value="claude-3-sonnet-20240229">Claude 3 Sonnet (Balanced)</option>
                                <option value="claude-3-haiku-20240307">Claude 3 Haiku (Fastest)</option>
                            </select>
                        </div>
                        <hr className="border-border"/>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Groq API Key</label>
                            <input type={showKeys ? 'text' : 'password'} name="groqApiKey" value={settings.groqApiKey || ''} onChange={handleInputChange} className="input-field mt-1" placeholder="Enter your Groq API Key" />
                            <label className="block text-xs font-medium text-text-secondary mt-2">Groq Model</label>
                            <select name="groqModel" value={settings.groqModel || 'llama3-70b-8192'} onChange={handleInputChange} className="input-field mt-1 !py-2 text-sm">
                                <option value="llama3-70b-8192">Llama3 70b</option>
                                <option value="llama3-8b-8192">Llama3 8b</option>
                                <option value="mixtral-8x7b-32768">Mixtral 8x7b</option>
                                <option value="gemma-7b-it">Gemma 7b</option>
                            </select>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-primary">Perplexity API Key</label>
                            <input type={showKeys ? 'text' : 'password'} name="perplexityApiKey" value={settings.perplexityApiKey || ''} onChange={handleInputChange} className="input-field mt-1" placeholder="Enter your Perplexity API Key" />
                             <label className="block text-xs font-medium text-text-secondary mt-2">Perplexity Model</label>
                            <select name="perplexityModel" value={settings.perplexityModel || 'llama-3-sonar-large-32k-online'} onChange={handleInputChange} className="input-field mt-1 !py-2 text-sm">
                                <option value="llama-3-sonar-large-32k-online">Llama 3 Sonar Large (Online)</option>
                                <option value="llama-3-sonar-small-32k-online">Llama 3 Sonar Small (Online)</option>
                            </select>
                        </div>
                        <hr className="border-border"/>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Google OAuth Client ID</label>
                            <input type={showKeys ? 'text' : 'password'} name="googleClientId" value={settings.googleClientId || ''} onChange={handleInputChange} className="input-field mt-1" placeholder="Required for Google Sign-In & Drive" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Google PageSpeed API Key</label>
                            <input type={showKeys ? 'text' : 'password'} name="pageSpeedApiKey" value={settings.pageSpeedApiKey || ''} onChange={handleInputChange} className="input-field mt-1" placeholder="Required for Performance Optimizer" />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-4">Cloud Backup: Nextcloud</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Nextcloud Server URL</label>
                            <input type="text" name="nextcloud.serverUrl" value={settings.nextcloud?.serverUrl || ''} onChange={handleNestedInputChange} className="input-field mt-1" placeholder="e.g., https://cloud.example.com" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Nextcloud Username</label>
                            <input type="text" name="nextcloud.username" value={settings.nextcloud?.username || ''} onChange={handleNestedInputChange} className="input-field mt-1" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Nextcloud App Password</label>
                            <input type={showKeys ? 'text' : 'password'} name="nextcloud.password" value={settings.nextcloud?.password || ''} onChange={handleNestedInputChange} className="input-field mt-1" placeholder="Create an app-specific password in Nextcloud"/>
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-text-primary">Nextcloud Backup Path</label>
                            <input type="text" name="nextcloud.backupPath" value={settings.nextcloud?.backupPath || 'dev-console-backups'} onChange={handleNestedInputChange} className="input-field mt-1" />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center space-x-4">
                        <button onClick={handleTestNextcloud} className="btn btn-secondary">Test Connection</button>
                        {nextcloudStatus && <p className="text-sm">{nextcloudStatus}</p>}
                    </div>
                </div>
                
                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-4">Cloud Backup: Google Drive</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Google Drive Folder Name</label>
                            <input type="text" name="googleDrive.folderName" value={settings.googleDrive?.folderName || 'Dev-Console Backups'} onChange={handleNestedInputChange} className="input-field mt-1" />
                        </div>
                    </div>
                    <div className="mt-6 flex items-center space-x-4">
                        <button onClick={handleAuthenticateWithDrive} className="btn btn-secondary">Authenticate with Google Drive</button>
                        {googleDriveStatus && <p className="text-sm">{googleDriveStatus}</p>}
                    </div>
                </div>

                <div className="glass-card p-6">
                    <div className="flex justify-between items-center">
                         <div>
                            <h2 className="text-xl font-semibold">Save App & API Settings</h2>
                            <p className="text-text-secondary text-sm mt-1">
                                Your application settings are securely saved to your user account.
                            </p>
                        </div>
                        <div className="flex items-center space-x-4">
                             {saveMessage && <p className={`text-sm ${saveMessage.startsWith('Error') ? 'text-accent-red' : 'text-accent-green'}`}>{saveMessage}</p>}
                            <button onClick={handleSave} className="btn btn-primary" disabled={isLoading}>
                                {isLoading ? 'Saving...' : 'Save All Settings'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-2">Account</h2>
                    <p className="text-text-secondary text-sm mb-4">
                        This will log you out of the application and clear any connected site data from this device.
                    </p>
                    <button onClick={onDisconnect} className="btn btn-secondary border-accent-red/50 text-accent-red hover:bg-accent-red/20">Log Out</button>
                </div>
            </div>
        </div>
    );
};

export default Settings;