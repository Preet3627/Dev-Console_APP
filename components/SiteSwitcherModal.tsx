
import React, { useState, useEffect, useRef } from 'react';
import { SiteData } from '../types';
import { CloseIcon, ConnectIcon, SignalIcon } from './icons/Icons';

interface SiteSwitcherModalProps {
    sites: SiteData[];
    currentSiteId: number | null;
    onSwitchSite: (site: SiteData) => void;
    onAddNewSite: () => void;
    onClose: () => void;
}

const SiteSwitcherModal: React.FC<SiteSwitcherModalProps> = ({ sites, currentSiteId, onSwitchSite, onAddNewSite, onClose }) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const listRef = useRef<HTMLUListElement>(null);

    useEffect(() => {
        const initialIndex = sites.findIndex(s => s.id === currentSiteId);
        setSelectedIndex(initialIndex >= 0 ? initialIndex : 0);
    }, [sites, currentSiteId]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelectedIndex(prev => (prev > 0 ? prev - 1 : sites.length)); // sites.length will be "Add New"
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelectedIndex(prev => (prev < sites.length ? prev + 1 : 0));
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selectedIndex < sites.length) {
                    onSwitchSite(sites[selectedIndex]);
                } else {
                    onAddNewSite();
                }
            } else if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedIndex, sites, onSwitchSite, onAddNewSite, onClose]);

    useEffect(() => {
        listRef.current?.children[selectedIndex]?.scrollIntoView({
            block: 'nearest',
        });
    }, [selectedIndex]);

    return (
        <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="glass-card w-full max-w-lg flex flex-col p-4 modal-content-animation" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-lg font-bold flex items-center">
                        Switch Site
                    </h2>
                     <p className="text-xs text-text-secondary font-mono">
                        <kbd>↑</kbd> <kbd>↓</kbd> to navigate, <kbd>Enter</kbd> to select, <kbd>Esc</kbd> to close
                    </p>
                    <button onClick={onClose} className="text-text-secondary hover:text-text-primary">
                        <CloseIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex-grow min-h-0 py-2">
                    <ul ref={listRef} className="max-h-96 overflow-y-auto">
                        {sites.map((site, index) => (
                            <li key={site.id}>
                                <button
                                    onClick={() => onSwitchSite(site)}
                                    className={`w-full text-left p-3 flex items-center justify-between rounded-md transition-colors ${selectedIndex === index ? 'bg-accent-blue/80 text-white' : 'hover:bg-background-secondary'}`}
                                >
                                    <div className="flex items-center">
                                        <SignalIcon className={`w-4 h-4 mr-3 ${site.id === currentSiteId ? 'text-accent-green' : 'text-text-secondary'}`} />
                                        <div>
                                            <p className="font-semibold">{site.name}</p>
                                            <p className={`text-sm ${selectedIndex === index ? 'text-blue-200' : 'text-text-secondary'}`}>{site.siteUrl}</p>
                                        </div>
                                    </div>
                                    {site.id === currentSiteId && <span className="text-xs font-bold">CURRENT</span>}
                                </button>
                            </li>
                        ))}
                         <li>
                            <button
                                onClick={onAddNewSite}
                                className={`w-full text-left p-3 flex items-center rounded-md transition-colors mt-2 border-t border-border-primary ${selectedIndex === sites.length ? 'bg-accent-blue/80 text-white' : 'hover:bg-background-secondary'}`}
                            >
                                <ConnectIcon className="w-4 h-4 mr-3" />
                                <span className="font-semibold">Connect New Site...</span>
                            </button>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default SiteSwitcherModal;
