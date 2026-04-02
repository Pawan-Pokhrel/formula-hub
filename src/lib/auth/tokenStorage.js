export const TOKEN_STORAGE_KEY = 'formulahub_access_token';

export function getStoredToken() {
	if (typeof window === 'undefined') return null;
	return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setStoredToken(token) {
	if (typeof window === 'undefined') return;
	if (!token || typeof token !== 'string') return;
	localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

export function clearStoredToken() {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(TOKEN_STORAGE_KEY);
}
