import React, { useState, useRef, useEffect } from 'react';
import { ConnectIcon, RefreshIcon, SignalIcon, LogoutIcon } from './icons/Icons';
import { View } from '../App';

interface HeaderProps {
    isConnected: boolean;
    siteUrl: string;
    onConnect: () => void;
    onRefresh: () => Promise<void>;
    onTestConnection: () => void;
    displayName: string;
    profilePictureUrl: string | null;
    onLogout: () => void;
    setView: (view: View) => void;
}

const Header: React.FC<HeaderProps> = ({ isConnected, siteUrl, onConnect, onRefresh, onTestConnection, displayName, profilePictureUrl, onLogout, setView }) => {
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <header className="border-b border-border p-4 flex justify-between items-center flex-shrink-0">
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
                 <div className="relative" ref={dropdownRef}>
                    <button onClick={() => setDropdownOpen(!dropdownOpen)} className="flex items-center space-x-2">
                         {profilePictureUrl ? (
                            <img src={profilePictureUrl} alt="Profile" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                            <div className="w-8 h-8 rounded-full bg-accent-purple flex items-center justify-center text-white font-bold text-sm">
                                {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                            </div>
                        )}
                        <span className="text-sm font-semibold hidden md:block">{displayName}</span>
                    </button>
                    {dropdownOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-background-secondary border border-border rounded-md shadow-lg z-50">
                            <div className="p-2 border-b border-border">
                                <p className="text-sm font-semibold truncate">{displayName}</p>
                            </div>
                            <div className="p-1">
                                <a
                                    href="#"
                                    onClick={(e) => { e.preventDefault(); setView('settings'); setDropdownOpen(false); }}
                                    className="block w-full text-left px-3 py-2 text-sm rounded-md text-text-secondary hover:bg-background hover:text-text-primary"
                                >
                                    Settings
                                </a>
                                <button
                                    onClick={onLogout}
                                    className="block w-full text-left px-3 py-2 text-sm rounded-md text-text-secondary hover:bg-accent-red/20 hover:text-accent-red"
                                >
                                    <div className="flex items-center">
                                        <LogoutIcon className="w-4 h-4 mr-2" />
                                        Logout
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;