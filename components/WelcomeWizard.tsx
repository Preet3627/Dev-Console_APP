import React, { useState } from 'react';
import { CloseIcon, ConnectIcon, CoPilotIcon, GenerateIcon } from './icons/Icons';

interface WelcomeWizardProps {
    onClose: () => void;
    onConnectSite: () => void;
}

const WelcomeWizard: React.FC<WelcomeWizardProps> = ({ onClose, onConnectSite }) => {
    const [step, setStep] = useState(1);
    const totalSteps = 3;

    const handleNext = () => setStep(prev => Math.min(prev + 1, totalSteps));
    const handleBack = () => setStep(prev => Math.max(prev - 1, 1));
    
    const handleConnectAndClose = () => {
        onConnectSite();
        onClose();
    };
    
    const IconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
        <div className="relative inline-block">
            <div className="absolute -inset-2 bg-accent-purple rounded-full opacity-30 blur-xl animate-pulse"></div>
            <div className="relative">
                {children}
            </div>
        </div>
    );

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <div className="text-center">
                        <h3 className="text-2xl font-bold mb-2">Welcome to Dev-Console!</h3>
                        <p className="text-text-secondary">Your AI-powered command center for WordPress is ready. Let's take a quick tour of the core features.</p>
                    </div>
                );
            case 2:
                return (
                    <div>
                        <div className="flex justify-center mb-6">
                            <IconWrapper>
                                <ConnectIcon className="w-16 h-16 text-accent-blue"/>
                            </IconWrapper>
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-center">Connect Your First Site</h3>
                        <p className="text-text-secondary text-center">To manage a WordPress site, you first need to install our secure connector plugin. Click the button below to get started, or do it later from the header.</p>
                         <div className="mt-6 text-center">
                             <button onClick={handleConnectAndClose} className="btn btn-primary">Connect a Site Now</button>
                         </div>
                    </div>
                );
            case 3:
                return (
                    <div>
                        <div className="flex justify-center space-x-12 mb-6">
                            <IconWrapper>
                                <CoPilotIcon className="w-16 h-16 text-accent-violet"/>
                            </IconWrapper>
                             <IconWrapper>
                                <GenerateIcon className="w-16 h-16 text-accent-green"/>
                            </IconWrapper>
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-center">Meet Your AI Co-Pilot</h3>
                        <p className="text-text-secondary text-center">Use the <span className="font-bold text-text-primary">Co-Pilot</span> to chat with an AI assistant that can perform actions on your site. Use the <span className="font-bold text-text-primary">AI Generator</span> to create entire plugins and themes from a simple description. You're now ready to explore!</p>
                    </div>
                );
            default: return null;
        }
    };

    return (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-background-secondary/50 backdrop-blur-lg border border-accent-purple/30 shadow-2xl shadow-accent-purple/10 w-full max-w-lg flex flex-col p-6 rounded-xl modal-content-animation">
                <div className="flex justify-end">
                     <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="flex-grow min-h-0 py-4 px-8">
                   {renderStepContent()}
                </div>

                <div className="flex justify-between items-center mt-6 pt-4 border-t border-border-primary">
                    <button onClick={handleBack} disabled={step === 1} className="btn btn-secondary disabled:opacity-50">Back</button>
                    
                     <div className="flex space-x-3">
                        {Array.from({ length: totalSteps }).map((_, i) => (
                            <div key={i} className={`w-3 h-3 rounded-full transition-all ${i + 1 === step ? 'bg-accent-cyan scale-125' : 'bg-border'}`}></div>
                        ))}
                    </div>

                    {step < totalSteps ? (
                        <button onClick={handleNext} className="btn btn-primary">Next</button>
                    ) : (
                        <button onClick={onClose} className="btn btn-primary">Let's Get Started</button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WelcomeWizard;