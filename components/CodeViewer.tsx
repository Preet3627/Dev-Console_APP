import React, { useEffect, useRef } from 'react';
import { AssetFile } from '../types';

interface CodeViewerProps {
    files: AssetFile[];
    selectedFileName: string;
    onSelectFile: (fileName: string) => void;
}

const getLanguageFromFileName = (fileName: string): string => {
    const extension = fileName.split('.').pop() || '';
    switch (extension) {
        case 'php': return 'php';
        case 'js': return 'javascript';
        case 'css': return 'css';
        case 'html': return 'html';
        case 'json': return 'json';
        default: return 'plaintext';
    }
};

const CodeViewer: React.FC<CodeViewerProps> = ({ files, selectedFileName, onSelectFile }) => {
    const selectedFile = files.find(f => f.name === selectedFileName);
    const codeRef = useRef<HTMLElement>(null);

    useEffect(() => {
        if (codeRef.current && window.hljs) {
            window.hljs.highlightElement(codeRef.current);
        }
    }, [selectedFile]);

    const language = selectedFile ? getLanguageFromFileName(selectedFile.name) : 'plaintext';

    return (
        <div className="flex space-x-4 h-full">
            <div className="w-1/3 max-w-xs bg-background p-2 rounded-md border border-border-primary">
                <ul className="space-y-1 overflow-y-auto h-full">
                    {files.map(file => (
                        <li key={file.name}>
                            <button
                                onClick={() => onSelectFile(file.name)}
                                className={`w-full text-left p-2 text-sm rounded-md truncate ${selectedFileName === file.name ? 'bg-accent-blue text-white' : 'hover:bg-border-primary'}`}
                            >
                                {file.name}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="w-2/3 bg-background p-4 rounded-md border border-border-primary overflow-auto">
                <pre className="text-sm font-mono whitespace-pre h-full">
                    <code ref={codeRef} className={`language-${language}`}>
                        {selectedFile?.content || 'Select a file to view its code.'}
                    </code>
                </pre>
            </div>
        </div>
    );
};

export default CodeViewer;