import React, { useState } from 'react';
import { CopyIcon, DownloadIcon } from './icons/Icons';

interface PluginSourceCodeProps {
    sourceCode: string;
}

const PluginSourceCode: React.FC<PluginSourceCodeProps> = ({ sourceCode }) => {
    const [copyText, setCopyText] = useState('Copy Code');

    const handleCopy = () => {
        navigator.clipboard.writeText(sourceCode).then(() => {
            setCopyText('Copied!');
            setTimeout(() => setCopyText('Copy Code'), 2000);
        }, (err) => {
            console.error('Failed to copy: ', err);
            setCopyText('Copy Failed');
            setTimeout(() => setCopyText('Copy Code'), 2000);
        });
    };

    const handleDownload = () => {
        const blob = new Blob([sourceCode], { type: 'text/php' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'gemini-copilot-connector.php';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="mt-4 bg-background p-4 rounded-lg border border-border-primary relative">
            <div className="absolute top-2 right-2 flex space-x-2 z-10">
                <button onClick={handleCopy} className="inline-flex items-center px-3 py-1 text-xs bg-background-secondary hover:bg-border-primary rounded-md transition-colors">
                    <CopyIcon className="w-4 h-4 mr-2"/>
                    {copyText}
                </button>
                <button onClick={handleDownload} className="inline-flex items-center px-3 py-1 text-xs bg-accent-blue hover:bg-accent-blue-hover text-white rounded-md transition-colors">
                    <DownloadIcon className="w-4 h-4 mr-2"/>
                    Download
                </button>
            </div>
            <pre className="text-xs font-mono whitespace-pre w-full h-64 overflow-auto text-text-primary">
                <code>{sourceCode}</code>
            </pre>
        </div>
    );
};

export default PluginSourceCode;