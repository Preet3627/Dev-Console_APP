import React from 'react';
import { GenerateIcon, PluginIcon, ThemeIcon } from './icons/Icons.tsx';

interface GeneratorProps {
    onGeneratePlugin: () => void;
    onGenerateTheme: () => void;
}

const Generator: React.FC<GeneratorProps> = ({ onGeneratePlugin, onGenerateTheme }) => {
    return (
        <div>
            <h1 className="text-4xl font-bold mb-8 flex items-center">
                <GenerateIcon className="w-10 h-10 mr-4 text-accent-green" />
                AI Generator
            </h1>
            <p className="text-text-secondary mb-8">Generate complete WordPress plugins and themes from a simple description.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button 
                    onClick={onGeneratePlugin}
                    className="group bg-background-secondary p-8 rounded-lg border border-border-primary text-left hover:border-accent-blue transition-all"
                >
                    <PluginIcon className="w-12 h-12 mb-4 text-accent-purple group-hover:scale-110 transition-transform" />
                    <h2 className="text-2xl font-semibold text-text-primary mb-2">Generate Plugin</h2>
                    <p className="text-text-secondary">
                        Describe the functionality you need, and the AI will generate a ready-to-use WordPress plugin with all the necessary files.
                    </p>
                </button>
                <button
                    onClick={onGenerateTheme}
                    className="group bg-background-secondary p-8 rounded-lg border border-border-primary text-left hover:border-accent-blue transition-all"
                >
                    <ThemeIcon className="w-12 h-12 mb-4 text-accent-blue group-hover:scale-110 transition-transform" />
                    <h2 className="text-2xl font-semibold text-text-primary mb-2">Generate Theme</h2>
                    <p className="text-text-secondary">
                       Describe the design and layout you envision, and the AI will create a custom WordPress theme, including stylesheets and template files.
                    </p>
                </button>
            </div>
             <div className="mt-12 p-4 bg-background border border-border-primary rounded-md text-sm text-text-secondary">
                <p><strong className="text-text-primary">How it works:</strong> Once generated, you can review the code for each file. If you are connected to a WordPress site, you'll have the option to directly install the generated asset. Otherwise, you can copy or download the code manually.</p>
            </div>
        </div>
    );
};

export default Generator;