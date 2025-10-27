import { getSecureItem } from '../utils/secureLocalStorage';

const API_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const generateText = async (prompt: string, model?: string): Promise<string> => {
    const apiKey = getSecureItem<string>('groqApiKey');
    if (!apiKey) {
        throw new Error("Groq API key not found in settings.");
    }

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                messages: [{ role: 'user', content: prompt }],
                model: model || 'llama3-8b-8192',
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error.message || `Groq API request failed with status ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0]?.message?.content || '';
    } catch (error) {
        console.error("Groq service error:", error);
        throw error;
    }
};
