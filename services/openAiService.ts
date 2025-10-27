import { getSecureItem } from '../utils/secureLocalStorage';
import { AppSettings } from '../types';

const API_URL = 'https://api.openai.com/v1/chat/completions';

export const generateText = async (prompt: string, model?: string): Promise<string> => {
    const settings = getSecureItem<AppSettings>('appSettings');
    const apiKey = settings?.openAiApiKey;

    if (!apiKey) {
        throw new Error("OpenAI API key not found in settings.");
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: model || 'gpt-4o',
                messages: [{ role: 'user', content: prompt }],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `OpenAI API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    } catch (error) {
        console.error("OpenAI service error:", error);
        throw error;
    }
};
