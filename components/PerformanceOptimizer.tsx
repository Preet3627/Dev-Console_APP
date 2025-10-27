import React, { useState } from 'react';
import { SiteData, PageSpeedResponse, Audit } from '../types';
import { SpeedIcon } from './icons/Icons';
import { runPageSpeedScan } from '../services/pagespeedService';
import { analyzePageSpeedResult, isAiConfigured } from '../services/aiService';
import ScoreGauge from './ScoreGauge';

interface PerformanceOptimizerProps {
    siteData: SiteData;
}

const PerformanceOptimizer: React.FC<PerformanceOptimizerProps> = ({ siteData }) => {
    const [results, setResults] = useState<PageSpeedResponse | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [scanUrl, setScanUrl] = useState(siteData.siteUrl);
    const [analyzingAudit, setAnalyzingAudit] = useState<string | null>(null);
    const [aiRecommendations, setAiRecommendations] = useState<Record<string, string>>({});

    const handleRunScan = async () => {
        setIsLoading(true);
        setError(null);
        setResults(null);
        setAiRecommendations({});
        try {
            const scanResults = await runPageSpeedScan(scanUrl);
            setResults(scanResults);
        } catch (err) {
            setError(`Failed to perform performance scan: ${(err as Error).message}. Please check the URL and your PageSpeed API key in Settings.`);
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetAiFix = async (audit: Audit) => {
        if (!isAiConfigured()) {
            setAiRecommendations(prev => ({ ...prev, [audit.id]: "Please configure your Gemini API Key in Settings to use this feature." }));
            return;
        }
        setAnalyzingAudit(audit.id);
        try {
            const recommendation = await analyzePageSpeedResult(audit);
            setAiRecommendations(prev => ({ ...prev, [audit.id]: recommendation }));
        } catch (err) {
            setAiRecommendations(prev => ({ ...prev, [audit.id]: `Failed to get AI analysis: ${(err as Error).message}` }));
        } finally {
            setAnalyzingAudit(null);
        }
    };

    const renderAuditItem = (audit: Audit) => {
        const isAnalyzing = analyzingAudit === audit.id;
        const recommendation = aiRecommendations[audit.id];

        return (
             <details key={audit.id} className="bg-background-secondary border border-border-primary rounded-lg overflow-hidden">
                <summary className="p-4 cursor-pointer hover:bg-background flex justify-between items-center">
                    <div>
                        <h4 className="font-semibold">{audit.title}</h4>
                        {audit.displayValue && <p className="text-sm text-text-secondary">{audit.displayValue}</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${audit.score === 1 ? 'bg-accent-green/20 text-accent-green' : audit.score && audit.score > 0.5 ? 'bg-accent-yellow/20 text-accent-yellow' : 'bg-accent-red/20 text-accent-red'}`}>
                            {audit.score !== null ? `Score: ${Math.round(audit.score * 100)}` : 'Info'}
                        </span>
                    </div>
                </summary>
                <div className="p-4 border-t border-border-primary">
                    <div className="prose prose-sm prose-invert max-w-none mb-4" dangerouslySetInnerHTML={{ __html: audit.description.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')}}></div>
                    
                    <button onClick={() => handleGetAiFix(audit)} disabled={isAnalyzing || !isAiConfigured()} className="px-4 py-2 text-sm bg-accent-blue hover:bg-accent-blue-hover text-white rounded-md disabled:opacity-50">
                        {isAnalyzing ? 'Analyzing...' : 'Get AI Fix'}
                    </button>
                    {!isAiConfigured() && <p className="text-xs text-accent-yellow mt-1">Gemini API key required for this feature.</p>}
                    
                    {recommendation && (
                        <div className="mt-4 p-4 bg-background border border-border-primary rounded-md">
                            <div className="prose prose-sm prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: recommendation }} />
                        </div>
                    )}
                </div>
            </details>
        )
    }

    const renderResults = () => {
        if (isLoading) return <div className="text-center p-8">
            <p className="text-lg">Running PageSpeed analysis...</p>
            <p className="text-text-secondary text-sm">This may take a moment.</p>
        </div>;
        if (error) return <div className="text-center p-8 text-accent-red">{error}</div>;
        if (!results) return null;

        const { categories, audits } = results.lighthouseResult;
        const opportunityAudits = categories.performance.auditRefs
            .filter(ref => ref.group === 'opportunities' && audits[ref.id].score !== 1)
            .map(ref => audits[ref.id]);
            
        return (
            <div className="mt-8 space-y-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <ScoreGauge score={categories.performance.score} title="Performance" />
                    <ScoreGauge score={categories.accessibility.score} title="Accessibility" />
                    <ScoreGauge score={categories['best-practices'].score} title="Best Practices" />
                    <ScoreGauge score={categories.seo.score} title="SEO" />
                </div>
                <div>
                    <h3 className="text-2xl font-bold mb-4">Opportunities</h3>
                    <p className="text-text-secondary mb-4">These suggestions can help your page load faster. They don't directly affect the Performance score.</p>
                    <div className="space-y-4">
                        {opportunityAudits.length > 0 ? opportunityAudits.map(renderAuditItem) : <p>No significant opportunities found. Great job!</p>}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8">Performance Optimizer</h1>
             <div className="bg-background-secondary p-8 rounded-lg border border-border-primary">
                <div className="text-center">
                    <SpeedIcon className="w-16 h-16 mx-auto text-accent-purple mb-4" />
                    <h2 className="text-2xl font-semibold mb-2">Google PageSpeed Analysis</h2>
                    <p className="text-text-secondary max-w-2xl mx-auto mb-6">
                        Analyze your site's performance with Google PageSpeed Insights and get AI-powered recommendations to improve your scores.
                    </p>
                    <div className="flex max-w-xl mx-auto">
                        <input 
                            type="url"
                            value={scanUrl}
                            onChange={(e) => setScanUrl(e.target.value)}
                            className="flex-grow p-3 bg-background border border-border-primary rounded-l-md placeholder-text-secondary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                            placeholder="Enter URL to analyze"
                        />
                        <button onClick={handleRunScan} disabled={isLoading} className="px-8 py-3 bg-accent-blue hover:bg-accent-blue-hover text-white font-bold rounded-r-md disabled:opacity-50">
                            {isLoading ? 'Analyzing...' : 'Run Analysis'}
                        </button>
                    </div>
                </div>
                {renderResults()}
            </div>
        </div>
    );
};

export default PerformanceOptimizer;
