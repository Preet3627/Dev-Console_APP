import React, { useState, useEffect, useMemo } from 'react';
import { getDebugLog } from '../services/wordpressService';
import { SiteData, ErrorLog } from '../types';
import LogErrorAnalysisModal from './LogErrorAnalysisModal';
import { GenerateIcon } from './icons/Icons';

interface PluginLogViewerProps {
    siteData: SiteData;
}

const parseLogContent = (content: string): ErrorLog[] => {
    const entries: ErrorLog[] = [];
    // Split by the common start of a PHP log entry: [DD-Mon-YYYY HH:MM:SS UTC]
    const lines = content.split(/(?=\[\d{2}-[A-Za-z]{3}-\d{4} \d{2}:\d{2}:\d{2} UTC\])/);

    lines.forEach(line => {
        if (line.trim() === '') return;

        const timestampMatch = line.match(/^\[(.*?)\]/);
        const timestamp = timestampMatch ? new Date(timestampMatch[1].replace(' UTC', '')).toISOString() : new Date().toISOString();
        
        const messageContent = line.substring(timestampMatch ? timestampMatch[0].length : 0).trim();
        const [message, ...stackParts] = messageContent.split('Stack trace:');
        
        entries.push({
            timestamp,
            message: message.trim(),
            stack: stackParts.length > 0 ? 'Stack trace:' + stackParts.join('Stack trace:') : undefined,
        });
    });

    return entries.reverse(); // Show most recent first
};


const PluginLogViewer: React.FC<PluginLogViewerProps> = ({ siteData }) => {
    const [logContent, setLogContent] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedLog, setSelectedLog] = useState<ErrorLog | null>(null);

    useEffect(() => {
        const fetchLog = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const { content } = await getDebugLog(siteData);
                setLogContent(content);
            } catch (err) {
                setError((err as Error).message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchLog();
    }, [siteData]);
    
    const parsedLogs = useMemo(() => parseLogContent(logContent), [logContent]);

    const renderContent = () => {
        if (isLoading) {
            return <div className="text-center p-8">Loading debug log...</div>;
        }
        if (error) {
            return (
                <div className="text-center p-8">
                    <p className="text-accent-red mb-4">{error}</p>
                    <p className="text-text-secondary">To enable the log viewer, ensure <code className="bg-background px-1 rounded-sm">WP_DEBUG</code> and <code className="bg-background px-1 rounded-sm">WP_DEBUG_LOG</code> are set to <code className="bg-background px-1 rounded-sm">true</code> in your site's <code className="bg-background px-1 rounded-sm">wp-config.php</code> file.</p>
                </div>
            );
        }
        if (parsedLogs.length === 0) {
            return <div className="text-center p-8 text-text-secondary">The debug.log file is empty or contains no valid entries.</div>;
        }

        return (
            <div className="bg-background-secondary border border-border-primary rounded-lg overflow-hidden">
                <ul className="divide-y divide-border-primary">
                    {parsedLogs.map((log, index) => (
                         <li 
                            key={index} 
                            className="p-4 hover:bg-background transition-colors animate-staggered-list-item"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-grow">
                                    <p className="text-xs text-text-secondary mb-1">{new Date(log.timestamp).toLocaleString()}</p>
                                    <p className="font-mono text-sm text-text-primary">{log.message}</p>
                                    {log.stack && <pre className="mt-2 text-xs font-mono text-text-secondary/70 whitespace-pre-wrap break-all">{log.stack}</pre>}
                                </div>
                                <button
                                    onClick={() => setSelectedLog(log)}
                                    className="ml-4 flex-shrink-0 flex items-center space-x-2 px-3 py-2 text-sm bg-background hover:bg-border-primary rounded-md transition-colors"
                                >
                                    <GenerateIcon className="w-4 h-4 text-accent-green" />
                                    <span>Analyze with AI</span>
                                </button>
                            </div>
                         </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8">Debug Log Viewer</h1>
            {renderContent()}
            {selectedLog && (
                <LogErrorAnalysisModal
                    log={selectedLog}
                    onClose={() => setSelectedLog(null)}
                />
            )}
        </div>
    );
};

export default PluginLogViewer;