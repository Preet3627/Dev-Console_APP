import { proxyNextcloudRequest } from './wordpressService';

/**
 * Verifies the Nextcloud connection by proxying the request through the master plugin backend.
 * This avoids client-side CORS issues and is more secure.
 */
export const verifyConnection = async (): Promise<boolean> => {
    try {
        const response = await proxyNextcloudRequest('verify');
        if (!response.success) {
            console.error("Nextcloud verification failed on backend:", response.details);
            throw new Error(response.details || 'Nextcloud connection failed. Check credentials and server URL.');
        }
        return response.success;
    } catch (error) {
        console.error("Nextcloud verification proxy error:", error);
        throw error;
    }
};

/**
 * Uploads a file to Nextcloud by proxying through the master plugin.
 * @param fileName The name of the file to upload.
 * @param base64Content The base64-encoded content of the file.
 */
export const uploadFileToNextcloud = async (fileName: string, base64Content: string): Promise<boolean> => {
    try {
        const response = await proxyNextcloudRequest('upload_backup', { fileName, content: base64Content });
         if (!response.success) {
            console.error("Nextcloud upload failed on backend:", response.details);
            throw new Error(response.details || 'Nextcloud upload failed.');
        }
        return response.success;
    } catch (error) {
        console.error("Nextcloud upload proxy error:", error);
        throw error;
    }
};


// The functions below are placeholders for a full implementation.
// They would need to be updated to use the backend proxy similar to verifyConnection.

/**
 * Lists files from the dedicated backup folder in Nextcloud.
 * NOTE: This is a placeholder and not fully functional. It needs to be updated to use the backend proxy.
 */
export const listFiles = async (): Promise<any[]> => {
     console.warn("Nextcloud listFiles is not implemented with the backend proxy yet.");
     return Promise.reject("List files not implemented.");
};
