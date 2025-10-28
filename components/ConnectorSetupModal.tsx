

import React, { useState } from 'react';
import { CloseIcon, ConnectIcon, DownloadIcon, CopyIcon } from './icons/Icons';
import { pluginSourceCode } from '../plugin-source.js';
import { SiteData } from '../types';
import { addSite } from '../services/wordpressService';
import { encryptData } from '../utils/secureLocalStorage';

interface ConnectorSetupModalProps {
    onClose: () => void;
    onSiteAdded: (newSite: SiteData) => void;
}

const ConnectorSetupModal: React.FC<ConnectorSetupModalProps> = ({ onClose, onSiteAdded }) => {
    const [step, setStep] = useState(1);
    const [siteName, setSiteName] = useState('');
    const [siteUrl, setSiteUrl] = useState('');
    const [accessKey, setAccessKey] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copyText, setCopyText] = useState('Copy Source Code');

    const handleDownload = () => {
        const blob = new Blob([pluginSourceCode], { type: 'text/php' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dev-console-connector.php';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };
    
     const handleCopy = () => {
        navigator.clipboard.writeText(pluginSourceCode).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy Source Code'), 2000);
        });
    };

    const handleConnect = async () => {
        setError('');
        setIsLoading(true);
        if (!siteName || !siteUrl || !accessKey) {
            setError('All fields are required.');
            setIsLoading(false);
            return;
        }

        try {
            // Step 1: Ping the site to verify credentials
            const testUrl = `${siteUrl.replace(/\/$/, '')}/wp-json/dev-console/v1/execute`;
            const response = await fetch(testUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Access-Key': accessKey,
                },
                body: JSON.stringify({ action: 'ping' })
            });

            const data = await response.json();
            if (response.ok && data.data?.message === 'pong') {
                // Step 2: Save the verified details to the user's account via the backend
                const dataToEncrypt = { siteUrl, accessKey };
                const encryptedData = encryptData(dataToEncrypt);
                
                const newSite = await addSite(siteName, encryptedData);
                
                // Step 3: Update the local app state
                onSiteAdded({
                    id: newSite.id,
                    name: newSite.name,
                    ...dataToEncrypt
                });
            } else {
                 setError(`Connection failed: ${data.message || 'Invalid credentials, URL, or CORS settings on your WordPress site.'}`);
            }
        } catch (err) {
            setError(`Failed to connect or save settings: ${(err as Error).message}. Check your browser's console for CORS errors.`);
        } finally {
            setIsLoading(false);
        }
    };


    return (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-3xl flex flex-col p-6 modal-content-animation">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center">
                        <ConnectIcon className="w-6 h-6 mr-3 text-accent-blue" />
                        Connect to WordPress Site (Step {step} of 2)
                    </h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow min-h-0 py-4">
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">Step 1: Install the Connector Plugin</h3>
                            <p className="text-text-secondary">
                                First, you need to install our secure connector plugin on your WordPress site. This allows the Dev-Console to communicate with your site.
                            </p>
                             <div className="bg-background p-4 rounded-lg border border-border-primary text-sm prose prose-invert max-w-none">
                                <h4>Instructions</h4>
                                <ol className="list-decimal list-inside">
                                    <li>Click the "Download Plugin" button to get the connector plugin's PHP file.</li>
                                    <li>In your WordPress admin, go to "Plugins" &gt; "Add New" &gt; "Upload Plugin".</li>
                                    <li>Upload the downloaded file and activate the plugin.</li>
                                    <li>Once activated, find your Access Key under the "Dev-Console" menu in your WordPress admin dashboard for the next step.</li>
                                </ol>
                            </div>
                            <div className="mt-4 flex space-x-4">
                                <button onClick={handleDownload} className="btn btn-primary flex items-center">
                                    <DownloadIcon className="w-4 h-4 mr-2"/>
                                    Download Plugin
                                </button>
                                <button onClick={handleCopy} className="btn btn-secondary flex items-center">
                                    <CopyIcon className="w-4 h-4 mr-2"/>
                                    {copyText}
                                </button>
                            </div>
                        </div>
                    )}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-xl font-semibold">Step 2: Enter Connection Details</h3>
                             <p className="text-text-secondary">
                                Find the required key in the plugin's settings page ("Dev-Console") within your WordPress admin dashboard.
                            </p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium">Site Name (e.g., "My Blog", "Staging")</label>
                                    <input type="text" value={siteName} onChange={(e) => setSiteName(e.target.value)} className="input-field mt-1" placeholder="A friendly name for this site" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Site URL</label>
                                    <input type="text" value={siteUrl} onChange={(e) => setSiteUrl(e.target.value)} className="input-field mt-1" placeholder="https://example.com" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium">Access Key</label>
                                    <input type="password" value={accessKey} onChange={(e) => setAccessKey(e.target.value)} className="input-field mt-1" placeholder="Paste Access Key from plugin settings" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {error && <div className="text-center my-2 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-accent-red/80">{error}</div>}
                
                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border-primary">
                    <div>
                        {step === 2 && (
                            <button onClick={() => setStep(1)} className="btn btn-secondary">
                                Back
                            </button>
                        )}
                    </div>
                    <div className="flex items-center space-x-4">
                        <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                        {step === 1 && (
                            <button onClick={() => setStep(2)} className="btn btn-primary">
                                Next Step
                            </button>
                        )}
                        {step === 2 && (
                            <button onClick={handleConnect} disabled={isLoading} className="btn btn-primary">
                                {isLoading ? 'Connecting...' : 'Connect & Save'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConnectorSetupModal;