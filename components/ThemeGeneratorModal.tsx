import React, { useState } from 'react';
import { generateTheme } from '../services/aiService';
import { installAsset } from '../services/wordpressService';
import ThinkingModal from './ThinkingModal';
import CodeViewer from './CodeViewer';
import { AssetFile, SiteData, AssetType } from '../types';

interface ThemeGeneratorModalProps {
    onClose: () => void;
    siteData: SiteData | null;
    modalBgColor?: string;
}

const ThemeGeneratorModal: React.FC<ThemeGeneratorModalProps> = ({ onClose, siteData, modalBgColor }) => {
    const [prompt, setPrompt] = useState('');
    const [themeName, setThemeName] = useState('');
    const [generatedFiles, setGeneratedFiles] = useState<AssetFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState('');

    const handleGenerate = async () => {
        if (!prompt || !themeName) {
            setError('Please provide a theme name and a description.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedFiles([]);
        try {
            setStatusText('Sending request to the AI...');
            const files = await generateTheme(`Theme Name: ${themeName}\n\nDescription: ${prompt}`);
            setGeneratedFiles(files);
            if (files.length > 0) {
                setSelectedFile(files[0].name);
            }
            setStatusText('Theme files generated successfully!');
        } catch (err) {
            setError(`Failed to generate theme. Please check your API key in Settings. Error: ${(err as Error).message}`);
            setStatusText('Error generating theme.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInstall = async () => {
        if (!siteData) {
            setError("Cannot install theme, not connected to a site.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            setStatusText('Installing theme on your WordPress site...');
            await installAsset(siteData, AssetType.Theme, themeName, generatedFiles);
            setStatusText('Theme installed successfully!');
            setTimeout(onClose, 2000);
        } catch(err) {
            setError('Failed to install theme.');
            setStatusText('Error installing theme.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ThinkingModal
            title="AI Theme Generator"
            statusText={error || statusText}
            isLoading={isLoading}
            onClose={onClose}
            onAccept={handleInstall}
            showAccept={!!siteData && generatedFiles.length > 0}
            acceptEnabled={!isLoading && generatedFiles.length > 0}
            acceptText="Install Theme"
            modalBgColor={modalBgColor}
        >
            {generatedFiles.length > 0 ? (
                <CodeViewer files={generatedFiles} selectedFileName={selectedFile} onSelectFile={setSelectedFile} />
            ) : (
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-text-primary">Theme Name</label>
                        <input
                            type="text"
                            value={themeName}
                            onChange={(e) => setThemeName(e.target.value)}
                            className="mt-1 w-full p-2 bg-background border border-border-primary rounded-md"
                            placeholder="e.g., My Minimalist Blog"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary">Describe the theme you want to create</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={10}
                            className="mt-1 w-full p-2 bg-background border border-border-primary rounded-md"
                            placeholder="e.g., A clean, minimalist blog theme with a single column for posts. Use a serif font for headings and sans-serif for body text. The main color should be dark grey with a light blue accent."
                        />
                    </div>
                    <button onClick={handleGenerate} disabled={isLoading || !prompt || !themeName} className="w-full py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-md disabled:opacity-50">
                        {isLoading ? 'Generating...' : 'Generate Theme'}
                    </button>
                </div>
            )}
        </ThinkingModal>
    );
};

export default ThemeGeneratorModal;
