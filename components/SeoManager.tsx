import React, { useState, useEffect, useCallback } from 'react';
import { SiteData, WordpressSeoData } from '../types';
import { getWordpressSeoData, updateWordpressSeoData } from '../services/wordpressService';
import { SeoIcon } from './icons/Icons';

interface SeoManagerProps {
    siteData: SiteData;
}

const SeoManager: React.FC<SeoManagerProps> = ({ siteData }) => {
    const [seoData, setSeoData] = useState<WordpressSeoData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveMessage, setSaveMessage] = useState('');

    const fetchSeoData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await getWordpressSeoData(siteData);
            setSeoData(data);
        } catch (err) {
            setError(`Failed to load SEO data. Please check your connection. Error: ${(err as Error).message}`);
        } finally {
            setIsLoading(false);
        }
    }, [siteData]);

    useEffect(() => {
        fetchSeoData();
    }, [fetchSeoData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setSeoData(prev => prev ? { ...prev, [name]: value } : null);
    };

    const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = e.target;
        setSeoData(prev => prev ? { ...prev, [name]: checked } : null);
    };

    const handleSave = async () => {
        if (!seoData) return;
        setIsSaving(true);
        setSaveMessage('');
        try {
            await updateWordpressSeoData(siteData, seoData);
            setSaveMessage('SEO settings saved successfully!');
            setTimeout(() => setSaveMessage(''), 3000);
        } catch (err) {
            setSaveMessage(`Error saving settings: ${(err as Error).message}`);
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) {
        return <div className="text-center p-8">Loading SEO Settings...</div>;
    }

    if (error) {
        return <div className="text-center p-8 text-accent-red">{error}</div>;
    }

    return (
        <div>
            <h1 className="text-4xl font-bold mb-8 flex items-center">
                <SeoIcon className="w-8 h-8 mr-4 text-accent-green" />
                WordPress SEO Manager
            </h1>

            {seoData && (
                <div className="max-w-3xl space-y-8">
                    <div className="glass-card p-6">
                        <h2 className="text-xl font-semibold mb-4">General Settings</h2>
                        <div className="space-y-4">
                            <div>
                                <label htmlFor="site_title" className="block text-sm font-medium text-text-primary">Site Title</label>
                                <input
                                    type="text"
                                    id="site_title"
                                    name="site_title"
                                    value={seoData.site_title}
                                    onChange={handleInputChange}
                                    className="input-field mt-1"
                                />
                            </div>
                            <div>
                                <label htmlFor="tagline" className="block text-sm font-medium text-text-primary">Tagline</label>
                                <input
                                    type="text"
                                    id="tagline"
                                    name="tagline"
                                    value={seoData.tagline}
                                    onChange={handleInputChange}
                                    className="input-field mt-1"
                                />
                                <p className="text-xs text-text-secondary mt-1">In a few words, explain what this site is about.</p>
                            </div>
                            <div className="flex items-center space-x-3 pt-2">
                                <input
                                    id="is_public"
                                    name="is_public"
                                    type="checkbox"
                                    checked={seoData.is_public}
                                    onChange={handleCheckboxChange}
                                    className="h-4 w-4 rounded border-gray-300 text-accent-blue focus:ring-accent-blue"
                                />
                                <div>
                                    <label htmlFor="is_public" className="font-medium text-text-primary">Search Engine Visibility</label>
                                    <p className="text-sm text-text-secondary">Allow search engines to index this site.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                     <div className="flex justify-end items-center">
                        {saveMessage && <p className={`text-sm mr-4 ${saveMessage.startsWith('Error') ? 'text-accent-red' : 'text-accent-green'}`}>{saveMessage}</p>}
                        <button onClick={handleSave} className="btn btn-primary" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save SEO Settings'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SeoManager;