import { getSecureItem, setSecureItem, removeSecureItem } from "../utils/secureLocalStorage";
import { AppSettings } from "../types";

declare global {
    interface Window {
        google: any;
    }
}

let google: any = null;
let resolveSignIn: (value: string) => void;
let rejectSignIn: (reason?: any) => void;

function handleCredentialResponse(response: any) {
    if (response.credential) {
        resolveSignIn(response.credential);
    } else {
        console.error("Google Sign-In failed: No credential returned.", response);
        rejectSignIn('Google Sign-In failed or was cancelled by the user.');
    }
}

const initializeGsi = (reject: (reason?: any) => void): boolean => {
    const appSettings = getSecureItem<AppSettings>('appSettings');
    const clientId = appSettings?.googleClientId;

    if (!clientId) {
        reject('Google Client ID is not configured. Please add it in the Settings panel.');
        return false;
    }

    if (window.google) {
        google = window.google;
        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            use_fedcm_for_prompt: true,
        });
        return true;
    } else {
        reject("Google Identity Services script not loaded. Please try again later.");
        return false;
    }
};

export const triggerSignIn = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        resolveSignIn = resolve;
        rejectSignIn = reject;

        const isInitialized = initializeGsi(reject);
        if (isInitialized && google) {
            google.accounts.id.prompt();
        }
    });
};

/**
 * Initiates the Google OAuth2 flow to get an API access token for a specific scope (e.g., Google Drive).
 * @param scope The API scope to request permission for (e.g., 'https://www.googleapis.com/auth/drive.file').
 * @returns A promise that resolves with the access token.
 */
export const getGoogleApiToken = (scope: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const appSettings = getSecureItem<AppSettings>('appSettings');
        const clientId = appSettings?.googleClientId;

        if (!clientId || !window.google || !window.google.accounts || !window.google.accounts.oauth2) {
            return reject('Google Auth could not be initialized. Check Client ID and ensure the Google script is loaded.');
        }

        const tokenClient = window.google.accounts.oauth2.initTokenClient({
            client_id: clientId,
            scope: scope,
            callback: (tokenResponse: any) => {
                if (tokenResponse && tokenResponse.access_token) {
                    setSecureItem('googleDriveAccessToken', tokenResponse.access_token);
                    resolve(tokenResponse.access_token);
                } else {
                    reject('Failed to retrieve Google API access token.');
                }
            },
            error_callback: (error: any) => {
                reject(`Google Auth Error: ${error?.message || 'An unknown error occurred during authentication.'}`);
            }
        });

        // Request a new token. This will trigger the consent pop-up if needed.
        tokenClient.requestAccessToken();
    });
};

/**
 * Disconnects the app from Google Drive by removing the stored access token.
 */
export const disconnectGoogleDrive = (): void => {
    removeSecureItem('googleDriveAccessToken');
};