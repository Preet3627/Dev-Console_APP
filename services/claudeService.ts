import { getSecureItem } from '../utils/secureLocalStorage';
import { AppSettings } from '../types';

const API_URL = 'https://api.anthropic.com/v1/messages';

export const generateText = async (prompt: string, model?: string): Promise<string> => {
    const settings = getSecureItem<AppSettings>('appSettings');
    const apiKey = settings?.claudeApiKey;

    if (!apiKey) {
        throw new Error("Anthropic Claude API key not found in settings.");
    }

    try {
        // NOTE: The Anthropic API may have CORS restrictions. If this fails when called from a browser,
        // a proxy through the master plugin might be necessary.
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model || 'claude-3-haiku-20240307',
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            const errorMessage = errorData?.error?.message || `Claude API request failed with status ${response.status}`;
            throw new Error(errorMessage);
        }

        const data = await response.json();
        const contentBlock = data.content.find((block: any) => block.type === 'text');
        return contentBlock?.text || '';
    } catch (error) {
        console.error("Claude service error:", error);
        throw error;
    }
};
