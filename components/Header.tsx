import React from 'react';
import { ConnectIcon, RefreshIcon, SignalIcon } from './icons/Icons';

interface HeaderProps {
    isConnected: boolean;
    siteUrl: string;
    onConnect: () => void;
    onRefresh: () => Promise<void>;
    onTestConnection: () => void;
}

const Header: React.FC<HeaderProps> = ({ isConnected, siteUrl, onConnect, onRefresh, onTestConnection }) => {
    return (
        <header className="bg-background/80 backdrop-blur-sm border-b border-border p-4 flex justify-between items-center flex-shrink-0">
            <div className="flex items-center space-x-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-accent-green' : 'bg-accent-red'}`}></div>
                <span className="text-sm font-semibold">{isConnected ? `Connected: ${siteUrl}` : 'Not Connected'}</span>
            </div>
            <div className="flex items-center space-x-4">
                {isConnected && (
                    <>
                        <button onClick={onTestConnection} className="btn btn-secondary flex items-center space-x-2 text-xs !py-1.5 !px-3">
                            <SignalIcon className="w-4 h-4" />
                            <span>Test</span>
                        </button>
                        <button onClick={onRefresh} className="btn btn-secondary flex items-center space-x-2 text-xs !py-1.5 !px-3">
                            <RefreshIcon className="w-4 h-4" />
                            <span>Refresh</span>
                        </button>
                    </>
                )}
                {!isConnected && (
                    <button onClick={onConnect} className="btn btn-primary flex items-center space-x-2 text-xs !py-1.5 !px-3">
                        <ConnectIcon className="w-4 h-4" />
                        <span>Connect</span>
                    </button>
                )}
            </div>
        </header>
    );
};

export default Header;