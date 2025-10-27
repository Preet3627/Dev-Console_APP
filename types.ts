export interface SiteData {
    siteUrl: string;
    connectorKey: string;
    apiKey: string;
}

export type AiProvider = 'gemini' | 'openai' | 'claude' | 'groq' | 'perplexity';

export interface NextcloudSettings {
    serverUrl?: string;
    username?: string;
    password?: string; // App password
    backupPath?: string; // New: Custom backup path
}

export interface GoogleDriveSettings {
    folderName?: string; // New: Custom folder name
}

export interface AppSettings {
    geminiApiKey?: string;
    pageSpeedApiKey?: string;
    googleClientId?: string;
    openAiApiKey?: string;
    claudeApiKey?: string;
    groqApiKey?: string;
    perplexityApiKey?: string;

    // AI Configuration
    aiProvider?: AiProvider;
    creditSaverEnabled?: boolean;
    smartAiSelectionEnabled?: boolean;
    geminiModel?: string;
    openAiModel?: string;
    claudeModel?: string;
    groqModel?: string;
    perplexityModel?: string;
    
    // Cloud Storage Settings
    nextcloud?: NextcloudSettings;
    googleDrive?: GoogleDriveSettings;

    // Auto backup settings (future use)
    autoBackupEnabled?: boolean;
    autoBackupFrequency?: 'daily' | 'weekly' | 'monthly';
    autoBackupDestination?: 'local' | 'nextcloud' | 'googledrive';
}


export enum AssetType {
    Plugin = 'plugin',
    Theme = 'theme',
}

export interface Asset {
    type: AssetType;
    name: string;
    identifier: string; // plugin path or theme slug
    version: string;
    isActive: boolean;
}

export interface AssetFile {
    name: string; // relative path from asset root
    content?: string;
}

export interface BackupFile {
    path: string;
    timestamp: string;
}

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    parts: [{ text: string }];
    toolCalls?: any[];
}

export interface SecurityIssue {
    id: string;
    title: string;
    description: string;
    status: 'pass' | 'fail' | 'warn';
    severity: 'High' | 'Medium' | 'Low' | 'Info';
    recommendation: string;
}

export interface PageSpeedResponse {
    lighthouseResult: {
        categories: {
            performance: { score: number; auditRefs: { id: string, group: string }[] };
            accessibility: { score: number };
            'best-practices': { score: number };
            seo: { score: number };
        };
        audits: {
            [key: string]: Audit;
        };
    };
}

export interface Audit {
    id: string;
    title: string;
    description: string;
    score: number | null;
    displayValue?: string;
}

export interface ErrorLog {
    timestamp: string;
    message: string;
    stack?: string;
}
