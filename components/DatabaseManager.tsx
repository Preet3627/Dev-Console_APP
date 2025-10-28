import React, { useState, useEffect, useCallback } from 'react';
import { SiteData } from '../types';
import { getDbTables, executeArbitraryDbQuery } from '../services/wordpressService';
import { generateSqlQuery } from '../services/aiService';
import { DatabaseIcon, ExecuteIcon, GenerateIcon } from './icons/Icons';

const DatabaseManager: React.FC<{ siteData: SiteData }> = ({ siteData }) => {
    const [tables, setTables] = useState<string[]>([]);
    const [aiPrompt, setAiPrompt] = useState('');
    const [results, setResults] = useState<any[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedSql, setGeneratedSql] = useState('');
    const [showSqlConfirm, setShowSqlConfirm] = useState(false);
    
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

    const handleGenerateSqlQuery = async () => {
        if (!aiPrompt) return;
        setIsLoading(true);
        setError(null);
        setResults(null);
        try {
            const sql = await generateSqlQuery(aiPrompt, tables);
            setGeneratedSql(sql);
            setShowSqlConfirm(true);
        } catch (err) {
            setError(`AI failed to generate a valid query. Please check your prompt and API key. Error: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecuteConfirmedQuery = async () => {
        setShowSqlConfirm(false);
        setIsLoading(true);
        setError(null);
        try {
            const data = await executeArbitraryDbQuery(siteData, generatedSql);
            setResults(data);
        } catch (err) {
            setError(`Query failed to execute. Error: ${(err as Error).message}`);
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
                     <div className="glass-card p-6">
                        <h2 className="text-lg font-semibold mb-2 flex items-center">
                            <GenerateIcon className="w-5 h-5 mr-2 text-accent-green" />
                            AI Query Assistant
                        </h2>
                        <p className="text-sm text-text-secondary mb-3">Describe the data you want to retrieve. The AI will generate a SQL query for you to review and execute.</p>
                        <div className="flex space-x-2">
                           <input
                                type="text"
                                value={aiPrompt}
                                onChange={(e) => setAiPrompt(e.target.value)}
                                placeholder="e.g., Show me the 5 newest users"
                                className="input-field"
                                disabled={isLoading}
                           />
                           <button onClick={handleGenerateSqlQuery} disabled={isLoading || !aiPrompt} className="btn btn-primary flex items-center">
                                <GenerateIcon className="w-4 h-4 mr-2"/>
                               {isLoading ? 'Generating...' : 'Generate SQL'}
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

            {showSqlConfirm && (
                <div className="fixed inset-0 bg-overlay backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="glass-card w-full max-w-2xl p-6 modal-content-animation">
                        <h2 className="text-xl font-bold">Confirm SQL Query</h2>
                        <p className="text-text-secondary mt-2 mb-4">The AI generated the following query. Please review it before execution.</p>
                        <pre className="bg-background p-4 rounded-md border border-border-primary font-mono text-sm overflow-x-auto"><code>{generatedSql}</code></pre>
                        <div className="flex justify-end space-x-4 mt-6">
                            <button onClick={() => setShowSqlConfirm(false)} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleExecuteConfirmedQuery} className="btn btn-primary flex items-center">
                                <ExecuteIcon className="w-4 h-4 mr-2"/>
                                Execute Query
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DatabaseManager;