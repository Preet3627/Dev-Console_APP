

import React, { useState, useRef, useEffect } from 'react';
import { ConnectIcon, RefreshIcon, SignalIcon, LogoutIcon } from './icons/Icons';
import { View } from '../App';
import { SiteData } from '../types';

interface HeaderProps {
    currentSite: SiteData | null;
    onOpenSiteSwitcher: () => void;
    onRefresh: () => Promise<void>;
    onTestConnection: () => void;
    displayName: string;
    profilePictureUrl: string | null;
    onLogout: () => void;
    setView: (view: View) => void;
}

const SiteIcon: React.FC<{ site: SiteData | null }> = ({ site }) => {
    const [hasError, setHasError] = useState(false);
    const isConnected = !!site;
    
    useEffect(() => {
        setHasError(false); // Reset error state when site changes
    }, [site]);

    if (!isConnected || hasError) {
        return <div className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-accent-green' : 'bg-accent-red'} transition-colors`}></div>;
    }

    const faviconUrl = `https://www.google.com/s2/favicons?domain=${new URL(site.siteUrl).hostname}&sz=32`;

    return <img src={faviconUrl} onError={() => setHasError(true)} alt="Site Favicon" className="w-4 h-4" />;
};


const Header: React.FC<HeaderProps> = ({ currentSite, onOpenSiteSwitcher, onRefresh, onTestConnection, displayName, profilePictureUrl, onLogout, setView }) => {
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

    const isConnected = !!currentSite;

    return (
        <header className="border-b border-border p-4 flex justify-between items-center flex-shrink-0">
            <button onClick={onOpenSiteSwitcher} className="flex items-center space-x-3 p-2 rounded-md hover:bg-background-secondary">
                <SiteIcon site={currentSite} />
                <div className="text-left">
                    <span className="text-sm font-semibold">{currentSite ? currentSite.name : 'Not Connected'}</span>
                    {currentSite && <p className="text-xs text-text-secondary">{currentSite.siteUrl}</p>}
                </div>
                 <span className="text-xs font-mono text-text-secondary ml-2">&#9662;</span>
            </button>
            <div className="flex items-center space-x-4">
                {isConnected && (
                     <>
                        <button onClick={onTestConnection} title="Test Connection" className="btn btn-secondary flex items-center space-x-2 text-xs !py-1.5 !px-3">
                            <SignalIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Test</span>
                        </button>
                        <button onClick={onRefresh} title="Refresh Data" className="btn btn-secondary flex items-center space-x-2 text-xs !py-1.5 !px-3">
                            <RefreshIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </>
                )}
                {!isConnected && (
                    <button onClick={onOpenSiteSwitcher} className="btn btn-primary flex items-center space-x-2 text-xs !py-1.5 !px-3">
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
