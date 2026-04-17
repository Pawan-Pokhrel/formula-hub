'use client';

import authApi from '@/lib/api/authApi';
import { primeAvatarCache } from '@/lib/avatar/avatarCache';
import {
	clearStoredToken,
	getStoredToken,
	setStoredToken,
} from '@/lib/auth/tokenStorage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

// ── User cache (localStorage) ────────────────────────────────────────
// Industry-standard pattern: persist the user object locally so the
// avatar and display name render instantly on page load, then silently
// refresh from the server in the background.

const USER_CACHE_KEY = 'formulahub_user';

function getCachedUser() {
	if (typeof window === 'undefined') return null;
	try {
		const raw = localStorage.getItem(USER_CACHE_KEY);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

function setCachedUser(user) {
	if (typeof window === 'undefined') return;
	try {
		if (user) {
			localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
		} else {
			localStorage.removeItem(USER_CACHE_KEY);
		}
	} catch {
		// Quota exceeded or private browsing – ignore silently
	}
}

function clearCachedUser() {
	if (typeof window === 'undefined') return;
	localStorage.removeItem(USER_CACHE_KEY);
}

// ── Provider ─────────────────────────────────────────────────────────

export function AuthProvider({ children }) {
	// Hydrate from cache so the UI has user/avatar data on first paint
	const cached = getCachedUser();
	const hasToken = typeof window !== 'undefined' && !!getStoredToken();

	const [token, setToken] = useState(() =>
		typeof window !== 'undefined' ? getStoredToken() : null
	);
	const [user, setUser] = useState(cached);
	const [isAuthenticated, setIsAuthenticated] = useState(!!cached && hasToken);
	const [isLoading, setIsLoading] = useState(hasToken); // only loading if there's a token to verify

	// Keep cache in sync whenever `user` changes
	useEffect(() => {
		setCachedUser(user);
	}, [user]);

	useEffect(() => {
		if (!user?.avatarUrl) return;
		void primeAvatarCache(user.avatarUrl);
	}, [user?.avatarUrl]);

	// On mount: verify token + refresh user from server (background sync)
	useEffect(() => {
		const token = getStoredToken();
		if (!token) {
			setToken(null);
			setUser(null);
			setIsAuthenticated(false);
			setIsLoading(false);
			clearCachedUser();
			return;
		}

		// Fetch fresh user data from server (background refresh)
		authApi
			.me()
			.then((response) => {
				setUser(response.data);
				setIsAuthenticated(true);
			})
			.catch(() => {
				clearStoredToken();
				clearCachedUser();
				setToken(null);
				setUser(null);
				setIsAuthenticated(false);
			})
			.finally(() => setIsLoading(false));
	}, []);

	const value = useMemo(
		() => ({
			token,
			user,
			isAuthenticated,
			isLoading,
			async login(credentials) {
				const response = await authApi.login(credentials);
				if (!response?.token) {
					throw new Error('Login succeeded but no token was returned.');
				}
				setStoredToken(response.token);
				setToken(response.token);
				const me = await authApi.me(response.token);
				setUser(me.data);
				setIsAuthenticated(true);
				return response;
			},
			async register(payload) {
				return authApi.register(payload);
			},
			async loginWithToken(token) {
				// Used after email verification or Google OAuth
				if (!token) {
					throw new Error('No token was provided for loginWithToken.');
				}
				setStoredToken(token);
				setToken(token);
				const me = await authApi.me(token);
				setUser(me.data);
				setIsAuthenticated(true);
				return me.data;
			},
			async googleAuth(credential) {
				const response = await authApi.googleAuth(credential);
				if (!response?.token) {
					throw new Error('Google auth succeeded but no token was returned.');
				}
				setStoredToken(response.token);
				setToken(response.token);
				const me = await authApi.me(response.token);
				setUser(me.data);
				setIsAuthenticated(true);
				return response;
			},
			async logout() {
				try {
					await authApi.logout();
				} finally {
					clearStoredToken();
					clearCachedUser();
					setToken(null);
					setUser(null);
					setIsAuthenticated(false);
					// Hard-navigate to login immediately so the current page
					// never re-renders in an unauthenticated state.
					window.location.href = '/login';
				}
			},
			refreshUser: async () => {
				const me = await authApi.me();
				setToken(getStoredToken());
				setUser(me.data);
				setIsAuthenticated(true);
				return me.data;
			},
		}),
		[token, user, isAuthenticated, isLoading]
	);

	return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
	const context = useContext(AuthContext);
	if (!context) {
		throw new Error('useAuth must be used within AuthProvider');
	}
	return context;
}
