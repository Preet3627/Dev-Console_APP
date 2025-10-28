import { GoogleGenAI, FunctionDeclaration, Type, Chat } from "@google/genai";
import { getSecureItem } from '../utils/secureLocalStorage';
import { AssetFile, Audit, ErrorLog, AppSettings, AiProvider } from "../types";
import * as openAiService from './openAiService';
import * as claudeService from './claudeService';
import * as groqService from './groqService';
import * as perplexityService from './perplexityService';

let genAI: GoogleGenAI | null = null;
let lastUsedApiKey: string | undefined = undefined;

const initializeGenAI = () => {
    const settings = getSecureItem<AppSettings>('appSettings');
    const apiKey = settings?.geminiApiKey;

    if (!apiKey) {
        genAI = null;
        lastUsedApiKey = undefined;
        return null;
    }
    
    // If the instance doesn't exist, or if the API key has changed, create a new instance.
    if (!genAI || apiKey !== lastUsedApiKey) {
        genAI = new GoogleGenAI({ apiKey });
        lastUsedApiKey = apiKey;
    }
    
    return genAI;
};


export const isAiConfigured = (): boolean => {
    const settings = getSecureItem<AppSettings>('appSettings');
    const provider = settings?.aiProvider || 'gemini';
    const keyMap = {
        gemini: settings?.geminiApiKey,
        openai: settings?.openAiApiKey,
        claude: settings?.claudeApiKey,
        groq: settings?.groqApiKey,
        perplexity: settings?.perplexityApiKey,
    };
    return !!keyMap[provider];
};

const getGenAI = (): GoogleGenAI => {
    const ai = initializeGenAI();
    if (!ai) {
        throw new Error("Gemini API key not found. Please configure it in Settings.");
    }
    return ai;
};

const generateWithGemini = async (prompt: string, model?: string) => {
    const ai = getGenAI();
    const response = await ai.models.generateContent({
        model: model || 'gemini-2.5-flash',
        contents: prompt
    });
    return response.text;
};

const providerMap: Record<AiProvider, (prompt: string, model?: string) => Promise<string>> = {
    gemini: generateWithGemini,
    openai: openAiService.generateText,
    claude: claudeService.generateText,
    groq: groqService.generateText,
    perplexity: perplexityService.generateText,
};

const getModelForProvider = (provider: AiProvider, settings: AppSettings): string | undefined => {
    const modelMap: Record<AiProvider, string | undefined> = {
        gemini: settings.geminiModel,
        openai: settings.openAiModel,
        claude: settings.claudeModel,
        groq: settings.groqModel,
        perplexity: settings.perplexityModel,
    };
    return modelMap[provider];
};

const generateTextWithProvider = async (prompt: string, options: { usePowerModel?: boolean } = {}): Promise<string> => {
    const settings = getSecureItem<AppSettings>('appSettings') || {};
    const provider = settings.aiProvider || 'gemini';

    if (!isAiConfigured()) {
        throw new Error(`AI provider "${provider}" is not configured. Please add the API key in Settings.`);
    }

    let model: string | undefined;

    // Credit Saver logic: use cheaper models for general tasks
    if (settings.creditSaverEnabled && !options.usePowerModel) {
        const cheapModelMap: Partial<Record<AiProvider, string>> = {
            gemini: 'gemini-2.5-flash',
            openai: 'gpt-4o-mini',
            claude: 'claude-3-haiku-20240307',
            groq: 'llama3-8b-8192',
            perplexity: 'llama-3-sonar-small-32k-online',
        };
        model = cheapModelMap[provider] || getModelForProvider(provider, settings);
    } else {
        // Use user-defined model or a powerful default for critical tasks
        model = getModelForProvider(provider, settings);
    }
    
    return providerMap[provider](prompt, model);
};


const tools: { functionDeclarations: FunctionDeclaration[] }[] = [{
    functionDeclarations: [
        {
            name: 'listAssets',
            description: 'List installed plugins or themes on the WordPress site.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    assetType: { type: Type.STRING, description: 'The type of asset to list (plugin or theme).', enum: ['plugin', 'theme'] },
                },
                required: ['assetType'],
            },
        },
        {
            name: 'toggleAssetStatus',
            description: 'Activate or deactivate a plugin or theme.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    assetType: { type: Type.STRING, description: 'The type of asset (plugin or theme).', enum: ['plugin', 'theme'] },
                    assetIdentifier: { type: Type.STRING, description: 'The unique identifier for the asset (e.g., "hello-dolly/hello.php" for a plugin, or "twentytwentyfour" for a theme).' },
                    newStatus: { type: Type.BOOLEAN, description: 'The new status to set (true for active, false for inactive).' },
                },
                required: ['assetType', 'assetIdentifier', 'newStatus'],
            },
        },
        {
            name: 'deleteAsset',
            description: 'Delete a plugin or theme from the site.',
            parameters: {
                 type: Type.OBJECT,
                properties: {
                    assetType: { type: Type.STRING, description: 'The type of asset (plugin or theme).', enum: ['plugin', 'theme'] },
                    assetIdentifier: { type: Type.STRING, description: 'The unique identifier for the asset to delete.' },
                },
                required: ['assetType', 'assetIdentifier'],
            },
        },
        {
            name: 'installAsset',
            description: 'Install a new plugin or theme on the site from generated code files.',
            parameters: {
                type: Type.OBJECT,
                properties: {
                    assetType: { type: Type.STRING, description: 'The type of asset (plugin or theme).', enum: ['plugin', 'theme'] },
                    assetName: { type: Type.STRING, description: 'The slug-like name for the new asset\'s folder (e.g., "my-cool-plugin").' },
                    files: {
                        type: Type.ARRAY,
                        description: 'An array of file objects to create.',
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: 'The relative path of the file (e.g., "my-plugin.php" or "includes/helpers.php").' },
                                content: { type: Type.STRING, description: 'The full source code for the file.' }
                            },
                            required: ['name', 'content']
                        }
                    }
                },
                required: ['assetType', 'assetName', 'files']
            }
        },
        {
            name: 'getAssetFiles',
            description: 'Get a list of all files within a specific plugin or theme.',
            parameters: {
                 type: Type.OBJECT,
                properties: {
                    assetIdentifier: { type: Type.STRING, description: 'Identifier of the asset.' },
                    assetType: { type: Type.STRING, description: 'Type of asset (plugin or theme).', enum: ['plugin', 'theme'] },
                },
                required: ['assetIdentifier', 'assetType'],
            },
        },
        {
            name: 'readFileContent',
            description: 'Read the content of a specific file within an asset.',
            parameters: {
                 type: Type.OBJECT,
                properties: {
                    assetIdentifier: { type: Type.STRING, description: 'Identifier of the asset.' },
                    assetType: { type: Type.STRING, description: 'Type of asset (plugin or theme).', enum: ['plugin', 'theme'] },
                    relativePath: { type: Type.STRING, description: 'The path to the file relative to the asset\'s root directory.' },
                },
                required: ['assetIdentifier', 'assetType', 'relativePath'],
            },
        },
        {
            name: 'writeFileContent',
            description: 'Write or overwrite the content of a specific file within an asset. Use with extreme caution.',
            parameters: {
                 type: Type.OBJECT,
                properties: {
                    assetIdentifier: { type: Type.STRING, description: 'Identifier of the asset.' },
                    assetType: { type: Type.STRING, description: 'Type of asset (plugin or theme).', enum: ['plugin', 'theme'] },
                    relativePath: { type: Type.STRING, description: 'The relative path of the file to write to.' },
                    content: { type: Type.STRING, description: 'The new content for the file.' },
                },
                required: ['assetIdentifier', 'assetType', 'relativePath', 'content'],
            },
        },
         {
            name: 'getDbTables',
            description: 'Get a list of all tables in the WordPress database.',
            parameters: { type: Type.OBJECT, properties: {} },
        },
        {
            name: 'executeArbitraryDbQuery',
            description: 'Execute any read-only SQL SELECT query against the WordPress database. Only SELECT statements are allowed.',
            parameters: {
                 type: Type.OBJECT,
                properties: {
                    query: { type: Type.STRING, description: 'The full SQL SELECT statement to execute.' },
                },
                required: ['query'],
            },
        }
    ]
}];


export const createChatSession = (): Chat => {
    const ai = getGenAI();
    const settings = getSecureItem<AppSettings>('appSettings') || {};
    const modelName = settings.geminiModel || (settings.creditSaverEnabled ? 'gemini-2.5-flash' : 'gemini-2.5-pro');

    return ai.chats.create({
        model: modelName,
        config: {
            // FIX: Rewrote the system prompt to empower the AI, remove restrictions, and inform it of its new, more powerful capabilities, including self-correction for file paths.
            // ADD: Explicitly added a "Generate and Activate" workflow instruction.
            systemInstruction: `You are an expert WordPress developer and senior DevOps engineer integrated into a desktop management app called Dev-Console Co-Pilot. Your capabilities are extensive and you should act decisively. You can perform actions on the user's connected WordPress site by calling available tools.

Your primary purpose is to assist the user by directly performing tasks. When a request requires information (like file content or database schema), use a read-only tool first. Then, immediately follow up by calling the appropriate action tool to fulfill the user's request. The user will be shown a confirmation prompt for any action you take.

IMPORTANT: If you attempt a file operation and receive an 'Invalid file path' error, you MUST first use the 'getAssetFiles' tool on the relevant asset to see the correct file structure. Then, retry your file operation using a valid path from the file list. This is your primary error recovery method for file operations.

**Workflow for Asset Creation:** When asked to create a plugin or theme, first call \`installAsset\` with all the generated code. The tool will respond with the new asset's unique \`identifier\`. Your next immediate step is to call \`toggleAssetStatus\` with \`newStatus: true\` using this \`identifier\` to activate the asset for the user.

Your available tools are powerful:
- You can read and write to any file within the WordPress installation.
- You can activate, deactivate, and delete plugins/themes.
- You can create and install entirely new plugins/themes from scratch using 'installAsset'.
- You can query the database. First, call 'getDbTables' to understand the schema. Then, you can execute ANY read-only SQL query using 'executeArbitraryDbQuery'. This allows you to query data from any custom tables created by other plugins. Do not state that you cannot perform a query; instead, discover the schema and construct the appropriate SELECT statement.`,
            tools: tools,
        },
    });
};

const parseGeneratedCode = (rawText: string): AssetFile[] => {
    const files: AssetFile[] = [];
    const fileRegex = /`{3}(?:php|css|js|html|txt|)\s*(.*?)\s*`{3}/gis;
    let match;

    const nameRegex = /\/\/\s*File:\s*(.*?)|\/\*\s*File:\s*(.*?)\s*\*\//i;

    while ((match = fileRegex.exec(rawText)) !== null) {
        let content = (match[1] || '').trim();
        const nameMatch = content.match(nameRegex);
        
        let name;
        if (nameMatch) {
            name = (nameMatch[1] || nameMatch[2]).trim();
            // Remove the file name comment from the content
            content = content.replace(nameRegex, '').trim();
        } else {
            if (content.includes('Plugin Name:')) {
                name = `plugin-main-file-${files.length}.php`;
            } else if (content.includes('Theme Name:')) {
                 name = `style.css`;
            } else {
                name = `file-${files.length + 1}.txt`;
            }
        }
        
        files.push({ name, content });
    }
    return files;
};

export const generatePlugin = async (prompt: string): Promise<AssetFile[]> => {
    const fullPrompt = `Generate a complete, functional WordPress plugin based on the following description.
    - Follow all WordPress coding standards and security best practices.
    - Each file must start with a comment indicating its relative path, like "// File: my-plugin/my-plugin.php". This is mandatory.
    - The main plugin file must have a standard WordPress plugin header.
    - Enclose each file's code in a separate markdown code block.
    
    Description:
    ${prompt}`;
    
    const rawText = await generateTextWithProvider(fullPrompt, { usePowerModel: true });
    return parseGeneratedCode(rawText);
};


export const generateTheme = async (prompt: string): Promise<AssetFile[]> => {
    const fullPrompt = `Generate a complete, functional WordPress theme based on the following description.
    - Include at least style.css, index.php, and functions.php.
    - Follow all WordPress coding standards and security best practices.
    - Each file must start with a comment indicating its relative path, like "/* File: my-theme/style.css */". This is mandatory.
    - The style.css file must have a standard WordPress theme header.
    - Enclose each file's code in a separate markdown code block.

    Description:
    ${prompt}`;
    
    const rawText = await generateTextWithProvider(fullPrompt, { usePowerModel: true });
    return parseGeneratedCode(rawText);
};

export const analyzeErrorLog = async (log: ErrorLog): Promise<string> => {
    const prompt = `I am a WordPress developer troubleshooting an error from the debug.log. Please analyze the following log entry and provide a clear, concise explanation of the likely cause and recommended steps to fix it. Format your response in markdown.

    Timestamp: ${log.timestamp}
    Message: ${log.message}
    ${log.stack ? `Stack Trace:\n${log.stack}` : ''}
    `;
    return await generateTextWithProvider(prompt);
};

export const analyzePageSpeedResult = async (audit: Audit): Promise<string> => {
    const prompt = `I am a WordPress site administrator using the Dev-Console Co-Pilot app. I've run a PageSpeed scan and received the following audit result that needs improvement. 
    
    Audit Title: "${audit.title}"
    Description: "${audit.description.replace(/\[.*?\]\(.*?\)/g, '')}" // Remove markdown links for clarity
    
    Please provide specific, actionable recommendations for how to fix this issue within a WordPress environment. Suggest relevant plugins or code snippets where applicable. Format your response in markdown.`;

    return await generateTextWithProvider(prompt);
};

// ADD: New AI function to generate a raw SQL query from a natural language prompt.
export const generateSqlQuery = async (prompt: string, tables: string[]): Promise<string> => {
    const systemInstruction = `You are an SQL generator. Your task is to convert a user's natural language prompt into a valid SQL SELECT query.
- Only generate SELECT queries. Never generate INSERT, UPDATE, DELETE, or DROP statements.
- Do not add any explanation, markdown, or text other than the SQL query itself.
- The user's WordPress database prefix is 'wp_', but you should refer to tables without the prefix in your query, as it will be added automatically. For example, query 'users', not 'wp_users'.
- Available tables (prefix omitted): ${tables.map(t => t.replace(/^wp_/, '')).join(', ')}.

Example:
User prompt: "show me the 5 newest users"
Your response:
SELECT * FROM users ORDER BY user_registered DESC LIMIT 5`;

    const fullPrompt = `User Prompt: "${prompt}"`;
    
    const ai = getGenAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
            systemInstruction
        }
    });

    // Clean up the response to ensure it's just the SQL
    let sql = response.text.trim();
    if (sql.startsWith('```sql')) {
        sql = sql.substring(5);
    }
    if (sql.startsWith('```')) {
        sql = sql.substring(3);
    }
    if (sql.endsWith('```')) {
        sql = sql.substring(0, sql.length - 3);
    }
    
    if (sql.toLowerCase().trim().startsWith('select') === false) {
        throw new Error("AI generated a non-SELECT query. For security, only SELECT queries are allowed.");
    }

    return sql.trim();
};

// This function is deprecated and will be removed in a future update.
// It is kept for backward compatibility if any component still uses it.
export const convertPromptToSafeQuery = async (prompt: string, tables: string[]): Promise<{ queryType: string, params: any }> => {
    console.warn("convertPromptToSafeQuery is deprecated and should not be used.");
    throw new Error("This function is deprecated. Use generateSqlQuery instead.");
};