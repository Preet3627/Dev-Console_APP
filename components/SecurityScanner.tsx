import React, { useState } from 'react';
import { runSecurityScan } from '../services/wordpressService';
import { SiteData, SecurityIssue } from '../types';
import { ShieldIcon } from './icons/Icons';

interface SecurityScannerProps {
    siteData: SiteData;
}

const SecurityScanner: React.FC<SecurityScannerProps> = ({ siteData }) => {
    const [results, setResults] = useState<SecurityIssue[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanPerformed, setScanPerformed] = useState(false);

    const handleRunScan = async () => {
        setIsLoading(true);
        setError(null);
        setScanPerformed(true);
        try {
            const scanResults = await runSecurityScan(siteData);
            setResults(scanResults);
        } catch (err) {
            setError('Failed to perform security scan. Please try again.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };
    
    const getStatusColor = (status: 'pass' | 'fail' | 'warn') => {
        switch (status) {
            case 'pass': return 'text-accent-green';
            case 'fail': return 'text-accent-red';
            case 'warn': return 'text-accent-yellow';
            default: return 'text-text-secondary';
        }
    };

    const getSeverityColor = (severity: 'High' | 'Medium' | 'Low' | 'Info') => {
        switch (severity) {
            case 'High': return 'bg-accent-red/20 text-accent-red';
            case 'Medium': return 'bg-accent-yellow/20 text-accent-yellow';
            default: return 'bg-accent-blue/20 text-accent-blue';
        }
    }

    const renderResults = () => {
        if (!scanPerformed) return null;
        if (isLoading) return <div className="text-center p-8">Scanning your site...</div>;
        if (error) return <div className="text-center p-8 text-accent-red">{error}</div>;

        return (
            <div className="mt-8 space-y-4">
                {results.map(issue => (
                    <div key={issue.id} className="bg-background-secondary border border-border-primary rounded-lg p-4">
                        <div className="flex justify-between items-start">
                           <div>
                                <div className="flex items-center space-x-3">
                                    <span className={`font-bold ${getStatusColor(issue.status)}`}>{issue.status.toUpperCase()}</span>
                                    <h3 className="font-semibold text-lg">{issue.title}</h3>
                                </div>
                                <p className="text-sm text-text-secondary mt-1">{issue.description}</p>
                           </div>
                           <span className={`px-2 py-1 text-xs font-bold rounded-full ${getSeverityColor(issue.severity)}`}>{issue.severity}</span>
                        </div>
                         <div className="mt-3 pt-3 border-t border-border-primary">
                            <p className="text-sm"><strong className="font-semibold">Recommendation:</strong> {issue.recommendation}</p>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8">Security Scanner</h1>
            <div className="bg-background-secondary p-8 rounded-lg border border-border-primary">
                <div className="text-center">
                    <ShieldIcon className="w-16 h-16 mx-auto text-accent-blue mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">WordPress Security Scan</h2>
                    <p className="text-text-secondary max-w-xl mx-auto mb-6">
                        Check your site for common security vulnerabilities and configuration issues.
                    </p>
                    <button onClick={handleRunScan} disabled={isLoading} className="px-8 py-3 bg-accent-blue hover:bg-accent-blue-hover text-white font-bold rounded-lg disabled:opacity-50">
                        {isLoading ? 'Scanning...' : 'Run Scan'}
                    </button>
                </div>
                {renderResults()}
            </div>
        </div>
    );
};

export default SecurityScanner;
