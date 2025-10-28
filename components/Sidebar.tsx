import React from 'react';
import { View } from '../App';
import { 
    HomeIcon, PluginIcon, ThemeIcon, DatabaseIcon, GenerateIcon, 
    ShieldIcon, SpeedIcon, FileIcon, SettingsIcon, LogoutIcon,
    BackupIcon, PM_SHRI_Logo, ServerIcon, SeoIcon, GeminiIcon
} from './icons/Icons';

interface SidebarProps {
    currentView: View;
    setView: (view: View) => void;
    onLogout: () => void;
    isAdmin: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, setView, onLogout, isAdmin }) => {

    const navItems: { view: View; label: string; icon: React.FC<any>; adminOnly?: boolean }[] = [
        { view: 'dashboard', label: 'Dashboard', icon: HomeIcon },
        { view: 'copilot', label: 'Co-Pilot Chat', icon: GeminiIcon },
        { view: 'plugins', label: 'Plugins', icon: PluginIcon },
        { view: 'themes', label: 'Themes', icon: ThemeIcon },
        { view: 'fileManager', label: 'File Manager', icon: FileIcon },
        { view: 'database', label: 'Database', icon: DatabaseIcon },
        { view: 'generator', label: 'AI Generator', icon: GenerateIcon },
        { view: 'scanner', label: 'Security Scanner', icon: ShieldIcon },
        { view: 'optimizer', label: 'Optimizer', icon: SpeedIcon },
        // ADD: New SEO Manager link.
        { view: 'seo', label: 'SEO Manager', icon: SeoIcon },
        { view: 'logs', label: 'Debug Logs', icon: FileIcon },
        { view: 'backupRestore', label: 'Backup/Restore', icon: BackupIcon },
        { view: 'backendStatus', label: 'Backend Status', icon: ServerIcon, adminOnly: true },
        // CHANGE: Modified Admin Panel link and added a new one for App SEO.
        { view: 'adminPanel', label: 'User Management', icon: ShieldIcon, adminOnly: true },
        { view: 'appSeo', label: 'Application SEO', icon: SeoIcon, adminOnly: true },
    ];

    const NavLink: React.FC<{ view: View; label: string; icon: React.FC<any> }> = ({ view, label, icon: Icon }) => {
        const isActive = currentView === view;
        return (
            <li>
                <button
                    onClick={() => setView(view)}
                    className={`flex items-center w-full p-3 my-1 rounded-lg transition-colors ${
                        isActive 
                        ? 'bg-accent-blue/20 text-accent-cyan shadow-glow-cyan' 
                        : 'text-text-secondary hover:bg-border-primary hover:text-text-primary'
                    }`}
                >
                    <Icon className="w-5 h-5 mr-4" />
                    <span className="font-medium">{label}</span>
                </button>
            </li>
        );
    };

    return (
        <aside className="w-64 bg-background-secondary p-4 flex flex-col border-r border-border-primary flex-shrink-0">
            <div className="flex items-center mb-8 px-2">
                 <PM_SHRI_Logo className="w-8 h-8 mr-2" />
                 <h1 className="text-xl font-bold tracking-wider">Dev-Console</h1>
            </div>
            <nav className="flex-1 overflow-y-auto pr-2">
                <ul>
                    {navItems.map(item => {
                        if (item.adminOnly && !isAdmin) {
                            return null;
                        }
                        return <NavLink key={item.view} {...item} />;
                    })}
                </ul>
            </nav>
            <div className="mt-auto">
                 <ul>
                     <NavLink view="settings" label="Settings" icon={SettingsIcon} />
                     <li>
                        <button
                            onClick={onLogout}
                            className="flex items-center w-full p-3 my-1 rounded-lg text-text-secondary hover:bg-accent-red/20 hover:text-accent-red transition-colors"
                        >
                            <LogoutIcon className="w-5 h-5 mr-4" />
                            <span className="font-medium">Logout</span>
                        </button>
                     </li>
                 </ul>
            </div>
        </aside>
    );
};

export default Sidebar;