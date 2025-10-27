import React, { useState } from 'react';
import { generatePlugin } from '../services/aiService';
import { installAsset } from '../services/wordpressService';
import ThinkingModal from './ThinkingModal';
import CodeViewer from './CodeViewer';
import { AssetFile, SiteData, AssetType } from '../types';

interface PluginGeneratorModalProps {
    onClose: () => void;
    siteData: SiteData | null;
    modalBgColor?: string;
}

const PluginGeneratorModal: React.FC<PluginGeneratorModalProps> = ({ onClose, siteData, modalBgColor }) => {
    const [prompt, setPrompt] = useState('');
    const [pluginName, setPluginName] = useState('');
    const [generatedFiles, setGeneratedFiles] = useState<AssetFile[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState('');

    const handleGenerate = async () => {
        if (!prompt || !pluginName) {
            setError('Please provide a plugin name and a description.');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedFiles([]);
        try {
            setStatusText('Sending request to the AI...');
            const files = await generatePlugin(`Plugin Name: ${pluginName}\n\nDescription: ${prompt}`);
            setGeneratedFiles(files);
            if (files.length > 0) {
                setSelectedFile(files[0].name);
            }
            setStatusText('Plugin files generated successfully!');
        } catch (err) {
            setError(`Failed to generate plugin. Please check your API key in Settings. Error: ${(err as Error).message}`);
            setStatusText('Error generating plugin.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleInstall = async () => {
        if (!siteData) {
            setError("Cannot install plugin, not connected to a site.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            setStatusText('Installing plugin on your WordPress site...');
            await installAsset(siteData, AssetType.Plugin, pluginName, generatedFiles);
            setStatusText('Plugin installed successfully!');
            setTimeout(onClose, 2000);
        } catch(err) {
            setError('Failed to install plugin.');
            setStatusText('Error installing plugin.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <ThinkingModal
            title="AI Plugin Generator"
            statusText={error || statusText}
            isLoading={isLoading}
            onClose={onClose}
            onAccept={handleInstall}
            showAccept={!!siteData && generatedFiles.length > 0}
            acceptEnabled={!isLoading && generatedFiles.length > 0}
            acceptText="Install Plugin"
            modalBgColor={modalBgColor}
        >
            {generatedFiles.length > 0 ? (
                <CodeViewer files={generatedFiles} selectedFileName={selectedFile} onSelectFile={setSelectedFile} />
            ) : (
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-medium text-text-primary">Plugin Name</label>
                        <input
                            type="text"
                            value={pluginName}
                            onChange={(e) => setPluginName(e.target.value)}
                            className="mt-1 w-full p-2 bg-background border border-border-primary rounded-md"
                            placeholder="e.g., Simple Contact Form"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-text-primary">Describe the plugin you want to create</label>
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            rows={10}
                            className="mt-1 w-full p-2 bg-background border border-border-primary rounded-md"
                            placeholder="e.g., A plugin that adds a contact form to a page using a shortcode. It should have fields for name, email, and message. Submissions should be sent to the admin's email."
                        />
                    </div>
                    <button onClick={handleGenerate} disabled={isLoading || !prompt || !pluginName} className="w-full py-2 bg-accent-blue hover:bg-accent-blue-hover text-white rounded-md disabled:opacity-50">
                        {isLoading ? 'Generating...' : 'Generate Plugin'}
                    </button>
                </div>
            )}
        </ThinkingModal>
    );
};

export default PluginGeneratorModal;
