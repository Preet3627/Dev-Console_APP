import React, { useState, useEffect } from 'react';
import { Asset, AssetFile, SiteData, BackupFile, AssetType } from '../types';
import { getFileHistory, readFileContent, restoreFile } from '../services/wordpressService';
import { CloseIcon, HistoryIcon } from './icons/Icons';

interface FileHistoryModalProps {
    siteData: SiteData;
    asset: Asset;
    file: AssetFile;
    onClose: () => void;
    onRestore: () => void;
}

const FileHistoryModal: React.FC<FileHistoryModalProps> = ({ siteData, asset, file, onClose, onRestore }) => {
    const [history, setHistory] = useState<BackupFile[]>([]);
    const [selectedBackup, setSelectedBackup] = useState<BackupFile | null>(null);
    const [backupContent, setBackupContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRestoring, setIsRestoring] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const loadHistory = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const fetchedHistory = await getFileHistory(siteData, asset.identifier, asset.type, file.name);
                setHistory(fetchedHistory);
            } catch (err) {
                setError('Failed to load file history.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        loadHistory();
    }, [siteData, asset, file]);

    const handleSelectBackup = async (backup: BackupFile) => {
        setSelectedBackup(backup);
        setBackupContent('Loading backup content...');
        try {
            // Reading backup files still uses absolute paths, as they are in a known, safe directory.
            // FIX: Use the correct AssetType enum member instead of a string literal. Using the contextual asset.type.
            const { content } = await readFileContent(siteData, '', asset.type, backup.path);
            setBackupContent(content);
        } catch (err) {
            setBackupContent('Failed to load content.');
        }
    };

    const handleRestore = async () => {
        if (!selectedBackup) return;
        setIsRestoring(true);
        setError(null);
        try {
            await restoreFile(siteData, asset.identifier, asset.type, file.name, selectedBackup.path);
            onRestore();
            onClose();
        } catch (err) {
            setError('Failed to restore file.');
        } finally {
            setIsRestoring(false);
        }
    };

    const formatTimestamp = (timestamp: string): string => {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
            return date.toLocaleString();
        }
        return timestamp.replace(/[-_]/g, ' ').replace(/(\d{4})(\d{2})(\d{2}) (\d{2})(\d{2})(\d{2})/, '$1-$2-$3 $4:$5:$6');
    };

    return (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background-secondary rounded-lg shadow-2xl w-full max-w-5xl h-[90vh] border border-border-primary flex flex-col p-6 modal-content-animation">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center">
                        <HistoryIcon className="w-6 h-6 mr-3 text-accent-blue" />
                        Restore Points for {file.name}
                    </h2>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                {error && <div className="text-center my-2 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-accent-red/80">{error}</div>}

                <div className="flex-grow min-h-0 flex space-x-4">
                    <div className="w-1/3 flex flex-col">
                        <h3 className="text-lg font-semibold mb-2">Available Backups</h3>
                        <div className="flex-grow bg-background p-2 rounded-md border border-border-primary overflow-y-auto">
                            {isLoading && <p>Loading history...</p>}
                            {!isLoading && history.length === 0 && <p className="text-text-secondary">No restore points found for this file.</p>}
                            <ul className="space-y-1">
                                {history.map(backup => (
                                    <li key={backup.path}>
                                        <button 
                                            onClick={() => handleSelectBackup(backup)}
                                            className={`w-full text-left p-2 text-sm rounded-md truncate ${selectedBackup?.path === backup.path ? 'bg-accent-blue text-white' : 'hover:bg-border-primary'}`}
                                        >
                                            Backup from {formatTimestamp(backup.timestamp)}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    <div className="w-2/3 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <h3 className="text-lg font-semibold">Backup Content</h3>
                            {selectedBackup && (
                                <button
                                    onClick={handleRestore}
                                    disabled={isRestoring}
                                    className="px-4 py-1 bg-accent-green hover:bg-accent-green-hover text-white rounded-md disabled:opacity-50"
                                >
                                    {isRestoring ? 'Restoring...' : 'Restore This Version'}
                                </button>
                            )}
                        </div>
                        <div className="flex-grow bg-background p-4 rounded-md border border-border-primary overflow-auto">
                            <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                                <code>
                                    {backupContent || 'Select a backup to view its content.'}
                                </code>
                            </pre>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end mt-6">
                    <button onClick={onClose} className="px-6 py-2 bg-background hover:bg-border-primary rounded-md">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FileHistoryModal;