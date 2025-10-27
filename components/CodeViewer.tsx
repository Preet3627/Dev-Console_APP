import React from 'react';
import { AssetFile } from '../types';

interface CodeViewerProps {
    files: AssetFile[];
    selectedFileName: string;
    onSelectFile: (fileName: string) => void;
}

const CodeViewer: React.FC<CodeViewerProps> = ({ files, selectedFileName, onSelectFile }) => {
    const selectedFile = files.find(f => f.name === selectedFileName);

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
                <pre className="text-sm font-mono whitespace-pre-wrap break-words">
                    <code>
                        {selectedFile?.content || 'Select a file to view its code.'}
                    </code>
                </pre>
            </div>
        </div>
    );
};

export default CodeViewer;
