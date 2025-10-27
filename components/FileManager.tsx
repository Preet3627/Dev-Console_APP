import React, { useState, useEffect, useCallback } from 'react';
// FIX: Corrected the type of the 'assetType' argument in the 'getAssetFiles' call from a string literal to the 'AssetType.Plugin' enum member to resolve the TypeScript type error.
import { SiteData, AssetFile, AssetType } from '../types';
import { getAssetFiles } from '../services/wordpressService';
import { PhpIcon, JsIcon, CssIcon, FileIcon as GenericFileIcon } from './icons/Icons';

interface FileManagerProps {
    siteData: SiteData;
    onEditFile: (file: AssetFile) => void;
}

const FileManager: React.FC<FileManagerProps> = ({ siteData, onEditFile }) => {
    const [files, setFiles] = useState<AssetFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFiles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Using getAssetFiles with a special 'root' identifier for the file manager
            const fetchedFiles = await getAssetFiles(siteData, 'root', AssetType.Plugin); // assetType doesn't matter for 'root'
            setFiles(fetchedFiles);
        } catch (err) {
            setError('Failed to load root files. Please ensure the connector plugin is up to date.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [siteData]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);
    
    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith('.php')) return <PhpIcon className="w-5 h-5 mr-3 flex-shrink-0 text-accent-purple" />;
        if (fileName.endsWith('.js') || fileName.endsWith('.json')) return <JsIcon className="w-5 h-5 mr-3 flex-shrink-0 text-accent-yellow" />;
        if (fileName.endsWith('.css')) return <CssIcon className="w-5 h-5 mr-3 flex-shrink-0 text-accent-blue" />;
        return <GenericFileIcon className="w-5 h-5 mr-3 flex-shrink-0 text-text-secondary" />;
    };

    if (isLoading) return <div className="text-center p-8">Loading file system...</div>;
    if (error) return <div className="text-center p-8 text-accent-red">{error}</div>;

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8">Root File Manager</h1>
            <div className="bg-background-secondary border border-border-primary rounded-lg">
                <ul className="divide-y divide-border-primary max-h-[70vh] overflow-y-auto">
                    {files.map(file => (
                        <li key={file.name} className="p-3 flex items-center justify-between hover:bg-background">
                            <div className="flex items-center truncate">
                                {getFileIcon(file.name)}
                                <span className="font-mono text-sm truncate">{file.name}</span>
                            </div>
                            <button onClick={() => onEditFile(file)} className="btn btn-secondary text-xs !py-1 !px-3">
                                Edit
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};

export default FileManager;