import React, { useState } from 'react';
import { CloseIcon, GenerateIcon, FullScreenIcon, ExitFullScreenIcon } from './icons/Icons.tsx';

interface ThinkingModalProps {
    title: string;
    statusText: string;
    isLoading: boolean;
    onClose: () => void;
    onAccept?: () => void;
    showAccept?: boolean;
    acceptEnabled?: boolean;
    acceptText?: string;
    children?: React.ReactNode;
    modalBgColor?: string;
}

const ThinkingModal: React.FC<ThinkingModalProps> = ({
    title,
    statusText,
    isLoading,
    onClose,
    onAccept,
    showAccept = true,
    acceptEnabled = true,
    acceptText = 'Accept & Continue',
    children,
    modalBgColor
}) => {
    const [isFullScreen, setIsFullScreen] = useState(false);
    const modalStyle = modalBgColor ? { backgroundColor: modalBgColor } : {};

    return (
        <div className={`fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 ${isFullScreen ? '' : 'p-4'}`}>
            <div
                style={modalStyle}
                className={`bg-background-secondary shadow-2xl border border-border-primary flex flex-col transition-all duration-300 ${isFullScreen ? 'w-full h-full rounded-none' : 'rounded-lg w-full max-w-5xl h-[90vh]'} p-6 modal-content-animation`}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold flex items-center">
                        <GenerateIcon className={`w-6 h-6 mr-3 text-accent-green ${isLoading ? 'animate-spin' : ''}`} />
                        {title}
                    </h2>
                    <div className="flex items-center space-x-2">
                         <button onClick={() => setIsFullScreen(!isFullScreen)} className="text-text-secondary hover:text-text-primary p-1">
                            {isFullScreen ? <ExitFullScreenIcon className="w-6 h-6" /> : <FullScreenIcon className="w-6 h-6" />}
                        </button>
                        <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                <div className="text-center my-4 p-3 bg-background border border-border-primary rounded-md">
                    <p className="text-text-secondary">{statusText}</p>
                </div>
                
                <div className="flex-grow min-h-0">
                    {children}
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                    <button onClick={onClose} className="px-6 py-2 bg-background hover:bg-border-primary rounded-md">
                        Cancel
                    </button>
                    {showAccept && onAccept && (
                        <button 
                            onClick={onAccept} 
                            disabled={!acceptEnabled}
                            className="px-6 py-2 bg-accent-green hover:bg-accent-green-hover text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {acceptText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ThinkingModal;