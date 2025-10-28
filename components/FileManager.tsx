import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SiteData, AssetFile, AssetType, FileSystemEntry } from '../types';
import { getAssetFiles, readFileContent } from '../services/wordpressService';
import { PhpIcon, JsIcon, CssIcon, FileIcon as GenericFileIcon, FolderIcon } from './icons/Icons';

interface FileManagerProps {
    siteData: SiteData;
    onEditFile: (file: AssetFile) => void;
}

const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split('.').pop() || '';
    switch (extension) {
        case 'php': return 'php';
        case 'js': return 'javascript';
        case 'css': return 'css';
        case 'html': return 'html';
        case 'json': return 'json';
        case 'md': return 'markdown';
        case 'sql': return 'sql';
        case 'sh': return 'bash';
        case 'xml': return 'xml';
        default: return 'plaintext';
    }
};


const FileManager: React.FC<FileManagerProps> = ({ siteData, onEditFile }) => {
    const [entries, setEntries] = useState<FileSystemEntry[]>([]);
    const [currentPath, setCurrentPath] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [selectedFile, setSelectedFile] = useState<FileSystemEntry | null>(null);
    const [previewContent, setPreviewContent] = useState<string>('');
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current && window.hljs) {
            window.hljs.highlightElement(codeRef.current);
        }
    }, [previewContent]);


    const fetchFiles = useCallback(async (path: string) => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedEntries = await getAssetFiles(siteData, 'root', AssetType.Plugin, path);
            fetchedEntries.sort((a, b) => {
                if (a.type === 'directory' && b.type === 'file') return -1;
                if (a.type === 'file' && b.type === 'directory') return 1;
                return a.name.localeCompare(b.name);
            });
            setEntries(fetchedEntries);
        } catch (err) {
            setError('Failed to load files. Please ensure the connector plugin is up to date.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [siteData]);

    useEffect(() => {
        fetchFiles(currentPath);
    }, [currentPath, fetchFiles]);

    const handleEntryClick = async (entry: FileSystemEntry) => {
        if (entry.type === 'directory') {
            setCurrentPath(entry.path);
            setSelectedFile(null);
            setPreviewContent('');
        } else {
            setSelectedFile(entry);
            setIsPreviewLoading(true);
            setPreviewContent('Loading file content...');
            try {
                const { content } = await readFileContent(siteData, 'root', AssetType.Plugin, entry.path);
                setPreviewContent(content);
            } catch (e) {
                setPreviewContent(`Error loading file: ${(e as Error).message}`);
            } finally {
                setIsPreviewLoading(false);
            }
        }
    };
    
    const handleBreadcrumbClick = (path: string) => {
        setCurrentPath(path);
        setSelectedFile(null);
        setPreviewContent('');
    };
    
    const goUp = () => {
        const parts = currentPath.split('/').filter(p => p);
        parts.pop();
        setCurrentPath(parts.join('/'));
        setSelectedFile(null);
        setPreviewContent('');
    };

    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith('.php')) return <PhpIcon className="w-5 h-5 mr-3 flex-shrink-0 text-accent-purple" />;
        if (fileName.endsWith('.js') || fileName.endsWith('.json')) return <JsIcon className="w-5 h-5 mr-3 flex-shrink-0 text-accent-yellow" />;
        if (fileName.endsWith('.css')) return <CssIcon className="w-5 h-5 mr-3 flex-shrink-0 text-accent-blue" />;
        return <GenericFileIcon className="w-5 h-5 mr-3 flex-shrink-0 text-text-secondary" />;
    };

    const breadcrumbs = ['WordPress Root', ...currentPath.split('/').filter(p => p)];

    if (error) return <div className="text-center p-8 text-accent-red">{error}</div>;
    
    const language = selectedFile ? getLanguageFromFileName(selectedFile.name) : 'plaintext';

    return (
        <div>
            <h1 className="text-4xl font-bold mb-4">Root File Manager</h1>
            <nav className="flex items-center text-sm font-mono text-text-secondary mb-4 space-x-2">
                {breadcrumbs.map((crumb, index) => {
                    const path = breadcrumbs.slice(1, index + 1).join('/');
                    return (
                        <React.Fragment key={index}>
                           <button onClick={() => handleBreadcrumbClick(path)} className="hover:text-text-primary">
                               {crumb}
                           </button>
                           {index < breadcrumbs.length - 1 && <span>/</span>}
                        </React.Fragment>
                    );
                })}
            </nav>

            <div className="flex space-x-4 h-[75vh]">
                <div className="w-1/3 bg-background-secondary border border-border-primary rounded-lg">
                    <ul className="divide-y divide-border-primary h-full overflow-y-auto">
                        {isLoading ? (
                            <li className="p-4 text-center">Loading...</li>
                        ) : (
                            <>
                                {currentPath && (
                                    <li className="p-3 hover:bg-background">
                                        <button onClick={goUp} className="flex items-center w-full">
                                            <FolderIcon className="w-5 h-5 mr-3 flex-shrink-0 text-accent-yellow" />
                                            <span className="font-mono text-sm">..</span>
                                        </button>
                                    </li>
                                )}
                                {entries.map((entry, index) => (
                                    <li 
                                        key={entry.path}
                                        className={`p-3 transition-colors ${selectedFile?.path === entry.path ? 'bg-accent-blue/20' : 'hover:bg-background'}`}
                                    >
                                        <button onClick={() => handleEntryClick(entry)} className="flex items-center truncate w-full text-left">
                                            {entry.type === 'directory' ? <FolderIcon className="w-5 h-5 mr-3 flex-shrink-0 text-accent-cyan" /> : getFileIcon(entry.name)}
                                            <span className="font-mono text-sm truncate">{entry.name}</span>
                                        </button>
                                    </li>
                                ))}
                            </>
                        )}
                    </ul>
                </div>
                <div className="w-2/3 flex flex-col space-y-2">
                    <div className="flex-grow bg-background-secondary border border-border-primary rounded-lg overflow-auto p-4 relative">
                        {selectedFile && (
                            <button onClick={() => onEditFile({ name: selectedFile.path })} className="absolute top-2 right-2 btn btn-secondary text-xs !py-1 !px-3">
                                Edit
                            </button>
                        )}
                         {isPreviewLoading ? (
                             <p>Loading preview...</p>
                         ) : selectedFile ? (
                             <pre className="text-sm font-mono whitespace-pre h-full">
                                <code ref={codeRef} className={`language-${language}`}>
                                    {previewContent}
                                </code>
                            </pre>
                         ) : (
                             <div className="flex items-center justify-center h-full text-text-secondary">
                                 <p>Select a file to preview its content.</p>
                             </div>
                         )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FileManager;