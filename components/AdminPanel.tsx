import React, { useState, useEffect, useCallback } from 'react';
import { listAllUsers, deleteUser } from '../services/wordpressService';
import { ShieldIcon } from './icons/Icons';

interface User {
    id: string;
    email: string;
    site_url: string;
    registered_date: string;
}

const AdminPanel: React.FC = () => {
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
            // Refresh the user list after deletion
            fetchUsers();
        } catch (err) {
            setError(`Failed to delete user: ${(err as Error).message}`);
        }
    };

    if (isLoading) {
        return <div className="text-center p-8">Loading users...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-accent-red">{error}</div>;
    }

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8 flex items-center">
                <ShieldIcon className="w-8 h-8 mr-4 text-accent-violet" />
                Admin Panel: User Management
            </h1>
            <div className="bg-background-secondary border border-border-primary rounded-lg overflow-hidden">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-background">
                        <tr>
                            <th className="p-3 font-semibold">Email</th>
                            <th className="p-3 font-semibold">Connected Site URL</th>
                            <th className="p-3 font-semibold">Registered Date</th>
                            <th className="p-3 font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-background">
                                <td className="p-3">{user.email}</td>
                                <td className="p-3 font-mono">{user.site_url || 'Not Set'}</td>
                                <td className="p-3">{new Date(user.registered_date).toLocaleString()}</td>
                                <td className="p-3">
                                    <button
                                        onClick={() => handleDeleteUser(user.email)}
                                        className="px-3 py-1 text-xs bg-accent-red/20 text-accent-red hover:bg-accent-red/30 rounded-md"
                                    >
                                        Delete
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                 {users.length === 0 && (
                    <div className="text-center p-8 text-text-secondary">No registered users found.</div>
                )}
            </div>
        </div>
    );
};

export default AdminPanel;
