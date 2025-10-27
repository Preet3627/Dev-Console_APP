import { getSecureItem } from "../utils/secureLocalStorage";
import { AppSettings } from "../types";

const API_URL_FILES = 'https://www.googleapis.com/drive/v3/files';
const API_URL_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files';

const getAccessToken = (): string | null => {
    return getSecureItem<string>('googleDriveAccessToken');
};

const getAppFolderName = (): string => {
    const settings = getSecureItem<AppSettings>('appSettings');
    return settings?.googleDrive?.folderName || 'Dev-Console Backups';
}

const findOrCreateFolder = async (folderName: string, parentId?: string): Promise<string> => {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("Google Drive: Not authenticated.");

    let query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    if (parentId) {
        query += ` and '${parentId}' in parents`;
    }
    
    const searchResponse = await fetch(`${API_URL_FILES}?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!searchResponse.ok) throw new Error("Failed to search for Google Drive folder.");
    const searchData = await searchResponse.json();
    
    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    const metadata: { name: string; mimeType: string; parents?: string[] } = {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
    };
    if (parentId) {
        metadata.parents = [parentId];
    }

    const createResponse = await fetch(API_URL_FILES, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(metadata)
    });
    if (!createResponse.ok) throw new Error("Failed to create Google Drive folder.");
    const createData = await createResponse.json();
    return createData.id;
};


const getSiteFolderId = async (siteUrl: string): Promise<string> => {
    // 1. Find or create the main application folder.
    const appFolderId = await findOrCreateFolder(getAppFolderName());

    // 2. Create a sanitized, unique folder name for the specific site.
    const siteFolderName = siteUrl.replace(/https?:\/\//, '').replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // 3. Find or create the site-specific subfolder inside the main app folder.
    const siteFolderId = await findOrCreateFolder(siteFolderName, appFolderId);
    return siteFolderId;
};

export const uploadFile = async (siteUrl: string, fileName: string, content: Blob): Promise<boolean> => {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("Google Drive: Not authenticated. Please re-authenticate in Settings.");

    try {
        const folderId = await getSiteFolderId(siteUrl);
        const metadata = {
            name: fileName,
            parents: [folderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', content);

        const response = await fetch(`${API_URL_UPLOAD}?uploadType=multipart`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${accessToken}` },
            body: form
        });

        if (!response.ok) {
            const errorBody = await response.json();
            throw new Error(errorBody.error.message || "Upload to Google Drive failed.");
        }
        return true;
    } catch (error) {
        console.error("Google Drive upload failed:", error);
        throw error;
    }
};

export const listFiles = async (): Promise<any[]> => {
    // This function might need to be adapted for multi-site context,
    // for now it's a placeholder to avoid breaking changes.
    console.warn("Google Drive listFiles is not adapted for multi-site yet.");
    return Promise.resolve([]);
};