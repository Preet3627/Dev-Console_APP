import React, { useState, useEffect, useCallback } from 'react';
import { SiteData } from '../types';
import { getDbTables, executeSafeDbQuery } from '../services/wordpressService';
import { convertPromptToSafeQuery } from '../services/aiService';
import { DatabaseIcon, ExecuteIcon, GenerateIcon } from './icons/Icons';

const DatabaseManager: React.FC<{ siteData: SiteData }> = ({ siteData }) => {
    const [tables, setTables] = useState<string[]>([]);
    const [aiPrompt, setAiPrompt] = useState('');
    const [results, setResults] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const fetchTables = useCallback(async () => {
        try {
            const fetchedTables = await getDbTables(siteData);
            setTables(fetchedTables);
        } catch (err) {
            setError('Failed to fetch database tables.');
        }
    }, [siteData]);

    useEffect(() => {
        fetchTables();
    }, [fetchTables]);

    const handleRunAiQuery = async () => {
        if (!aiPrompt) return;
        setIsLoading(true);
        setError(null);
        setResults(null);
        try {
            const safeQuery = await convertPromptToSafeQuery(aiPrompt, tables);
            const data = await executeSafeDbQuery(siteData, safeQuery.queryType, safeQuery.params);
            setResults(data);
        } catch (err) {
             setError(`Failed to execute query. Please check your AI prompt and API key. Error: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const renderResultsTable = () => {
        if (!results) return null;
        if (results.length === 0) return <p className="mt-4 text-text-secondary">Query returned no results.</p>;

        const headers = Object.keys(results[0]);

        return (
            <div className="overflow-x-auto mt-4 border border-border-primary rounded-lg">
                <table className="min-w-full text-sm text-left">
                    <thead className="bg-background">
                        <tr>
                            {headers.map(header => (
                                <th key={header} className="p-3 font-semibold">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-primary">
                        {results.map((row, rowIndex) => (
                            <tr key={rowIndex} className="hover:bg-background">
                                {headers.map(header => (
                                    <td key={`${rowIndex}-${header}`} className="p-3 whitespace-pre-wrap break-all">
                                        {typeof row[header] === 'object' ? JSON.stringify(row[header]) : String(row[header])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8 flex items-center">
                <DatabaseIcon className="w-8 h-8 mr-4 text-accent-blue" />
                Database Manager
            </h1>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1">
                    <h2 className="text-lg font-semibold mb-2">Tables</h2>
                    <div className="bg-background-secondary p-4 rounded-lg border border-border-primary max-h-96 overflow-y-auto">
                        <ul className="space-y-1">
                            {tables.map(table => (
                                <li key={table} className="text-sm font-mono text-text-secondary">{table}</li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="md:col-span-3 space-y-6">
                     <div className="bg-background-secondary p-6 rounded-lg border border-border-primary">
                        <h2 className="text-lg font-semibold mb-2 flex items-center">
                            <GenerateIcon className="w-5 h-5 mr-2 text-accent-green" />
                            AI Query Assistant
                        </h2>
                        <p className="text-sm text-text-secondary mb-3">Describe the data you want to retrieve in plain English. The AI will use safe, predefined queries to fetch it.</p>
                        <div className="flex space-x-2">
                           <input
                                type="text"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="e.g., Show me the 5 most recent users"
                                className="flex-grow p-2 bg-background border border-border-primary rounded-md"
                                disabled={isLoading}
                           />
                           <button onClick={handleRunAiQuery} disabled={isLoading || !aiPrompt} className="px-4 py-2 bg-accent-green hover:bg-accent-green-hover text-white rounded-md disabled:opacity-50 flex items-center">
                                <ExecuteIcon className="w-4 h-4 mr-2"/>
                               {isLoading ? 'Running...' : 'Run AI Query'}
                           </button>
                        </div>
                    </div>
                
                    <div>
                        <h2 className="text-lg font-semibold">Results</h2>
                        {error && <div className="mt-4 p-3 bg-accent-red/10 border border-accent-red/30 rounded-md text-sm text-accent-red/80">{error}</div>}
                        {renderResultsTable()}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DatabaseManager;
