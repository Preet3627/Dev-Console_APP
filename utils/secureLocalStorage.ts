// A simple obfuscation layer for local storage.
// In a real-world app, use a more robust solution for sensitive data.

const encode = (str: string): string => {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
        return btoa(str); // Fallback for binary data
    }
};

const decode = (str: string): string => {
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) {
        return atob(str); // Fallback
    }
};

export const setSecureItem = (key: string, value: any): void => {
    try {
        const stringValue = JSON.stringify(value);
        localStorage.setItem(encode(key), encode(stringValue));
    } catch (error) {
        console.error('Failed to save to secure local storage', error);
    }
};

export const getSecureItem = <T>(key: string): T | null => {
    try {
        const encodedKey = encode(key);
        const encodedValue = localStorage.getItem(encodedKey);
        if (encodedValue === null) {
            return null;
        }
        const decodedValue = decode(encodedValue);
        return JSON.parse(decodedValue) as T;
    } catch (error) {
        console.error('Failed to retrieve from secure local storage', error);
        return null;
    }
};

export const removeSecureItem = (key: string): void => {
    try {
        localStorage.removeItem(encode(key));
    } catch (error) {
        console.error('Failed to remove from secure local storage', error);
    }
};

/**
 * "Encrypts" data by serializing to JSON and then Base64 encoding.
 * In a real application, a proper encryption library should be used.
 */
export const encryptData = (data: any): string => {
    const jsonString = JSON.stringify(data);
    return encode(jsonString);
};

/**
 * "Decrypts" data by Base64 decoding and then parsing the JSON.
 */
export const decryptData = <T>(encodedData: string): T | null => {
    if (!encodedData) return null;
    try {
        const jsonString = decode(encodedData);
        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.error('Failed to decrypt data', error);
        return null;
    }
};