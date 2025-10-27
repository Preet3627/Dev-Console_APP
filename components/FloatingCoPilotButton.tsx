import React from 'react';
import { PM_SHRI_Logo } from './icons/Icons';

interface FloatingCoPilotButtonProps {
    onClick: () => void;
}

const FloatingCoPilotButton: React.FC<FloatingCoPilotButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-8 right-8 bg-background-secondary w-16 h-16 rounded-full shadow-lg flex items-center justify-center hover:bg-border-primary transition-transform transform hover:scale-110 z-40 p-3"
            aria-label="Open AI Co-Pilot"
            title="Open AI Co-Pilot"
        >
            <PM_SHRI_Logo className="w-full h-full p-1" />
        </button>
    );
};

export default FloatingCoPilotButton;