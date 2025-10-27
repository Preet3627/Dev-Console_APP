import React, { useState } from 'react';
import { PM_SHRI_Logo, CopyIcon, RefreshIcon, DownloadIcon } from './icons/Icons';

const envTemplate = `
# Database Configuration (replace with your values)
DB_HOST=127.0.0.1
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_DATABASE=dev_console

# Application Secrets (IMPORTANT: Use strong, random values)
JWT_SECRET=generate_a_strong_random_secret_here
GOOGLE_CLIENT_ID=your_google_oauth_client_id.apps.googleusercontent.com

# Optional: Default Admin User (for first-time setup)
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=a_strong_and_secure_password

# Optional: SMTP Email Configuration (for user verification emails)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_smtp_username
SMTP_PASS=your_smtp_password
SMTP_FROM="Your App Name" <noreply@yourdomain.com>
`.trim();

interface DatabaseSetupProps {
    onStatusRefresh: () => void;
    error: string | null;
}

const DatabaseSetup: React.FC<DatabaseSetupProps> = ({ onStatusRefresh, error }) => {
    const [copyText, setCopyText] = useState('Copy Template');

    const handleCopy = () => {
        navigator.clipboard.writeText(envTemplate).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy Template'), 2000);
        });
    };
    
    const handleDownload = () => {
        const blob = new Blob([envTemplate], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = '.env.example';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="flex items-center justify-center h-screen login-gradient-bg p-4">
            <div className="w-full max-w-2xl p-8 space-y-6 glass-card overflow-y-auto max-h-full">
                <div className="text-center">
                    <PM_SHRI_Logo className="w-16 h-16 mx-auto mb-4" />
                    <h1 className="text-3xl font-bold text-text-primary">Backend Setup Required</h1>
                    <p className="mt-2 text-text-secondary">The backend server needs to be configured before you can log in.</p>
                </div>

                {error && (
                    <div className="p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-center text-accent-red/80">
                        <strong>Configuration Error:</strong> {error}
                    </div>
                )}
                
                <div className="space-y-4 text-sm">
                    <p>To continue, you need to create a <code className="font-mono bg-background px-1 rounded">.env</code> file in the root directory of the project and provide your database credentials and application secrets.</p>
                    
                    <div className="prose prose-sm prose-invert max-w-none">
                        <h4>Instructions:</h4>
                        <ol className="list-decimal list-inside space-y-1">
                            <li>Create a new file named <code className="font-mono bg-background px-1 rounded">.env</code> in the project's root folder.</li>
                            <li>Copy the template below (or download it) and paste it into your new <code className="font-mono bg-background px-1 rounded">.env</code> file.</li>
                            <li>Update the placeholder values for your local MySQL database, secrets, and other services.</li>
                            <li><strong>Restart the application server</strong> (i.e., stop and re-run <code className="font-mono bg-background px-1 rounded">npm run dev</code>).</li>
                            <li>Click the "Refresh Status" button below.</li>
                        </ol>
                    </div>

                    <div>
                        <h4 className="font-semibold mb-2">.env File Template</h4>
                        <div className="relative bg-background p-4 rounded-md border border-border-primary">
                             <div className="absolute top-2 right-2 flex space-x-2">
                                <button onClick={handleDownload} className="flex items-center px-2 py-1 text-xs bg-background-secondary hover:bg-border-primary rounded">
                                    <DownloadIcon className="w-4 h-4 mr-1"/>
                                    Download
                                </button>
                                <button onClick={handleCopy} className="flex items-center px-2 py-1 text-xs bg-background-secondary hover:bg-border-primary rounded">
                                    <CopyIcon className="w-4 h-4 mr-1"/>
                                    {copyText}
                                </button>
                            </div>
                            <pre className="text-xs font-mono whitespace-pre-wrap"><code>{envTemplate}</code></pre>
                        </div>
                    </div>
                </div>

                <div className="pt-4 text-center">
                    <button onClick={onStatusRefresh} className="btn btn-primary w-full md:w-3/4 flex items-center justify-center mx-auto">
                        <RefreshIcon className="w-4 h-4 mr-2"/>
                        I've configured the .env file. Refresh Status.
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DatabaseSetup;