import api from './api';

export const getMyPreferences = async () => {
	const { data } = await api.get('/preferences/me');
	if (data.success) return data.data;
	throw new Error(data.message || 'Failed to load preferences');
};

export const updateMyFavorites = async (payload) => {
	const { data } = await api.patch('/preferences/me/favorites', payload);
	if (data.success) return data.data;
	throw new Error(data.message || 'Failed to update favorites');
};

export const updateMyLayout = async (payload) => {
	const { data } = await api.patch('/preferences/me/layout', payload);
	if (data.success) return data.data;
	throw new Error(data.message || 'Failed to update layout');
};

export const resetMyPreferences = async () => {
	const { data } = await api.post('/preferences/me/reset');
	if (data.success) return data.data;
	throw new Error(data.message || 'Failed to reset preferences');
};
