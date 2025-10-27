import React, { useState, useEffect, useCallback } from 'react';
import { getBackendConfigStatus } from '../services/wordpressService';
import { BackendConfigStatus } from '../types';
import { ServerIcon, DatabaseIcon, ShieldIcon, GoogleIcon, MailIcon } from './icons/Icons';

type Status = 'ok' | 'error' | 'not configured' | 'checking';

const StatusPill: React.FC<{ status: Status, text?: string }> = ({ status, text }) => {
    const colorClasses = {
        ok: 'bg-accent-green/20 text-accent-green',
        error: 'bg-accent-red/20 text-accent-red',
        'not configured': 'bg-accent-yellow/20 text-accent-yellow',
        checking: 'bg-background text-text-secondary animate-pulse',
    };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${colorClasses[status]}`}>{text || status}</span>;
};

const StatusRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
    <div className="flex justify-between items-center py-2">
        <span className="font-mono text-sm text-text-secondary">{label}</span>
        <span className="font-mono text-sm text-text-primary">{value}</span>
    </div>
);

const StatusCard: React.FC<{ title: string; icon: React.ElementType; data: Record<string, any>; connection?: { status: Status; error: string } }> = ({ title, icon: Icon, data, connection }) => (
    <div className="glass-card p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
            <Icon className="w-6 h-6 mr-3 text-accent-cyan" />
            {title}
        </h2>
        <div className="divide-y divide-border-primary">
            {Object.entries(data).map(([key, value]) => (
                <StatusRow key={key} label={key} value={value} />
            ))}
        </div>
        {connection && (
            <div className="mt-4 pt-4 border-t border-border-primary">
                 <div className="flex justify-between items-center">
                     <span className="text-sm font-semibold text-text-secondary">Connection Status</span>
                     <StatusPill status={connection.status} />
                </div>
                {connection.status === 'error' && connection.error && (
                    <p className="mt-2 text-xs font-mono text-accent-red bg-accent-red/10 p-2 rounded-md">{connection.error}</p>
                )}
            </div>
        )}
    </div>
);

const BackendStatusView: React.FC = () => {
    const [status, setStatus] = useState<BackendConfigStatus | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchStatus = useCallback(async () => {
        setIsLoading(true);
        setError('');
        try {
            const data = await getBackendConfigStatus();
            setStatus(data);
        } catch (err) {
            setError(`Failed to fetch backend status: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStatus();
    }, [fetchStatus]);

    if (isLoading) {
        return <div className="text-center p-8">Loading backend status...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-accent-red">{error}</div>;
    }

    if (!status) {
        return <div className="text-center p-8">No status information available.</div>;
    }

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8 flex items-center">
                <ServerIcon className="w-8 h-8 mr-4 text-accent-cyan" />
                Backend Status & Configuration
            </h1>
            <p className="text-text-secondary mb-8">
                This is a read-only view of the server's environment configuration and connection health. Sensitive values are masked for security.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StatusCard
                    title="Database"
                    icon={DatabaseIcon}
                    data={{
                        DB_HOST: status.database.DB_HOST,
                        DB_USER: status.database.DB_USER,
                        DB_DATABASE: status.database.DB_DATABASE,
                        DB_PASSWORD: status.database.DB_PASSWORD,
                    }}
                    connection={{ status: status.database.connectionStatus, error: status.database.connectionError }}
                />
                <StatusCard
                    title="Email (SMTP)"
                    icon={MailIcon}
                    data={{
                        SMTP_HOST: status.smtp.SMTP_HOST,
                        SMTP_PORT: status.smtp.SMTP_PORT,
                        SMTP_USER: status.smtp.SMTP_USER,
                        SMTP_PASS: status.smtp.SMTP_PASS,
                        SMTP_FROM: status.smtp.SMTP_FROM,
                        SMTP_SECURE: status.smtp.SMTP_SECURE,
                    }}
                    connection={{ status: status.smtp.connectionStatus, error: status.smtp.connectionError }}
                />
                <StatusCard
                    title="Application Secrets"
                    icon={ShieldIcon}
                    data={status.secrets}
                />
                <StatusCard
                    title="Google Services"
                    icon={GoogleIcon}
                    data={status.google}
                />
            </div>
        </div>
    );
};

export default BackendStatusView;