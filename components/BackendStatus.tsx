import React, { useState, useEffect } from 'react';
import { getBackendStatus } from '../services/wordpressService';
import { ServerIcon, DatabaseIcon } from './icons/Icons';

type Status = 'checking' | 'ok' | 'error' | 'unknown' | 'local';

interface ServiceStatus {
    backend: Status;
    database: Status;
    message?: string;
}

interface BackendStatusProps {
    onStatusChange?: (databaseStatus: Status) => void;
}


const StatusIndicator: React.FC<{ status: Status; label: string; icon: React.FC<any> }> = ({ status, label, icon: Icon }) => {
    const colorClasses = {
        checking: 'text-accent-yellow animate-pulse',
        ok: 'text-accent-green',
        error: 'text-accent-red',
        unknown: 'text-text-secondary',
        local: 'text-accent-blue'
    };

    return (
        <div className="flex items-center space-x-2">
            <Icon className={`w-5 h-5 ${colorClasses[status]}`} />
            <span className={`text-sm font-medium ${colorClasses[status]}`}>{label}: {status}</span>
        </div>
    );
};

const BackendStatus: React.FC<BackendStatusProps> = ({ onStatusChange }) => {
    const [status, setStatus] = useState<ServiceStatus>({ backend: 'checking', database: 'checking' });

    useEffect(() => {
        const checkStatus = async () => {
            const result = await getBackendStatus();
            const serviceStatus = result as ServiceStatus;
            setStatus(serviceStatus);
            if (onStatusChange) {
                onStatusChange(serviceStatus.database);
            }
        };
        checkStatus();
    }, [onStatusChange]);

    return (
        <div className="p-3 mb-6 bg-background rounded-lg border border-border-primary">
            <div className="flex justify-around items-center">
                <StatusIndicator status={status.backend} label="Backend" icon={ServerIcon} />
                <StatusIndicator status={status.database} label="Database" icon={DatabaseIcon} />
            </div>
            {status.message && (
                 <div className="mt-2 pt-2 border-t border-border-primary text-center text-xs text-accent-red font-mono">
                    {status.message}
                </div>
            )}
        </div>
    );
};

export default BackendStatus;