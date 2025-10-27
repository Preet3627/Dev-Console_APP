import React, { useState, useEffect } from 'react';
import { getSecureItem, setSecureItem } from '../utils/secureLocalStorage';
import { AppSettings, SiteData } from '../types';
import { saveAppSettings } from '../services/wordpressService';
import { verifyConnection as verifyNextcloudConnection } from '../services/nextcloudService';
import { getGoogleApiToken } from '../services/googleAuthService';

interface SettingsProps {
    onDisconnect: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onDisconnect }) => {
    const [settings, setSettings] = useState<AppSettings>({});
    const [saveMessage, setSaveMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showKeys, setShowKeys] = useState(false);
    const [nextcloudStatus, setNextcloudStatus] = useState('');
    const [googleDriveStatus, setGoogleDriveStatus] = useState('');

    useEffect(() => {
        const loadedSettings = getSecureItem<AppSettings>('appSettings');
        if (loadedSettings) {
            setSettings(loadedSettings);
        }
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
                             <input type="text" name="geminiModel" value={settings.geminiModel || ''} onChange={handleInputChange} className="input-field mt-2 text-sm" placeholder="Model name (e.g., gemini-2.5-flash)"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">OpenAI API Key</label>
                            <input type={showKeys ? 'text' : 'password'} name="openAiApiKey" value={settings.openAiApiKey || ''} onChange={handleInputChange} className="input-field mt-1" placeholder="Enter your OpenAI API Key" />
                            <input type="text" name="openAiModel" value={settings.openAiModel || ''} onChange={handleInputChange} className="input-field mt-2 text-sm" placeholder="Model name (e.g., gpt-4o)"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-primary">Anthropic Claude API Key</label>
                            <input type={showKeys ? 'text' : 'password'} name="claudeApiKey" value={settings.claudeApiKey || ''} onChange={handleInputChange} className="input-field mt-1" placeholder="Enter your Claude API Key" />
                             <input type="text" name="claudeModel" value={settings.claudeModel || ''} onChange={handleInputChange} className="input-field mt-2 text-sm" placeholder="Model name (e.g., claude-3-haiku-20240307)"/>
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
                            <h2 className="text-xl font-semibold">Save All Settings</h2>
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