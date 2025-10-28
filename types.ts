export interface SiteData {
    id: number;
    name: string;
    siteUrl: string;
    accessKey: string;
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
    
    // Connector Plugin Settings
    autoUpdateConnector?: boolean;
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

// FIX: Redefined chat message types to properly support the full Gemini function calling loop, including text, function calls, and function responses. This is critical for showing tool output in the chat.
export interface TextPart { text: string; }
export interface FunctionCallPart { functionCall: any; }
export interface FunctionResponsePart {
  functionResponse: {
    name: string;
    response: {
        name: string;
        content: any;
    };
  };
}
export type Part = TextPart | FunctionCallPart | FunctionResponsePart;

export interface ChatMessage {
    id: string;
    role: 'user' | 'model';
    parts: Part[];
}


// ADD: Interface for a saved chat session.
export interface ChatSession {
    id: number;
    title: string;
    created_at: string;
    messages: ChatMessage[];
}

// ADD: Interface for WordPress SEO data.
export interface WordpressSeoData {
    site_title: string;
    tagline: string;
    is_public: boolean;
}

// ADD: Interface for the Dev-Console's own SEO settings for admins.
export interface AppSeoSettings {
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
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

export interface BackendConfigStatus {
    database: {
        DB_HOST: string;
        DB_USER: string;
        DB_DATABASE: string;
        DB_PASSWORD: '********' | 'Not Set';
        connectionStatus: 'ok' | 'error';
        connectionError: string;
    };
    secrets: {
        JWT_SECRET: '********' | 'Not Set';
    };
    google: {
        GOOGLE_CLIENT_ID: string;
    };
    smtp: {
        SMTP_HOST: string;
        SMTP_PORT: string;
        SMTP_USER: string;
        SMTP_PASS: '********' | 'Not Set';
        SMTP_FROM: string;
        SMTP_SECURE: string;
        connectionStatus: 'ok' | 'error' | 'not configured';
        connectionError: string;
    };
}