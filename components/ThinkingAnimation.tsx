import React from 'react';
import { ThinkingIcon } from './icons/Icons';

const ThinkingAnimation: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center p-4">
            <ThinkingIcon className="w-24 h-24" />
            <p className="mt-4 text-text-secondary animate-pulse">AI is thinking...</p>
        </div>
    );
};

export default ThinkingAnimation;