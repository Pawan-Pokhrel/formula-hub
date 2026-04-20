import api from './api';

/**
 * Fetch the authenticated user's favorite drivers and teams.
 */
export const getMyFavorites = async () => {
	const { data } = await api.get('/users/me/favorites');
	if (data.success) return data.data;
	throw new Error(data.message || 'Failed to load favorites');
};

/**
 * Update the authenticated user's favorite drivers and teams.
 */
export const updateMyFavorites = async (payload) => {
	const { data } = await api.patch('/users/me/favorites', payload);
	if (data.success) return data.data;
	throw new Error(data.message || 'Failed to update favorites');
};

// Legacy alias — callers that still import getMyPreferences will
// transparently use the new favorites-only endpoint.
export const getMyPreferences = getMyFavorites;
