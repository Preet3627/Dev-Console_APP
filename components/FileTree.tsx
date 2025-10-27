import React, { useState, useMemo } from 'react';
import { AssetFile } from '../types';
import { FolderIcon, FolderOpenIcon, PhpIcon, JsIcon, CssIcon, FileIcon as GenericFileIcon } from './icons/Icons';

interface FileTreeProps {
    files: AssetFile[];
    selectedFile: AssetFile | null;
    onSelectFile: (file: AssetFile) => void;
}

interface TreeNode {
    name: string;
    path: string;
    children?: TreeNode[];
    fileRef?: AssetFile;
}

const buildTree = (files: AssetFile[]): TreeNode[] => {
    const root: TreeNode = { name: 'root', path: '', children: [] };

    files.forEach(file => {
        const pathParts = file.name.split('/');
        let currentNode = root;
        pathParts.forEach((part, index) => {
            if (!part) return;
            let childNode = currentNode.children?.find(child => child.name === part);
            if (!childNode) {
                const newPath = currentNode.path ? `${currentNode.path}/${part}` : part;
                childNode = { name: part, path: newPath };
                if (index < pathParts.length - 1) { 
                    childNode.children = [];
                } else {
                    childNode.fileRef = file;
                }
                currentNode.children?.push(childNode);
            }
            currentNode = childNode;
        });
    });

    return root.children?.sort((a,b) => {
        if (a.children && !b.children) return -1; // directories first
        if (!a.children && b.children) return 1;
        return a.name.localeCompare(b.name); // sort alphabetically
    }) || [];
};


const FileNode: React.FC<{ node: TreeNode; selectedFile: AssetFile | null; onSelectFile: (file: AssetFile) => void; depth: number }> = ({ node, selectedFile, onSelectFile, depth }) => {
    const [isOpen, setIsOpen] = useState(depth < 2); // Auto-open first few levels

    if (node.children) { // It's a directory
        return (
            <div>
                <button onClick={() => setIsOpen(!isOpen)} className="w-full text-left flex items-center py-1 text-sm text-text-secondary hover:text-text-primary">
                    {isOpen ? <FolderOpenIcon className="w-4 h-4 mr-2 flex-shrink-0" /> : <FolderIcon className="w-4 h-4 mr-2 flex-shrink-0" />}
                    {node.name}
                </button>
                {isOpen && <div className="pl-4 border-l border-border-primary">{node.children.map(child => <FileNode key={child.path} node={child} selectedFile={selectedFile} onSelectFile={onSelectFile} depth={depth + 1} />)}</div>}
            </div>
        );
    }
    
    // It's a file
    const getFileIcon = (fileName: string) => {
        if (fileName.endsWith('.php')) return <PhpIcon className="w-4 h-4 mr-2 flex-shrink-0 text-accent-purple" />;
        if (fileName.endsWith('.js')) return <JsIcon className="w-4 h-4 mr-2 flex-shrink-0 text-accent-yellow" />;
        if (fileName.endsWith('.css')) return <CssIcon className="w-4 h-4 mr-2 flex-shrink-0 text-accent-blue" />;
        return <GenericFileIcon className="w-4 h-4 mr-2 flex-shrink-0 text-text-secondary" />;
    };

    const isSelected = selectedFile?.name === node.fileRef?.name;
    
    return (
        <button
            onClick={() => node.fileRef && onSelectFile(node.fileRef)}
            className={`w-full text-left flex items-center py-1 text-sm rounded-md px-2 ${isSelected ? 'bg-accent-blue text-white' : 'text-text-primary hover:bg-background'}`}
        >
            {getFileIcon(node.name)}
            <span className="truncate">{node.name}</span>
        </button>
    );
};

const FileTree: React.FC<FileTreeProps> = ({ files, selectedFile, onSelectFile }) => {
    const fileTree = useMemo(() => buildTree(files), [files]);

    return (
        <div className="p-2 space-y-1 h-full overflow-y-auto">
            {fileTree.map(node => (
                <FileNode key={node.path} node={node} selectedFile={selectedFile} onSelectFile={onSelectFile} depth={0} />
            ))}
        </div>
    );
};

export default FileTree;
