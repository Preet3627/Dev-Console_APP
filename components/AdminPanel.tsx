import React, { useState, useEffect, useCallback } from 'react';
import { listAllUsers, deleteUser, getAppSeoSettings, saveAppSeoSettings } from '../services/wordpressService';
import { AppSeoSettings } from '../types';
import { ShieldIcon, SeoIcon } from './icons/Icons';
import { View } from '../App';

interface User {
    id: string;
    email: string;
    site_url: string;
    registered_date: string;
}

const UserManagementTab: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const fetchedUsers = await listAllUsers();
            setUsers(fetchedUsers);
        } catch (err) {
            setError(`Failed to load users: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleDeleteUser = async (email: string) => {
        if (!window.confirm(`Are you sure you want to permanently delete the user ${email}? This action is irreversible.`)) {
            return;
        }
        try {
            await deleteUser(email);
            fetchUsers();
        } catch (err) {
            setError(`Failed to delete user: ${(err as Error).message}`);
        }
    };

    if (isLoading) return <div className="text-center p-8">Loading users...</div>;

    return (
        <div>
             {error && <div className="mb-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-center text-accent-red/80">{error}</div>}
            <div className="bg-background-secondary border border-border-primary rounded-lg overflow-hidden">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-background">
                        <tr>
                            <th className="p-3 font-semibold">Email</th>
                            <th className="p-3 font-semibold">Registered Date</th>
                            <th className="p-3 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-background">
                                <td className="p-3">{user.email}</td>
                                <td className="p-3">{new Date(user.registered_date).toLocaleString()}</td>
                                <td className="p-3">
                                    <button onClick={() => handleDeleteUser(user.email)} className="px-3 py-1 text-xs bg-accent-red/20 text-accent-red hover:bg-accent-red/30 rounded-md">Delete</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {users.length === 0 && <div className="text-center p-8 text-text-secondary">No registered users found.</div>}
            </div>
        </div>
    );
};

const AppSeoTab: React.FC = () => {
    const [settings, setSettings] = useState<AppSeoSettings>({ meta_title: '', meta_description: '', meta_keywords: '' });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState('');

    useEffect(() => {
        const fetchSettings = async () => {
            setIsLoading(true);
            try {
                const data = await getAppSeoSettings();
                if (data) setSettings(data);
            } catch (err) {
                setMessage(`Error fetching settings: ${(err as Error).message}`);
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        setMessage('');
        try {
            await saveAppSeoSettings(settings);
            setMessage('Settings saved successfully!');
        } catch (err) {
            setMessage(`Error saving settings: ${(err as Error).message}`);
        } finally {
            setIsSaving(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };
    
    if (isLoading) return <div className="text-center p-8">Loading SEO settings...</div>;

    return (
        <div className="max-w-2xl space-y-6">
            <p className="text-text-secondary text-sm">Configure the default meta tags for the Dev-Console application itself. This is useful for public-facing deployments.</p>
             <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-text-primary">Meta Title</label>
                    <input type="text" name="meta_title" value={settings.meta_title} onChange={handleChange} className="input-field mt-1" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-primary">Meta Description</label>
                    <textarea name="meta_description" value={settings.meta_description} onChange={handleChange} rows={3} className="input-field mt-1 resize-none" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-text-primary">Meta Keywords (comma-separated)</label>
                    <input type="text" name="meta_keywords" value={settings.meta_keywords} onChange={handleChange} className="input-field mt-1" />
                </div>
            </div>
             <div className="flex justify-end items-center">
                {message && <p className={`text-sm mr-4 ${message.startsWith('Error') ? 'text-accent-red' : 'text-accent-green'}`}>{message}</p>}
                <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>{isSaving ? 'Saving...' : 'Save SEO Settings'}</button>
            </div>
        </div>
    );
};

type AdminTab = 'users' | 'appSeo';

const AdminPanel: React.FC<{ navigate: (view: View) => void; initialTab?: AdminTab }> = ({ navigate, initialTab }) => {
    const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || 'users');
    
    useEffect(() => {
        if(initialTab) setActiveTab(initialTab);
    }, [initialTab]);
    
    // ADD: Sync URL with tab changes for browser history support.
    const handleSetTab = (tab: AdminTab) => {
        setActiveTab(tab);
        if (tab === 'users') {
            navigate('adminPanel');
        } else {
            navigate('appSeo');
        }
    };
    
    const tabs: { id: AdminTab, label: string, icon: React.ElementType }[] = [
        { id: 'users', label: 'User Management', icon: ShieldIcon },
        { id: 'appSeo', label: 'Application SEO', icon: SeoIcon },
    ];

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8">Admin Panel</h1>
            <div className="border-b border-border-primary mb-6">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => handleSetTab(tab.id)}
                            className={`flex items-center space-x-2 whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab.id
                                    ? 'border-accent-cyan text-accent-cyan'
                                    : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
                            }`}
                        >
                           <tab.icon className="w-5 h-5" />
                           <span>{tab.label}</span>
                        </button>
                    ))}
                </nav>
            </div>
            
            <div>
                {activeTab === 'users' && <UserManagementTab />}
                {activeTab === 'appSeo' && <AppSeoTab />}
            </div>
        </div>
    );
};

export default AdminPanel;