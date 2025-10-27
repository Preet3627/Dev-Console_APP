import React from 'react';
import { DownloadIcon, ServerIcon } from './icons/Icons';
import { masterPluginSourceCode } from '../master-plugin-source';

const SystemTools: React.FC = () => {

    const handleDownload = () => {
        const blob = new Blob([masterPluginSourceCode], { type: 'text/php' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dev-console-master-controller.php';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8 flex items-center">
                <ServerIcon className="w-8 h-8 mr-4 text-accent-cyan" />
                System Tools & Core Plugins
            </h1>
            
            <div className="max-w-3xl">
                <p className="text-text-secondary mb-6">
                    Download and install the core plugin on your WordPress site to enable centralized functionality like user management, security, and email services.
                </p>
                <div className="glass-card p-6">
                    <h2 className="text-xl font-semibold mb-2">Master Controller Plugin</h2>
                    <p className="text-sm text-text-secondary mb-4">
                       A centralized WordPress plugin to securely manage users, API access (CORS), and provide credentials to other plugins on your site. <strong>This plugin is required for the Connector Plugin to function correctly.</strong>
                    </p>
                    <div className="prose prose-sm prose-invert max-w-none text-text-secondary mt-4">
                        <h4>Installation</h4>
                        <ol>
                            <li>Download the Master Controller plugin file.</li>
                            <li>In your WordPress admin, go to Plugins &gt; Add New &gt; Upload Plugin.</li>
                            <li>Upload the file and activate it.</li>
                            <li>Configure CORS settings under the new "Dev-Console" menu in WordPress.</li>
                        </ol>
                    </div>
                    <div className="mt-6">
                         <button onClick={handleDownload} className="btn btn-primary flex items-center">
                            <DownloadIcon className="w-4 h-4 mr-2"/>
                            Download Master Controller
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SystemTools;
