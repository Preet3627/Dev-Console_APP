// services/localLlmService.ts

export const generateText = async (prompt: string, endpoint?: string, model?: string): Promise<string> => {
    if (!endpoint) {
        throw new Error("Local LLM endpoint is not configured.");
    }
    if (!model) {
        throw new Error("Local LLM model is not configured.");
    }

    try {
        const response = await fetch(`${endpoint}/generate`, { // Assuming a /generate endpoint
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: prompt,
                model: model,
                // Add any other parameters your local LLM API expects
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Local LLM API error: ${errorData.message || response.statusText}`);
        }

        const data = await response.json();
        // Assuming the local LLM returns text in a 'text' field
        return data.text || data.response || JSON.stringify(data); 

    } catch (error) {
        console.error("Error calling local LLM service:", error);
        throw new Error(`Failed to connect to local LLM: ${(error as Error).message}`);
    }
};
