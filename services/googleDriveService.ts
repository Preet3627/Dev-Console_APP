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

const getAppFolderId = async (): Promise<string> => {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("Google Drive: Not authenticated.");

    const folderName = getAppFolderName();
    const query = `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and trashed=false`;
    
    const searchResponse = await fetch(`${API_URL_FILES}?q=${encodeURIComponent(query)}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!searchResponse.ok) throw new Error("Failed to search for Google Drive folder.");
    const searchData = await searchResponse.json();
    
    if (searchData.files && searchData.files.length > 0) {
        return searchData.files[0].id;
    }

    const createResponse = await fetch(API_URL_FILES, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder'
        })
    });
    if (!createResponse.ok) throw new Error("Failed to create Google Drive folder.");
    const createData = await createResponse.json();
    return createData.id;
};

export const uploadFile = async (fileName: string, content: Blob): Promise<boolean> => {
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("Google Drive: Not authenticated. Please re-authenticate in Settings.");

    try {
        const folderId = await getAppFolderId();
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
    const accessToken = getAccessToken();
    if (!accessToken) throw new Error("Google Drive: Not authenticated.");
    
    try {
        const folderId = await getAppFolderId();
        const query = `'${folderId}' in parents and trashed=false`;
        const response = await fetch(`${API_URL_FILES}?q=${encodeURIComponent(query)}&fields=files(id,name,size,createdTime)`, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        if (!response.ok) throw new Error("Failed to list Google Drive files.");
        const data = await response.json();
        return data.files || [];
    } catch (error) {
        console.error("Google Drive list files failed:", error);
        throw error;
    }
};