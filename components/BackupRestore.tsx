import React, { useState, useEffect, useCallback } from 'react';
import { SiteData } from '../types';
import { createSiteBackup, listSiteBackups } from '../services/wordpressService';
import { uploadFileToNextcloud } from '../services/nextcloudService';
import { uploadFile as uploadToGoogleDrive } from '../services/googleDriveService';
import { BackupIcon, DownloadIcon } from './icons/Icons';

interface SiteBackup {
    name: string;
    size: number;
    date: number;
}

type BackupDestination = 'local' | 'nextcloud' | 'googledrive';

const BackupRestore: React.FC<{ siteData: SiteData }> = ({ siteData }) => {
    const [backups, setBackups] = useState<SiteBackup[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusText, setStatusText] = useState('');
    const [destination, setDestination] = useState<BackupDestination>('local');

    const fetchBackups = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedBackups = await listSiteBackups(siteData);
            setBackups(fetchedBackups);
        } catch (err) {
            setError('Failed to load existing backups from the WordPress server.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [siteData]);

    useEffect(() => {
        fetchBackups();
    }, [fetchBackups]);

    const handleCreateBackup = async () => {
        setIsCreating(true);
        setError(null);
        setStatusText('Creating backup archive on your WordPress server...');
        try {
            const backupData = await createSiteBackup(siteData);

            setStatusText(`Backup created. Now handling destination: ${destination}...`);
            
            if (destination === 'nextcloud') {
                setStatusText('Uploading to Nextcloud...');
                await uploadFileToNextcloud(siteData.siteUrl, backupData.fileName, backupData.content);
            } else if (destination === 'googledrive') {
                 setStatusText('Uploading to Google Drive...');
                const byteCharacters = atob(backupData.content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/zip' });
                await uploadToGoogleDrive(siteData.siteUrl, backupData.fileName, blob);
            } else { // 'local'
                setStatusText('Preparing download...');
                const byteCharacters = atob(backupData.content);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) { byteNumbers[i] = byteCharacters.charCodeAt(i); }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], {type: 'application/zip'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = backupData.fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            setStatusText(`Backup successfully handled via ${destination}.`);
            await fetchBackups();
        } catch (err) {
            const errorMessage = `Failed to create backup: ${(err as Error).message}`;
            setError(errorMessage);
            setStatusText(errorMessage);
        } finally {
            setIsCreating(false);
            setTimeout(() => setStatusText(''), 5000);
        }
    };
    
    const formatBytes = (bytes: number, decimals = 2) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    };

    const renderBackupList = () => {
        if (isLoading) return <div className="text-center p-8">Loading server backups...</div>;
        if (backups.length === 0) return <div className="text-center p-8 text-text-secondary">No backups found on the WordPress server.</div>;

        return (
            <div className="bg-background-secondary border border-border-primary rounded-lg overflow-hidden">
                <ul className="divide-y divide-border-primary">
                    {backups.map((backup, index) => (
                        <li 
                            key={backup.name} 
                            className="p-4 flex items-center justify-between hover:bg-background transition-colors animate-staggered-list-item"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div>
                                <p className="font-mono text-text-primary">{backup.name}</p>
                                <p className="text-sm text-text-secondary">
                                    {new Date(backup.date * 1000).toLocaleString()} - {formatBytes(backup.size)}
                                </p>
                            </div>
                            <div className="flex items-center space-x-4">
                                <button className="btn btn-secondary text-xs !py-1 !px-3 flex items-center" disabled>
                                    <DownloadIcon className="w-4 h-4 mr-2" />
                                    Download
                                </button>
                                <button className="px-3 py-1 text-sm bg-accent-red/20 text-accent-red rounded-md disabled:opacity-50" disabled>
                                    Restore
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
            <h1 className="text-4xl font-bold mb-8 flex items-center">
                <BackupIcon className="w-8 h-8 mr-4 text-accent-blue" />
                Backup & Restore
            </h1>

            <div className="bg-background-secondary p-6 rounded-lg border border-border-primary mb-8">
                <h2 className="text-xl font-semibold mb-2">Create New Backup</h2>
                <p className="text-text-secondary text-sm mb-4">
                    Create a .zip archive of your site. Database backups are not yet included.
                </p>
                <div className="flex items-center space-x-4">
                     <div>
                        <label htmlFor="destination" className="block text-sm font-medium text-text-primary">Destination</label>
                        <select id="destination" value={destination} onChange={(e) => setDestination(e.target.value as BackupDestination)} className="input-field mt-1 !p-2.5">
                            <option value="local">Download to Computer</option>
                            <option value="nextcloud">Upload to Nextcloud</option>
                            <option value="googledrive">Upload to Google Drive</option>
                        </select>
                    </div>
                    <button onClick={handleCreateBackup} disabled={isCreating} className="btn btn-primary self-end">
                        {isCreating ? 'Creating...' : 'Create Backup'}
                    </button>
                </div>
                 {statusText && <p className="text-sm mt-4">{statusText}</p>}
            </div>
            
            {error && <div className="my-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-accent-red/80">{error}</div>}

            <div>
                <h2 className="text-2xl font-bold mb-4">Existing Backups on WordPress Server</h2>
                {renderBackupList()}
            </div>
        </div>
    );
};

export default BackupRestore;