import React, { useState, useEffect, useCallback } from 'react';
import FileTree from './FileTree';
import FileHistoryModal from './FileHistoryModal';
import { CloseIcon, HistoryIcon, FullScreenIcon, ExitFullScreenIcon } from './icons/Icons';
import { getAssetFiles, readFileContent, writeFileContent } from '../services/wordpressService';
import { Asset, AssetFile, SiteData } from '../types';

interface CodeEditorProps {
    siteData: SiteData;
    asset: Asset;
    // FIX: Add optional initialFile prop to allow opening a specific file on mount.
    initialFile?: AssetFile;
    onClose: () => void;
    modalBgColor?: string;
}

const CodeEditor: React.FC<CodeEditorProps> = ({ siteData, asset, initialFile, onClose, modalBgColor }) => {
    const [files, setFiles] = useState<AssetFile[]>([]);
    const [selectedFile, setSelectedFile] = useState<AssetFile | null>(null);
    const [fileContent, setFileContent] = useState<string>('');
    const [originalContent, setOriginalContent] = useState<string>('');
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);
    const [isFullScreen, setIsFullScreen] = useState(false);

    const modalStyle = modalBgColor ? { backgroundColor: modalBgColor } : {};

    const handleSelectFile = useCallback(async (file: AssetFile) => {
        setSelectedFile(file);
        setFileContent('Loading content...');
        setError(null);
        try {
            const { content } = await readFileContent(siteData, asset.identifier, asset.type, file.name);
            setFileContent(content);
            setOriginalContent(content);
        } catch (err) {
            setError(`Failed to read content for ${file.name}.`);
            setFileContent('');
            setOriginalContent('');
        }
    }, [siteData, asset]);

    const fetchFiles = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedFiles = await getAssetFiles(siteData, asset.identifier, asset.type);
            setFiles(fetchedFiles);
        } catch (err) {
            setError(`Failed to load files for ${asset.name}.`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [siteData, asset]);

    useEffect(() => {
        fetchFiles();
    }, [fetchFiles]);

    // FIX: Add useEffect to handle the initialFile prop.
    useEffect(() => {
        if (initialFile) {
            handleSelectFile(initialFile);
        }
    }, [initialFile, handleSelectFile]);

    const handleSaveFile = async () => {
        if (!selectedFile) return;
        setIsSaving(true);
        setError(null);
        try {
            await writeFileContent(siteData, asset.identifier, asset.type, selectedFile.name, fileContent);
            setOriginalContent(fileContent);
        } catch (err) {
            setError(`Failed to save ${selectedFile.name}.`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleRestore = () => {
        if (selectedFile) {
            handleSelectFile(selectedFile);
        }
    };
    
    const isDirty = fileContent !== originalContent;

    return (
        <div className={`fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 ${isFullScreen ? '' : 'p-4'}`}>
            <div
                style={modalStyle}
                className={`bg-background-secondary shadow-2xl border border-border-primary flex flex-col transition-all duration-300 ${isFullScreen ? 'w-full h-full rounded-none' : 'rounded-lg w-full max-w-7xl h-[90vh]'} p-6 modal-content-animation`}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Editing: {asset.name}</h2>
                    <div className="flex items-center space-x-2">
                        <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-text-secondary hover:text-text-primary p-1">
                            {isFullScreen ? <ExitFullScreenIcon className="w-6 h-6" /> : <FullScreenIcon className="w-6 h-6" />}
                        </button>
                        <button onClick={onClose} className="text-text-secondary hover:text-text-primary p-1">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
                
                {error && <div className="text-center my-2 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-accent-red/80">{error}</div>}

                <div className="flex-grow min-h-0 flex space-x-4">
                    <div className="w-1/4 bg-background border border-border-primary rounded-md">
                        {isLoading ? <div className="p-4">Loading files...</div> : <FileTree files={files} selectedFile={selectedFile} onSelectFile={handleSelectFile} />}
                    </div>
                    <div className="w-3/4 flex flex-col">
                        <div className="flex-grow relative">
                             <textarea
                                value={fileContent}
                                onChange={(e) => setFileContent(e.target.value)}
                                className="w-full h-full p-4 bg-background border border-border-primary rounded-md font-mono text-sm resize-none code-editor-textarea"
                                placeholder="Select a file to view its content."
                                disabled={!selectedFile}
                            />
                        </div>
                        <div className="flex justify-between items-center mt-4">
                            <div>
                                {selectedFile && (
                                    <button
                                        onClick={() => setShowHistory(true)}
                                        className="flex items-center space-x-2 px-3 py-2 text-sm bg-background hover:bg-border-primary rounded-md"
                                    >
                                        <HistoryIcon className="w-4 h-4" />
                                        <span>Restore Points</span>
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center space-x-4">
                               <span className={`text-sm ${isDirty ? 'text-accent-yellow' : 'text-text-secondary'}`}>
                                   {selectedFile ? (isDirty ? 'Unsaved changes' : 'Saved') : 'No file selected'}
                               </span>
                                <button 
                                    onClick={handleSaveFile}
                                    disabled={!isDirty || isSaving}
                                    className="px-6 py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-md disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save File'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                 {showHistory && selectedFile && (
                    <FileHistoryModal
                        siteData={siteData}
                        asset={asset}
                        file={selectedFile}
                        onClose={() => setShowHistory(false)}
                        onRestore={handleRestore}
                    />
                )}
            </div>
        </div>
    );
};

export default CodeEditor;
