import { getSecureItem } from '../utils/secureLocalStorage';
import { PageSpeedResponse, AppSettings } from '../types';

const API_BASE_URL = 'https://www.googleapis.com/pagespeedonline/v5/runPagespeed';

export const runPageSpeedScan = async (url: string): Promise<PageSpeedResponse> => {
    const settings = getSecureItem<AppSettings>('appSettings');
    const apiKey = settings?.pageSpeedApiKey;
    
    if (!apiKey) {
        throw new Error("Google PageSpeed API key not found. Please add it in the Settings page.");
    }

    const apiUrl = `${API_BASE_URL}?url=${encodeURIComponent(url)}&key=${apiKey}&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;

    try {
        const response = await fetch(apiUrl);
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `API request failed with status ${response.status}`);
        }
        const data = await response.json();
        return data as PageSpeedResponse;
    } catch (error) {
        console.error("PageSpeed service error:", error);
        throw error;
    }
};