import { getSecureItem } from '../utils/secureLocalStorage';

const API_URL = 'https://api.perplexity.ai/chat/completions';

export const generateText = async (prompt: string, model?: string): Promise<string> => {
    const apiKey = getSecureItem<string>('perplexityApiKey');
    if (!apiKey) {
        throw new Error("Perplexity API key not found in settings.");
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model || 'llama-3-sonar-small-32k-online',
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `Perplexity API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    } catch (error) {
        console.error("Perplexity service error:", error);
        throw error;
    }
};
