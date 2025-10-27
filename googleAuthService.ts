import { getSecureItem } from "@/utils/secureLocalStorage";
import { AppSettings } from "@/types";

// Add a global declaration for 'window.google' to inform TypeScript.
declare global {
    interface Window {
        google: any;
    }
}

let google: any = null;
let resolveSignIn: (value: string) => void;
let rejectSignIn: (reason?: any) => void;

// Callback function to handle the credential response from Google.
function handleCredentialResponse(response: any) {
    if (response.credential) {
        // If we get a credential token, resolve the promise with it.
        resolveSignIn(response.credential);
    } else {
        console.error("Google Sign-In failed: No credential returned.", response);
        rejectSignIn('Google Sign-In failed or was cancelled by the user.');
    }
}

// Initializes the Google Identity Services client.
const initializeGsi = (): boolean => {
    // Fetch the app settings which contain the Client ID.
    const appSettings = getSecureItem<AppSettings>('appSettings');
    const clientId = appSettings?.googleClientId;

    if (!clientId) {
        console.error("Google Client ID is not configured in settings.");
        return false;
    }

    // Check if the Google script has loaded.
    if (window.google) {
        google = window.google;
        google.accounts.id.initialize({
            client_id: clientId,
            callback: handleCredentialResponse,
            // Opt-in to FedCM to resolve potential cross-origin permission issues in iframes.
            use_fedcm_for_prompt: true,
        });
        return true;
    } else {
        console.error("Google Identity Services script not loaded.");
        return false;
    }
};

// Triggers the Google Sign-In prompt.
export const triggerSignIn = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        // Store the promise's resolve/reject functions so the callback can use them.
        resolveSignIn = resolve;
        rejectSignIn = reject;

        const isInitialized = initializeGsi();
        if (isInitialized && google) {
            // Display the One Tap or Sign In prompt to the user.
            google.accounts.id.prompt();
        } else {
            reject('Google Auth could not be initialized. Please check your Google Client ID in the Settings panel.');
        }
    });
};