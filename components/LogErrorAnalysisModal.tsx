import React, { useState, useEffect } from 'react';
import { analyzeErrorLog } from '../services/aiService';
import ThinkingModal from './ThinkingModal';
import { ErrorLog } from '../types';

interface LogErrorAnalysisModalProps {
    log: ErrorLog;
    onClose: () => void;
}

const LogErrorAnalysisModal: React.FC<LogErrorAnalysisModalProps> = ({ log, onClose }) => {
    const [analysis, setAnalysis] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [statusText, setStatusText] = useState('');

    useEffect(() => {
        const runAnalysis = async () => {
            setIsLoading(true);
            setError(null);
            try {
                setStatusText('Sending error log to the AI for analysis...');
                const result = await analyzeErrorLog(log);
                setAnalysis(result);
                setStatusText('Analysis complete.');
            } catch (err) {
                setError(`Failed to analyze log. Please check your API key in Settings. Error: ${(err as Error).message}`);
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        runAnalysis();
    }, [log]);

    return (
        <ThinkingModal
            title={`AI Analysis for Error`}
            statusText={error || statusText}
            isLoading={isLoading}
            onClose={onClose}
            showAccept={false}
        >
            {!isLoading && !error && (
                 <div 
                     className="prose prose-invert max-w-none h-full overflow-y-auto bg-background p-4 rounded-md border border-border-primary" 
                     dangerouslySetInnerHTML={{ __html: analysis.replace(/\n/g, '<br />') }}
                 ></div>
            )}
        </ThinkingModal>
    );
};

export default LogErrorAnalysisModal;
