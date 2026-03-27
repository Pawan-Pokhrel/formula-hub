'use client';

import authApi from '@/lib/api/authApi';
import {
	clearStoredToken,
	getStoredToken,
	setStoredToken,
} from '@/lib/auth/tokenStorage';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
	const [user, setUser] = useState(null);
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const token = getStoredToken();
		if (!token) {
			setIsLoading(false);
			return;
		}

		authApi
			.me()
			.then((response) => {
				setUser(response.data);
				setIsAuthenticated(true);
			})
			.catch(() => {
				clearStoredToken();
				setUser(null);
				setIsAuthenticated(false);
			})
			.finally(() => setIsLoading(false));
	}, []);

	const value = useMemo(
		() => ({
			user,
			isAuthenticated,
			isLoading,
			async login(credentials) {
				const response = await authApi.login(credentials);
				setStoredToken(response.token);
				const me = await authApi.me();
				setUser(me.data);
				setIsAuthenticated(true);
				return response;
			},
			async register(payload) {
				return authApi.register(payload);
			},
			async loginWithToken(token) {
				// Used after email verification or Google OAuth
				setStoredToken(token);
				const me = await authApi.me();
				setUser(me.data);
				setIsAuthenticated(true);
			},
			async googleAuth(credential) {
				const response = await authApi.googleAuth(credential);
				setStoredToken(response.token);
				const me = await authApi.me();
				setUser(me.data);
				setIsAuthenticated(true);
				return response;
			},
			async logout() {
				try {
					await authApi.logout();
				} finally {
					clearStoredToken();
					setUser(null);
					setIsAuthenticated(false);
				}
			},
			refreshUser: async () => {
				const me = await authApi.me();
				setUser(me.data);
				setIsAuthenticated(true);
				return me.data;
			},
		}),
		[user, isAuthenticated, isLoading]
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
